// Domaine Cap : types + calcul du planning. Fonctions pures, sans dépendance.

export type Project = { id: string; name: string; start_date: string; share_token?: string };
export type Person = { id: string; name: string; capacity: number; defect_share?: number; color?: number | null };

/** Temps d'une personne disponible pour le plan : sa capacité moins sa part consacrée aux défauts. */
export const planCapacity = (p: Person) => Number(p.capacity) * (1 - Number(p.defect_share ?? 0));
export type Absence = { id: string; person_id: string; start_date: string; end_date: string; label?: string };
export type Status = "todo" | "doing" | "done";
export type Tag = "risk" | "dependency" | "blocked";
/** Pose d'un tag, avec sa raison ; actif tant qu'il n'est pas levé. `by` : email de l'auteur. */
export type TagEntry = { id: string; tag: Tag; reason: string; on: string; by?: string; lifted_on?: string | null; lifted_by?: string };
export type Item = {
  id: string;
  parent_id: string | null;
  type: "feature" | "milestone";
  title: string;
  position: number;
  estimate_jh: number;
  owner_ids: string[];
  status: Status;
  milestone_date: string | null;
  target_id: string | null;
  description?: string;
  started_on?: string | null; // démarrage réel (ou prévu) ; posé en passant « En cours »
  done_on?: string | null; // fin réelle ; posée en passant « Terminé »
  allocations?: Allocation[]; // part du temps de ses owners, datée ; 100 % sans entrée
  extra_jh?: number; // avenant : retard anticipé, JH ajoutés à l'estimation sans changer la fin prévue
  extra_note?: string; // motif de l'avenant
  tag_log?: TagEntry[]; // historique des tags, indicateurs sur la timeline sans effet sur le calcul
};

/** JH à réaliser : estimation + avenant. */
export const workJh = (i: Item) => Number(i.estimate_jh) + Number(i.extra_jh ?? 0);
/**
 * « À partir de `from`, `person` consacre `pct` de son temps à la tâche » (0 = en pause).
 * Sans `person` : vaut pour tous les owners. L'entrée la plus récente qui s'applique l'emporte.
 */
export type Allocation = { from: string; pct: number; person?: string };
/** Dates ISO, bornes incluses. `planned` : fin prévue par l'estimation, quand elle diffère de la fin affichée. */
export type Span = { start: string; end: string; planned?: string };
export type Row = { item: Item; depth: number; hasChildren: boolean };
export type Plan = {
  spans: Map<string, Span | null>;
  after: Map<string, string>; // Item -> Item qui l'a fait attendre (même owner)
  used: Map<string, number>; // `${person}:${day}` -> JH consommés ce jour-là
  freeFrom: Map<string, number>; // person -> lendemain de son dernier jour occupé (si après aujourd'hui)
  overload: Map<string, { demand: number; ids: string[] }>; // `${person}:${day}` -> allocations + part défauts > 100 %
};

const DAY = 86_400_000;
const HORIZON = 365 * 5; // ponytail: au-delà de 5 ans sans capacité, l'Item est "non planifiable"

export const toDay = (iso: string) => Math.round(Date.parse(iso + "T00:00:00Z") / DAY);
export const toIso = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const isWeekend = (day: number) => [0, 6].includes(new Date(day * DAY).getUTCDay());
export const monday = (day: number) => day - ((new Date(day * DAY).getUTCDay() + 6) % 7);
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const fmtDay = (iso: string, withYear = false) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", timeZone: "UTC", ...(withYear ? { year: "numeric" } : {}),
  });

export function absentSet(absences: Absence[]) {
  const s = new Set<string>();
  for (const a of absences)
    for (let d = toDay(a.start_date); d <= toDay(a.end_date); d++) s.add(`${a.person_id}:${d}`);
  return s;
}

export function workingDays(start: string, end: string) {
  let n = 0;
  for (let d = toDay(start); d <= toDay(end); d++) if (!isWeekend(d)) n++;
  return n;
}

/**
 * Début d'une tâche terminée le `endIso` dont on ne connaît pas la date de début :
 * on remonte le temps jusqu'à couvrir son estimation avec la disponibilité de ses owners.
 */
