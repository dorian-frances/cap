// Domaine Cap : types + calcul du planning. Fonctions pures, sans dépendance.

export type Project = {
  id: string; name: string; start_date: string; share_token?: string;
  business_lead_days?: number; tech_lead_days?: number; // délais des vérifications avant démarrage (jours ouvrés)
};
export type Person = { id: string; name: string; capacity: number; color?: number | null };
export type Absence = { id: string; person_id: string; start_date: string; end_date: string; label?: string };
/** dev_done : développement fini (dates réelles), pas encore en production (dépendance, recette…). */
export type Status = "todo" | "doing" | "dev_done" | "done";
export type Tag = "risk" | "dependency" | "blocked";
/** Pose d'un tag, avec sa raison ; actif tant qu'il n'est pas levé. `by` : email de l'auteur. */
export type TagEntry = { id: string; tag: Tag; reason: string; on: string; by?: string; lifted_on?: string | null; lifted_by?: string };
/** Vérifications avant démarrage : conception métier (+ BPMN), conception technique (+ découpe en tickets). */
export type PrepKind = "business" | "tech";
export type Prep = Partial<Record<PrepKind, { on: string; by?: string }>>;
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
  target_ids: string[]; // jalons ciblés : un item peut en impacter plusieurs
  description?: string;
  started_on?: string | null; // démarrage réel (ou prévu) ; posé en passant « En cours »
  done_on?: string | null; // fin réelle du dev ; posée en passant « Dev terminé » ou « Terminé »
  extra_jh?: number; // avenant : JH ajoutés à l'estimation sans changer la fin prévue
  extra_note?: string; // motif de l'avenant
  tag_log?: TagEntry[]; // historique des tags, indicateurs sur la timeline sans effet sur le calcul
  prep?: Prep; // vérifications faites, avec date et auteur
};

