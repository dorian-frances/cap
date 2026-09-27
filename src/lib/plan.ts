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
};
export type Span = { start: string; end: string }; // dates ISO, bornes incluses
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
 * Calcule début/fin de chaque Item.
 * - Feuille : JH répartis entre ses owners ; chaque owner enchaîne ses Items par priorité.
 *   Disponibilité d'un owner un jour donné = capacité, 0 le week-end ou en absence.
 * - Parent : enveloppe de ses enfants. Jalon : sa date.
 * - null = non planifiable (pas d'owner, pas de date…).
 */
export function schedule(items: Item[], people: Person[], absences: Absence[], startIso: string): Plan {
  const start = toDay(startIso);
  const capacity = new Map(people.map((p) => [p.id, Number(p.capacity)]));
  const absent = absentSet(absences);

  const used = new Map<string, number>();
  const free = new Map<string, number>();
  const last = new Map<string, string>(); // person -> dernier Item planifié
  const after = new Map<string, string>();
  const left = (p: string, d: number) =>
    isWeekend(d) || absent.has(`${p}:${d}`) ? 0 : capacity.get(p)! - (used.get(`${p}:${d}`) ?? 0);

  const rows = orderItems(items);
  const spans = new Map<string, Span | null>();

  for (const { item, hasChildren } of rows) {
    if (hasChildren) continue;
    const owners = item.owner_ids.filter((o) => capacity.has(o));
    if (!owners.length) { spans.set(item.id, null); continue; }

    const s = Math.max(start, ...owners.map((o) => free.get(o) ?? start));
    const blocker = owners.find((o) => last.has(o) && (free.get(o) ?? start) === s);
    let remaining = Number(item.estimate_jh);
    let first: number | null = null;
    let d = s;
    for (; d < start + HORIZON; d++) {
      const total = owners.reduce((sum, o) => sum + left(o, d), 0);
      if (total <= 1e-9) continue;
      first ??= d;
      const ratio = Math.min(1, remaining / total);
      for (const o of owners) used.set(`${o}:${d}`, (used.get(`${o}:${d}`) ?? 0) + left(o, d) * ratio);
      remaining -= total * ratio;
      if (remaining <= 1e-9) break;
    }
    if (first === null || remaining > 1e-9) { spans.set(item.id, null); continue; }
    if (blocker) after.set(item.id, last.get(blocker)!);
    for (const o of owners) {
      free.set(o, left(o, d) > 1e-9 ? d : d + 1);
      last.set(o, item.id);
    }
    spans.set(item.id, { start: toIso(first), end: toIso(d) });
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
  if (!item.owner_ids.some((o) => people.some((p) => p.id === o))) return "Pas d'owner";
  return "Pas de capacité";
}

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