export function startBefore(endIso: string, jh: number, owners: Person[], absences: Absence[]) {
  const off = absentSet(absences);
  let left = jh;
  let d = toDay(endIso);
  for (let i = 0; i < HORIZON && left > 1e-9; i++, d--) {
    if (isWeekend(d)) continue;
    left -= owners.length ? owners.reduce((sum, o) => sum + (off.has(`${o.id}:${d}`) ? 0 : Number(o.capacity)), 0) : 1;
  }
  // d a reculé d'un jour de trop après le dernier jour compté (ou vaut la fin si rien à couvrir).
  return toIso(jh > 0 ? d + 1 : toDay(endIso));
}

/** Items (hors jalons) dans l'ordre de priorité : parcours en profondeur, frères triés par position. */
export function orderItems(items: Item[]): Row[] {
  const byParent = new Map<string | null, Item[]>();
  for (const it of items) {
    if (it.type !== "feature") continue;
    const k = it.parent_id ?? null;
    byParent.set(k, [...(byParent.get(k) ?? []), it]);
  }
  const rows: Row[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const item of (byParent.get(parent) ?? []).sort((a, b) => a.position - b.position)) {
      rows.push({ item, depth, hasChildren: byParent.has(item.id) });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export const pctLabel = (pct: number) => (pct === 0 ? "En pause" : `${Math.round(pct * 100)} %`);

/** Allocation d'une personne sur une tâche un jour donné (100 % par défaut). Sans personne : la plus haute des owners. */
export function allocationOn(item: Item, iso: string, person?: string): number {
  if (!person) return item.owner_ids.length ? Math.max(...item.owner_ids.map((o) => allocationOn(item, iso, o))) : 1;
  let pct = 1;
  for (const a of [...(item.allocations ?? [])].sort((x, y) => x.from.localeCompare(y.from)))
    if (a.from <= iso && (!a.person || a.person === person)) pct = Number(a.pct);
  return pct;
}

/** Périodes de la barre où la tâche est en pause : tous ses owners à 0 %. */
export function pauses(item: Item, span: Span | null | undefined): Span[] {
  if (!span || item.status === "todo") return [];
  const days = [...new Set([span.start, ...(item.allocations ?? []).map((a) => a.from)])].filter((d) => d >= span.start && d <= span.end).sort();
  const out: Span[] = [];
  days.forEach((d, k) => {
    if (allocationOn(item, d) > 0) return;
    const end = days[k + 1] ? toIso(toDay(days[k + 1]) - 1) : span.end;
    const prev = out.at(-1);
    if (prev && toDay(prev.end) + 1 === toDay(d)) prev.end = end;
    else out.push({ start: d, end });
  });
  return out;
}

/**
 * Planning des Items, en quatre temps :
 * 1. Terminées avec leurs deux dates : faits intangibles, placés sur leurs dates réelles.
 * La part défauts d'une personne est réservée d'abord ; une allocation est une part de son temps total.
 * 2. En cours (date de début connue) : avancent en parallèle, chacune à son allocation datée
 *    (100 % par défaut). Si ses allocations + sa part défauts dépassent 100 %, chacune ralentit
 *    au prorata et le jour est noté en surcharge (de même pour une tâche à faire à 100 % avec des défauts). Pas terminée à sa fin de calcul : elle garde
 *    son allocation jusqu'à aujourd'hui.
 * 3. Anciennes tâches démarrées sans date de début : enchaînées par priorité.
 * 4. À faire : par priorité, jamais avant aujourd'hui, dans le temps laissé libre par les autres ;
 *    chaque owner les enchaîne, un Item démarre quand tous ses owners sont libres.
 * Fin prévue (engagement) d'une tâche démarrée : son estimation à l'allocation du jour de démarrage,
 * sur la seule disponibilité de ses owners. Au-delà : retard ou glissement.
 * Parent : enveloppe de ses enfants. Jalon : sa date. null : non planifiable.
 */
export function schedule(items: Item[], people: Person[], absences: Absence[], startIso: string, today = todayIso()): Plan {
  const start = toDay(startIso);
  const now = toDay(today);
  const capacity = new Map(people.map((p) => [p.id, Number(p.capacity)]));
  const defect = new Map(people.map((p) => [p.id, Number(p.defect_share ?? 0)]));
  const absent = absentSet(absences);

  const used = new Map<string, number>();
  const occupant = new Map<string, string>(); // `${person}:${day}` -> dernier Item qui l'a occupé
  const overload = new Map<string, { demand: number; ids: string[] }>();
  const free = new Map<string, number>();
  const last = new Map<string, string>(); // person -> dernier Item enchaîné
  const after = new Map<string, string>();
  const cap = (p: string, d: number) => (isWeekend(d) || absent.has(`${p}:${d}`) ? 0 : capacity.get(p)!);
  // La part défauts est réservée d'abord : le plan ne dispose que du reste.
  const net = (p: string, d: number) => cap(p, d) * (1 - defect.get(p)!);
  const left = (p: string, d: number) => Math.max(0, net(p, d) - (used.get(`${p}:${d}`) ?? 0));
  const take = (p: string, d: number, q: number, id: string) => {
    if (q <= 1e-12) return;
    used.set(`${p}:${d}`, (used.get(`${p}:${d}`) ?? 0) + q);
    occupant.set(`${p}:${d}`, id);
  };
  // Surcharge : allocations déclarées + part défauts au-delà de 100 % du temps de la personne.
  // Toutes les tâches actives un jour donné se cumulent, sauf une tâche qui finit en cours de journée (passage de relais).
  const flag = (p: string, d: number, pct: number, id: string) => {
    const k = `${p}:${d}`, base = load.get(k) ?? { demand: defect.get(p)!, ids: [] };
    const next = { demand: base.demand + pct, ids: [...base.ids, id] };
    load.set(k, next);
    if (next.demand > 1 + 1e-9) overload.set(k, next);
  };
  const load = new Map<string, { demand: number; ids: string[] }>();

  const rows = orderItems(items);
  const spans = new Map<string, Span | null>();
  const leaves = rows.filter((r) => !r.hasChildren).map((r) => r.item);
  const ownersOf = (i: Item) => i.owner_ids.filter((o) => capacity.has(o));
  const allocs = new Map(leaves.map((i) => [i.id, (i.allocations ?? [])
    .map((a) => ({ day: toDay(a.from), pct: Number(a.pct), person: a.person })).sort((x, y) => x.day - y.day)]));
  const pctOn = (id: string, o: string, d: number) => {
    let p = 1;
    for (const a of allocs.get(id)!) { if (a.day > d) break; if (!a.person || a.person === o) p = a.pct; }
    return p;
  };
  // Temps qu'un owner peut donner à la tâche ce jour-là : son allocation (part de son temps total), dans la limite de ce qui lui reste.
  const rate = (id: string, o: string, d: number) => Math.min(left(o, d), cap(o, d) * pctOn(id, o, d));
  // Engagement : l'estimation aux allocations du jour de démarrage, hors défauts (toutes à 0 : comptées à 100 %).
  const commit = (i: Item, owners: string[], from: number) => {
    let rest = Number(i.estimate_jh);
    if (!owners.length || rest <= 0) return from;
    const pcts = owners.map((o) => pctOn(i.id, o, from));
    const at = pcts.some((p) => p > 0) ? pcts : pcts.map(() => 1);
    let d = from;
    for (; d < from + HORIZON; d++) { rest -= owners.reduce((sum, o, k) => sum + Math.min(net(o, d), cap(o, d) * at[k]), 0); if (rest <= 1e-9) break; }
    return d;
  };
  const span = (a: number, b: number, planned: number): Span => ({ start: toIso(a), end: toIso(b), ...(planned !== b ? { planned: toIso(planned) } : {}) });

  const closed = (i: Item) => i.status === "done" && !!i.started_on && !!i.done_on;
  const started = (i: Item) => i.status !== "todo" && !!i.started_on && !closed(i);

  // 1. Terminées avec leurs dates : la barre suit les dates réelles, les JH répartis sur la période.
  for (const item of leaves.filter(closed)) {
    const owners = ownersOf(item);
    const a = toDay(item.started_on!);
    const b = Math.max(a, toDay(item.done_on!));
    let total = 0;
    for (let d = a; d <= b; d++) for (const o of owners) total += net(o, d);
    const ratio = total ? Math.min(1, workJh(item) / total) : 0;
    for (let d = a; d <= b; d++) for (const o of owners) take(o, d, Math.min(left(o, d), net(o, d) * ratio), item.id);
    spans.set(item.id, span(a, b, owners.length ? commit(item, owners, a) : b));
  }

  // 2. En cours : simulation jour par jour, allocations au prorata.
  type Run = { item: Item; owners: string[]; from: number; rest: number; first: number | null; end: number | null; lastChange: number; done: boolean };
  const runs: Run[] = [];
  for (const item of leaves.filter(started)) {
    const owners = ownersOf(item);
    const jh = workJh(item);
    if (!owners.length || !(jh > 0)) { spans.set(item.id, null); continue; }
    const changes = allocs.get(item.id)!;
    runs.push({ item, owners, from: toDay(item.started_on!), rest: jh, first: null, end: null, lastChange: changes.at(-1)?.day ?? 0, done: item.status === "done" });
  }
  if (runs.length) {
    const first = Math.min(...runs.map((r) => r.from));
    const horizon = Math.max(now, ...runs.map((r) => Math.max(r.from, r.lastChange))) + HORIZON;
    for (let d = first; d < horizon; d++) {
      // Fini ou en attente définitive (0 % sans changement à venir) une fois aujourd'hui passé : on s'arrête.
      if (d > now && runs.every((r) => r.end !== null || (d > r.lastChange && r.owners.every((o) => pctOn(r.item.id, o, d) === 0)))) break;
      const byPerson = new Map<string, { run: Run; pct: number }[]>();
      for (const run of runs) {
        if (d < run.from) continue;
        const working = run.end === null;
        if (!working && (run.done || d > now)) continue; // au-delà de sa fin, occupe ses owners jusqu'à aujourd'hui
        for (const o of run.owners) {
          const pct = pctOn(run.item.id, o, d);
          if (pct > 0) byPerson.set(o, [...(byPerson.get(o) ?? []), { run, pct }]);
        }
      }
      const gain = new Map<Run, number>();
      for (const [p, list] of byPerson) {
        const avail = left(p, d);
        if (avail <= 1e-9) continue;
        for (const { run, pct } of list) {
          // Finit dans la journée : ne compte pas face à la tâche qui prend le relais.
          const partial = run.end === null && run.rest < run.owners.reduce((sum, o) => sum + cap(o, d) * pctOn(run.item.id, o, d), 0) - 1e-9;
          if (!partial) flag(p, d, pct, run.item.id);
        }
        const want = cap(p, d) * list.reduce((sum, x) => sum + x.pct, 0);
        for (const { run, pct } of list) {
          const q = cap(p, d) * pct * Math.min(1, avail / want);
          take(p, d, q, run.item.id);
          if (run.end === null) gain.set(run, (gain.get(run) ?? 0) + q);
        }
      }
      for (const [run, q] of gain) {
        run.first ??= d;
        run.rest -= q;
        if (run.rest <= 1e-9) run.end = d;
      }
    }
    for (const run of runs) {
      const planned = commit(run.item, run.owners, run.from);
      const calc = run.end ?? Math.max(now, planned); // sans fin calculable (en attente), jusqu'à aujourd'hui au moins
      const end = run.done ? Math.min(calc, Math.max(now, run.from)) : Math.max(calc, now);
      // La barre part de la date de début réelle, même si la tâche démarre en pause.
      spans.set(run.item.id, span(Math.min(run.owners.every((o) => pctOn(run.item.id, o, run.from) === 0) ? run.from : run.first ?? run.from, end), end, planned));
    }
  }

  // 3 et 4. Enchaînement par priorité (anciennes tâches démarrées sans date, puis à faire).
  const chained = [...leaves.filter((i) => i.status !== "todo" && !i.started_on), ...leaves.filter((i) => i.status === "todo")];
  for (const item of chained) {
    const owners = ownersOf(item);
    const jh = workJh(item);
    const est = Number(item.estimate_jh);
    const done = item.status === "done";
    if (!owners.length || (!(jh > 0) && !done)) { spans.set(item.id, null); continue; }

    const earliest = item.status === "todo" ? Math.max(start, now) : start;
    // La tâche attend ses owners principaux (tout leur temps hors défauts) ; une personne en aide donne ce qu'elle peut, sans la bloquer.
    const mains = owners.filter((o) => pctOn(item.id, o, earliest) >= 1 - defect.get(o)! - 1e-9);
    const gate = mains.length ? mains : owners;
    const s = Math.max(earliest, ...gate.map((o) => free.get(o) ?? earliest));
    let blocker = gate.find((o) => last.has(o) && free.get(o) === s);

    // Répartition des JH jour par jour (simulée, validée ensuite jusqu'à la fin réelle).
    const alloc: [number, string, number, boolean][] = []; // jour, owner, JH, journée pleine
    let remaining = jh;
    let first: number | null = jh > 0 ? null : s;
    let promise: number | null = null; // fin prévue par l'estimation seule, avant l'avenant
    let d = s;
    for (; jh > 0 && d < s + HORIZON; d++) {
      const total = owners.reduce((sum, o) => sum + rate(item.id, o, d), 0);
      if (total <= 1e-9) continue;
      first ??= d;
      const ratio = Math.min(1, remaining / total);
      for (const o of owners) alloc.push([d, o, rate(item.id, o, d) * ratio, ratio > 1 - 1e-9]);
      remaining -= total * ratio;
      if (promise === null && est > 0 && jh - remaining >= est - 1e-9) promise = d;
      if (remaining <= 1e-9) break;
    }
    if (first === null || remaining > 1e-9) { spans.set(item.id, null); continue; }

    const planned = d;
    const promised = !done && promise !== null ? promise : planned;
    // Terminée : à sa date de fin réelle (sans date, pas après aujourd'hui). Sinon : au moins jusqu'à aujourd'hui.
    const end = done ? (item.done_on ? toDay(item.done_on) : Math.min(planned, Math.max(now, s))) : Math.max(planned, now);
    // Surcharge : ce qui est déclaré compte, même si l'owner n'a plus de temps à donner ce jour-là.
    for (const [day, o, q, full] of alloc) if (day <= end) { take(o, day, q, item.id); if (full && cap(o, day) > 0) flag(o, day, pctOn(item.id, o, day), item.id); }
    for (let x = planned; x <= end && end > planned; x++) for (const o of owners) take(o, x, rate(item.id, o, x), item.id);

    // Attend une tâche en cours d'un de ses owners : celle qui l'occupait juste avant.
    let waitedOn: string | undefined;
    for (let x = first - 1; !blocker && !waitedOn && x >= s; x--)
      for (const o of owners) { const occ = occupant.get(`${o}:${x}`); if (occ && occ !== item.id) { waitedOn = occ; break; } }
    if (blocker) after.set(item.id, last.get(blocker)!);
    else if (waitedOn) after.set(item.id, waitedOn);
    blocker = undefined;
    for (const o of gate) {
      const next = left(o, end) > 1e-9 ? end : end + 1;
      if (next >= (free.get(o) ?? -Infinity)) { free.set(o, next); last.set(o, item.id); }
    }
    spans.set(item.id, { start: toIso(Math.min(first, end)), end: toIso(end), ...(promised !== end ? { planned: toIso(promised) } : {}) });
  }

  // « Libre le » : lendemain du dernier jour occupé, s'il est après aujourd'hui.
  const freeFrom = new Map<string, number>();
  for (const [k, q] of used) {
    if (q <= 1e-9) continue;
    const i = k.lastIndexOf(":");
    const p = k.slice(0, i), d = Number(k.slice(i + 1));
    if (d >= now && d + 1 > (freeFrom.get(p) ?? 0)) freeFrom.set(p, d + 1);
  }

  // Parents : enfants d'abord (parcours inverse).
  for (const { item, hasChildren } of [...rows].reverse()) {
    if (!hasChildren) continue;
    const kids = rows
      .filter((r) => r.item.parent_id === item.id)
      .map((r) => spans.get(r.item.id))
      .filter((s): s is Span => !!s);
    spans.set(item.id, kids.length
      ? { start: kids.map((s) => s.start).sort()[0], end: kids.map((s) => s.end).sort().at(-1)! }
      : null);
  }
  for (const m of items)
    if (m.type === "milestone") spans.set(m.id, m.milestone_date ? { start: m.milestone_date, end: m.milestone_date } : null);

  return { spans, after, used, freeFrom, overload };
}

/** JH d'un Item : les siens si feuille, somme des enfants sinon. */
export function totalJh(items: Item[], id: string): number {
  const kids = items.filter((i) => i.parent_id === id && i.type === "feature");
  if (!kids.length) return Number(items.find((i) => i.id === id)?.estimate_jh ?? 0);
  return kids.reduce((s, k) => s + totalJh(items, k.id), 0);
}

/** Tags actifs (non levés) d'un Item seul. */
export const openTags = (i: Item) => (i.tag_log ?? []).filter((e) => !e.lifted_on);

/** Tags actifs d'un Item et de tous ses descendants (un risque reste visible, parent replié). */
export function activeTags(items: Item[], id: string): TagEntry[] {
  const self = items.find((i) => i.id === id);
  return [...(self ? openTags(self) : []), ...items.filter((i) => i.parent_id === id && i.type === "feature").flatMap((k) => activeTags(items, k.id))];
}

/** Jours ouvrés entre la date du jalon cible et la fin de l'Item (0 = à l'heure). */
export function lateBy(item: Item, span: Span | null | undefined, items: Item[]) {
  const target = items.find((i) => i.id === item.target_id);
  if (!span || !target?.milestone_date || span.end <= target.milestone_date) return 0;
  return workingDays(toIso(toDay(target.milestone_date) + 1), span.end);
}

/** Un parent est en retard si lui-même ou un de ses descendants l'est. */
export function isLate(item: Item, plan: Plan, items: Item[]): boolean {
  if (lateBy(item, plan.spans.get(item.id), items) > 0) return true;
  return items.some((c) => c.parent_id === item.id && c.type === "feature" && isLate(c, plan, items));
}

/** Pourquoi un Item n'est pas planifiable. */
export function unplannedReason(item: Item, people: Person[]) {
  const noOwner = !item.owner_ids.some((o) => people.some((p) => p.id === o));
  const noJh = !(Number(item.estimate_jh) > 0);
  if (noOwner && noJh) return "Pas d'owner ni d'estimation";
  if (noOwner) return "Pas d'owner";
  if (noJh) return "Pas d'estimation";
  return "Pas de capacité";
}

/** Jours ouvrés entre la fin prévue par l'estimation et la fin réelle (0 = dans les temps). */
export function slip(span: Span | null | undefined) {
  if (!span?.planned || span.planned >= span.end) return 0;
  return workingDays(toIso(toDay(span.planned) + 1), span.end);
}

/** Pas terminée et finit (ou finira) après sa fin prévue : en retard, ou glissement annoncé. */
export const overdue = (item: Item, span: Span | null | undefined) => item.status !== "done" && slip(span) > 0;

/** Personnes en surcharge à partir d'aujourd'hui : première et dernière date, pic d'allocation. */
export function overloaded(plan: Plan, today = todayIso()) {
  const now = toDay(today);
  const out = new Map<string, { from: number; to: number; peak: number }>();
  for (const [k, { demand }] of plan.overload) {
    const i = k.lastIndexOf(":");
    const p = k.slice(0, i), d = Number(k.slice(i + 1));
    if (d < now) continue;
    const o = out.get(p);
    out.set(p, o ? { from: Math.min(o.from, d), to: Math.max(o.to, d), peak: Math.max(o.peak, demand) } : { from: d, to: d, peak: demand });
  }
  return out;
}

/** Owners d'un Item en surcharge à partir d'aujourd'hui (le passé est acté) : pic, dates, autres tâches en cause. */
export function itemOverload(plan: Plan, item: Item, today = todayIso()) {
  const span = plan.spans.get(item.id);
  const out = new Map<string, { from: number; to: number; peak: number; others: Set<string> }>();
  if (!span) return out;
  for (let d = Math.max(toDay(span.start), toDay(today)); d <= toDay(span.end); d++)
    for (const o of item.owner_ids) {
      const ov = plan.overload.get(`${o}:${d}`);
      if (!ov?.ids.includes(item.id)) continue;
      const cur = out.get(o) ?? { from: d, to: d, peak: 0, others: new Set<string>() };
      for (const id of ov.ids) if (id !== item.id) cur.others.add(id);
      out.set(o, { ...cur, to: d, peak: Math.max(cur.peak, ov.demand) });
    }
  return out;
}

/** Pic de surcharge d'une personne sur une semaine (null si aucune), avec les tâches en cause. */
export function weekOverload(plan: Plan, personId: string, mondayDay: number) {
  let best: { demand: number; ids: string[] } | null = null;
  for (let d = mondayDay; d < mondayDay + 7; d++) {
    const o = plan.overload.get(`${personId}:${d}`);
    if (o && (!best || o.demand > best.demand)) best = o;
  }
  return best;
}

/** Occupation d'une personne sur une semaine : part de sa capacité réellement utilisée, ou "abs". */
export function weekLoad(plan: Plan, person: Person, absent: Set<string>, mondayDay: number): number | "abs" {
  let cap = 0, use = 0, workdays = 0, off = 0;
  for (let d = mondayDay; d < mondayDay + 7; d++) {
    if (isWeekend(d)) continue;
    workdays++;
    if (absent.has(`${person.id}:${d}`)) { off++; continue; }
    cap += Number(person.capacity);
    // La part défauts compte comme du temps occupé.
    use += (plan.used.get(`${person.id}:${d}`) ?? 0) + Number(person.capacity) - planCapacity(person);
  }
  if (workdays && off === workdays) return "abs";
  return cap ? Math.round((use / cap) * 100) : 0;
}
