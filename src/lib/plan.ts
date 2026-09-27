// Domaine Cap : types + calcul du planning. Fonctions pures, sans dépendance.

export type Project = { id: string; name: string; start_date: string; share_token?: string };
export type Person = { id: string; name: string; capacity: number };
export type Absence = { id: string; person_id: string; start_date: string; end_date: string; label?: string };
export type Status = "todo" | "doing" | "done";
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
  overrun_load?: number; // part du temps des owners gardée pendant un retard (1 = tout, 0 = en attente)
};
/** Dates ISO, bornes incluses. `planned` : fin prévue par l'estimation, quand elle diffère de la fin affichée. */
export type Span = { start: string; end: string; planned?: string };
export type Row = { item: Item; depth: number; hasChildren: boolean };
export type Plan = {
  spans: Map<string, Span | null>;
  after: Map<string, string>; // Item -> Item qui l'a fait attendre (même owner)
  used: Map<string, number>; // `${person}:${day}` -> JH consommés ce jour-là
  freeFrom: Map<string, number>; // person -> premier jour où il est libre
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
 * Planning des Items.
 * - Faits d'abord : tâches démarrées ou terminées, à leur date de début réelle (sinon au plus tôt).
 *   Une tâche non terminée occupe ses owners au moins jusqu'à aujourd'hui, même si sa fin prévue est passée,
 *   à hauteur de `overrun_load` : le reste de leur temps va aux tâches suivantes, en parallèle.
 *   Une tâche terminée s'arrête à sa date de fin réelle.
 * - Puis les tâches à faire, par priorité, jamais avant aujourd'hui : chaque owner les enchaîne
 *   dès qu'il est libre ; un Item démarre quand tous ses owners le sont. Les JH sont répartis entre owners.
 *   Disponibilité d'un owner un jour donné = capacité, 0 le week-end ou en absence.
 * - Parent : enveloppe de ses enfants. Jalon : sa date.
 * - null = non planifiable (pas d'owner, pas d'estimation, pas de capacité).
 */
export function schedule(items: Item[], people: Person[], absences: Absence[], startIso: string, today = todayIso()): Plan {
  const start = toDay(startIso);
  const now = toDay(today);
  const capacity = new Map(people.map((p) => [p.id, Number(p.capacity)]));
  const absent = absentSet(absences);

  const used = new Map<string, number>();
  const free = new Map<string, number>();
  const last = new Map<string, string>(); // person -> dernier Item planifié
  const after = new Map<string, string>();
  const left = (p: string, d: number) =>
    isWeekend(d) || absent.has(`${p}:${d}`) ? 0 : Math.max(0, capacity.get(p)! - (used.get(`${p}:${d}`) ?? 0));
  const take = (p: string, d: number, jh: number) => used.set(`${p}:${d}`, (used.get(`${p}:${d}`) ?? 0) + jh);

  const rows = orderItems(items);
  const spans = new Map<string, Span | null>();
  const leaves = rows.filter((r) => !r.hasChildren).map((r) => r.item);
  const ordered = [...leaves.filter((i) => i.status !== "todo"), ...leaves.filter((i) => i.status === "todo")];

  for (const item of ordered) {
    const owners = item.owner_ids.filter((o) => capacity.has(o));
    const jh = Number(item.estimate_jh);
    const done = item.status === "done";
    if (!owners.length || (!(jh > 0) && !done)) { spans.set(item.id, null); continue; }

    const fixed = item.status !== "todo" && item.started_on ? toDay(item.started_on) : null;
    const earliest = item.status === "todo" ? Math.max(start, now) : start;
    const s = fixed ?? Math.max(earliest, ...owners.map((o) => free.get(o) ?? earliest));
    const blocker = fixed === null ? owners.find((o) => last.has(o) && free.get(o) === s) : undefined;

    // Répartition des JH jour par jour (simulée, validée ensuite jusqu'à la fin réelle).
    const alloc: [number, string, number][] = [];
    let remaining = jh;
    let first: number | null = jh > 0 ? null : s;
    let d = s;
    for (; jh > 0 && d < s + HORIZON; d++) {
      const total = owners.reduce((sum, o) => sum + left(o, d), 0);
      if (total <= 1e-9) continue;
      first ??= d;
      const ratio = Math.min(1, remaining / total);
      for (const o of owners) alloc.push([d, o, left(o, d) * ratio]);
      remaining -= total * ratio;
      if (remaining <= 1e-9) break;
    }
    if (first === null || remaining > 1e-9) { spans.set(item.id, null); continue; }

    const planned = d;
    // Terminée : à sa date de fin réelle (sans date, pas après aujourd'hui). Sinon : au moins jusqu'à aujourd'hui.
    const end = done ? (item.done_on ? toDay(item.done_on) : Math.min(planned, Math.max(now, s))) : Math.max(planned, now);
    for (const [day, o, q] of alloc) if (day <= end) take(o, day, q);
    // Dépassement : la tâche garde sa part du temps de ses owners jusqu'à sa fin réelle.
    const share = Number(item.overrun_load ?? 1);
    for (let x = planned; x <= end && end > planned; x++) for (const o of owners) take(o, x, left(o, x) * share);

    if (blocker) after.set(item.id, last.get(blocker)!);
    for (const o of owners) {
      const next = left(o, end) > 1e-9 ? end : end + 1;
      if (next >= (free.get(o) ?? -Infinity)) { free.set(o, next); last.set(o, item.id); }
    }
    spans.set(item.id, { start: toIso(Math.min(first, end)), end: toIso(end), ...(planned !== end ? { planned: toIso(planned) } : {}) });
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

  return { spans, after, used, freeFrom: free };
}

/** JH d'un Item : les siens si feuille, somme des enfants sinon. */
export function totalJh(items: Item[], id: string): number {
  const kids = items.filter((i) => i.parent_id === id && i.type === "feature");
  if (!kids.length) return Number(items.find((i) => i.id === id)?.estimate_jh ?? 0);
  return kids.reduce((s, k) => s + totalJh(items, k.id), 0);
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

/** En retard aujourd'hui : pas terminé et fin prévue dépassée. */
export const overdue = (item: Item, span: Span | null | undefined) => item.status !== "done" && slip(span) > 0;

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