/** JH à réaliser : estimation + avenant. */
export const workJh = (i: Item) => Number(i.estimate_jh) + Number(i.extra_jh ?? 0);
/** Plus rien à faire en dev : terminé, en production ou non. */
export const finished = (i: Item) => i.status === "done" || i.status === "dev_done";
/** Dates ISO, bornes incluses. `planned` : fin prévue par l'estimation, quand elle diffère de la fin affichée. */
export type Span = { start: string; end: string; planned?: string };
export type Row = { item: Item; depth: number; hasChildren: boolean };
export type Plan = {
  spans: Map<string, Span | null>;
  after: Map<string, string>; // Item -> Item qui l'a fait attendre (même owner)
  used: Map<string, number>; // `${person}:${day}` -> JH consommés ce jour-là
  freeFrom: Map<string, number>; // person -> lendemain de son dernier jour occupé (si après aujourd'hui)
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

/**
 * Planning des Items, en trois temps. Pas de charge par tâche : un owner donne toute sa disponibilité
 * à chaque tâche démarrée, même en parallèle d'une autre.
 * 1. Dev fini avec ses deux dates : faits intangibles, placés sur leurs dates réelles.
 * 2. En cours (date de début connue) : chacune à la disponibilité de ses owners, sans tenir compte
 *    des autres. Pas terminée à sa fin prévue : elle se prolonge jusqu'à aujourd'hui. L'avenant
 *    s'ajoute après l'estimation, ou après aujourd'hui si elle est déjà en retard.
 * 3. Anciennes tâches démarrées sans date de début, puis à faire : par priorité, jamais avant
 *    aujourd'hui, dans le temps laissé libre ; un Item démarre quand tous ses owners sont libres.
 * Fin prévue (engagement) d'une tâche démarrée : son estimation sur la disponibilité de ses owners.
 * Au-delà : retard. Parent : enveloppe de ses enfants. Jalon : sa date. null : non planifiable.
 */
export function schedule(items: Item[], people: Person[], absences: Absence[], startIso: string, today = todayIso()): Plan {
  const start = toDay(startIso);
  const now = toDay(today);
  const capacity = new Map(people.map((p) => [p.id, Number(p.capacity)]));
  const absent = absentSet(absences);

  const used = new Map<string, number>();
  const free = new Map<string, number>(); // person -> premier jour libre pour la tâche suivante
  const last = new Map<string, string>(); // person -> dernière tâche qui l'occupe
  const after = new Map<string, string>();
  const cap = (p: string, d: number) => (isWeekend(d) || absent.has(`${p}:${d}`) ? 0 : capacity.get(p)!);
  const left = (p: string, d: number) => Math.max(0, cap(p, d) - (used.get(`${p}:${d}`) ?? 0));
  const take = (p: string, d: number, q: number) => { if (q > 1e-12) used.set(`${p}:${d}`, (used.get(`${p}:${d}`) ?? 0) + q); };
  // Owners occupés du jour a au jour b (ce qui leur reste de temps ces jours-là).
  const occupy = (owners: string[], a: number, b: number) => { for (let d = a; d <= b; d++) for (const o of owners) take(o, d, left(o, d)); };
  // Dernier jour d'un travail de `jh` démarré le `from`, à pleine disponibilité des owners (null : pas de capacité).
  const finish = (owners: string[], from: number, jh: number) => {
    let rest = jh;
    for (let d = from; d < from + HORIZON; d++) if ((rest -= owners.reduce((sum, o) => sum + cap(o, d), 0)) <= 1e-9) return d;
    return null;
  };
  const span = (a: number, b: number, planned: number): Span => ({ start: toIso(a), end: toIso(b), ...(planned !== b ? { planned: toIso(planned) } : {}) });

  const rows = orderItems(items);
  const spans = new Map<string, Span | null>();
  const leaves = rows.filter((r) => !r.hasChildren).map((r) => r.item);
  const ownersOf = (i: Item) => i.owner_ids.filter((o) => capacity.has(o));
  const closed = (i: Item) => finished(i) && !!i.started_on && !!i.done_on;
  const started = (i: Item) => i.status !== "todo" && !!i.started_on && !closed(i);

  // 1. Dev fini avec ses dates : la barre suit les dates réelles.
  for (const item of leaves.filter(closed)) {
    const owners = ownersOf(item);
    const a = toDay(item.started_on!);
    const b = Math.max(a, toDay(item.done_on!));
    occupy(owners, a, b);
    spans.set(item.id, span(a, b, owners.length ? finish(owners, a, Number(item.estimate_jh)) ?? b : b));
  }

  // 2. En cours : chacune pour soi, en parallèle des autres.
  for (const item of leaves.filter(started)) {
    const owners = ownersOf(item);
    const est = Number(item.estimate_jh), extra = Number(item.extra_jh ?? 0);
    const a = toDay(item.started_on!);
    const planned = owners.length && est + extra > 0 ? finish(owners, a, est) : null;
    const end = planned === null ? null
      : finished(item) ? Math.min(planned, Math.max(now, a)) // sans date de fin : pas après aujourd'hui
      : !extra ? Math.max(planned, now)
      : planned >= now ? finish(owners, a, est + extra) : finish(owners, now + 1, extra);
    if (planned === null || end === null) { spans.set(item.id, null); continue; }
    occupy(owners, a, end);
    for (const o of owners) if (end + 1 >= (free.get(o) ?? -Infinity)) { free.set(o, end + 1); last.set(o, item.id); }
    spans.set(item.id, span(a, end, planned));
  }

  // 3. Enchaînement par priorité (anciennes tâches démarrées sans date, puis à faire).
  const chained = [...leaves.filter((i) => i.status !== "todo" && !i.started_on), ...leaves.filter((i) => i.status === "todo")];
  for (const item of chained) {
    const owners = ownersOf(item);
    const jh = workJh(item);
    const est = Number(item.estimate_jh);
    const done = finished(item);
    if (!owners.length || (!(jh > 0) && !done)) { spans.set(item.id, null); continue; }

    const earliest = item.status === "todo" ? Math.max(start, now) : start;
    const s = Math.max(earliest, ...owners.map((o) => free.get(o) ?? earliest));
    const blocker = owners.find((o) => last.has(o) && free.get(o) === s);

    // Répartition des JH jour par jour (simulée, validée ensuite jusqu'à la fin réelle).
    const alloc: [number, string, number][] = []; // jour, owner, JH
    let remaining = jh;
    let first: number | null = jh > 0 ? null : s;
    let promise: number | null = null; // fin prévue par l'estimation seule, avant l'avenant
    let d = s;
    for (; jh > 0 && d < s + HORIZON; d++) {
      const total = owners.reduce((sum, o) => sum + left(o, d), 0);
      if (total <= 1e-9) continue;
      first ??= d;
      const ratio = Math.min(1, remaining / total);
      for (const o of owners) alloc.push([d, o, left(o, d) * ratio]);
      remaining -= total * ratio;
      if (promise === null && est > 0 && jh - remaining >= est - 1e-9) promise = d;
      if (remaining <= 1e-9) break;
    }
    if (first === null || remaining > 1e-9) { spans.set(item.id, null); continue; }

    const planned = d;
    const promised = !done && promise !== null ? promise : planned;
    // Dev fini : à sa date de fin réelle (sans date, pas après aujourd'hui). Sinon : au moins jusqu'à aujourd'hui.
    const end = done ? (item.done_on ? toDay(item.done_on) : Math.min(planned, Math.max(now, s))) : Math.max(planned, now);
    for (const [day, o, q] of alloc) if (day <= end) take(o, day, q);
    if (end > planned) occupy(owners, planned + 1, end);

    if (blocker) after.set(item.id, last.get(blocker)!);
    for (const o of owners) {
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

  return { spans, after, used, freeFrom };
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

/** Jalons datés ciblés par un Item, du plus proche au plus lointain. */
export const targetsOf = (item: Item, items: Item[]) => items
  .filter((m) => m.type === "milestone" && m.milestone_date && item.target_ids.includes(m.id))
  .sort((a, b) => a.milestone_date!.localeCompare(b.milestone_date!));

/** Jours ouvrés entre la date d'un jalon et la fin de l'Item (0 = à l'heure). */
export const lateAfter = (span: Span | null | undefined, date: string) =>
  !span || span.end <= date ? 0 : workingDays(toIso(toDay(date) + 1), span.end);

/** Retard sur le plus proche de ses jalons, donc le plus grand (0 = à l'heure pour tous). */
export function lateBy(item: Item, span: Span | null | undefined, items: Item[]) {
  const first = targetsOf(item, items)[0];
  return first ? lateAfter(span, first.milestone_date!) : 0;
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
export const overdue = (item: Item, span: Span | null | undefined) => !finished(item) && slip(span) > 0;

/** Occupation d'une personne sur une semaine : part de sa capacité réellement utilisée, ou "abs". */
export function weekLoad(plan: Plan, person: Person, absent: Set<string>, mondayDay: number): number | "abs" {
  let cap = 0, use = 0, workdays = 0, off = 0;
  for (let d = mondayDay; d < mondayDay + 7; d++) {
    if (isWeekend(d)) continue;
    workdays++;
    if (absent.has(`${person.id}:${d}`)) { off++; continue; }
    cap += Number(person.capacity);
    use += plan.used.get(`${person.id}:${d}`) ?? 0;
  }
  if (workdays && off === workdays) return "abs";
  return cap ? Math.round((use / cap) * 100) : 0;
}

/** Jours ouvrés d'ici `iso` (0 : aujourd'hui ou passé). */
export const daysUntil = (iso: string, today = todayIso()) => (iso <= today ? 0 : workingDays(toIso(toDay(today) + 1), iso));

/** Premier jour où une vérification de délai `lead` (jours ouvrés) est due, pour une tâche qui démarre le `start`. */
export function dueOn(start: string, lead: number) {
  let d = toDay(start);
  for (let n = lead; n > 0; d--) if (!isWeekend(d)) n--;
  return toIso(d);
}

/** Délais des vérifications du projet (jours ouvrés avant le démarrage). */
export const prepLeads = (p: Project): Record<PrepKind, number> => ({ business: p.business_lead_days ?? 5, tech: p.tech_lead_days ?? 3 });

/**
 * Prochains démarrages : tâches non terminées qui démarrent aujourd'hui ou dans le plus long des délais, par date de début.
 * `due` : vérifications dont l'échéance est atteinte et pas encore cochées.
 * ponytail: vérification par tâche (feuille), pas d'héritage depuis le parent.
 */
export function upcomingStarts(items: Item[], plan: Plan, leads: Record<PrepKind, number>, today = todayIso()) {
  const horizon = Math.max(leads.business, leads.tech);
  return orderItems(items).flatMap(({ item, hasChildren }) => {
    const span = plan.spans.get(item.id);
    if (hasChildren || finished(item) || !span || span.start < today) return [];
    const days = daysUntil(span.start, today);
    if (days > horizon) return [];
    const due = (["business", "tech"] as const).filter((k) => days <= leads[k] && !item.prep?.[k]);
    return [{ item, start: span.start, days, due }];
  }).sort((a, b) => a.start.localeCompare(b.start));
}

/** Items non terminés avec une dépendance ou un blocage actif, par date de début (non planifiés en dernier). */
export function toLift(items: Item[], plan: Plan) {
  return orderItems(items).flatMap(({ item, hasChildren }) => {
    const tags = openTags(item).filter((t) => t.tag !== "risk");
    if (!tags.length || (!hasChildren && item.status === "done")) return [];
    return [{ item, start: plan.spans.get(item.id)?.start ?? null, tags }];
  }).sort((a, b) => (a.start ?? "\uffff").localeCompare(b.start ?? "\uffff"));
}

/** Marge (jours ouvrés) en dessous de laquelle, incluse, un jalon est serré : une semaine. */
export const TIGHT_MARGIN = 5;

/**
 * Jalons à venir : items rattachés, en retard (du plus en retard au moins), non planifiés, marge du dernier item.
 * `tone` : late (un item finit après), tight (marge ≤ une semaine ou item non planifié), ok, none (rien de rattaché).
 */
export function upcomingMilestones(items: Item[], plan: Plan, today = todayIso()) {
  return items.filter((m) => m.type === "milestone" && m.milestone_date && m.milestone_date >= today)
    .sort((a, b) => a.milestone_date!.localeCompare(b.milestone_date!))
    .map((m) => {
      const targeted = items.filter((i) => i.target_ids.includes(m.id));
      const late = targeted.map((item) => ({ item, n: lateAfter(plan.spans.get(item.id), m.milestone_date!) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
      const ends = targeted.flatMap((i) => plan.spans.get(i.id)?.end ?? []).sort();
      const last = ends.at(-1);
      const unplanned = targeted.length - ends.length;
      const margin = last && last < m.milestone_date! ? workingDays(toIso(toDay(last) + 1), m.milestone_date!) : 0;
      const tone = !targeted.length ? "none" : late.length ? "late" : unplanned || margin <= TIGHT_MARGIN ? "tight" : "ok";
      return { milestone: m, targeted: targeted.length, late, worst: late[0]?.n ?? 0, unplanned, margin, tone } as const;
    });
}
