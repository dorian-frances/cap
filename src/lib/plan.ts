// Domaine Cap : types + calcul du planning. Fonctions pures, sans dépendance.

export type Project = { id: string; name: string; start_date: string; share_token?: string };
export type Person = { id: string; name: string; capacity: number };
export type Absence = { id: string; person_id: string; start_date: string; end_date: string; label: string };
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
};
export type Span = { start: string; end: string }; // dates ISO, bornes incluses
export type Row = { item: Item; depth: number; hasChildren: boolean };

const DAY = 86_400_000;
const HORIZON = 365 * 5; // ponytail: au-delà de 5 ans sans capacité, l'Item est "non planifiable"

export const toDay = (iso: string) => Math.round(Date.parse(iso + "T00:00:00Z") / DAY);
export const toIso = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
export const isWeekend = (day: number) => [0, 6].includes(new Date(day * DAY).getUTCDay());

/** Items dans l'ordre de priorité : parcours en profondeur, frères triés par position. */
export function orderItems(items: Item[]): Row[] {
  const byParent = new Map<string | null, Item[]>();
  for (const it of items) {
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
export function schedule(items: Item[], people: Person[], absences: Absence[], startIso: string) {
  const start = toDay(startIso);
  const capacity = new Map(people.map((p) => [p.id, Number(p.capacity)]));
  const absent = new Set<string>();
  for (const a of absences)
    for (let d = toDay(a.start_date); d <= toDay(a.end_date); d++) absent.add(`${a.person_id}:${d}`);

  const used = new Map<string, number>(); // `${person}:${day}` -> JH déjà consommés
  const free = new Map<string, number>(); // person -> premier jour où il peut reprendre
  const left = (p: string, d: number) =>
    isWeekend(d) || absent.has(`${p}:${d}`) ? 0 : capacity.get(p)! - (used.get(`${p}:${d}`) ?? 0);

  const rows = orderItems(items);
  const spans = new Map<string, Span | null>();

  for (const { item, hasChildren } of rows) {
    if (item.type !== "feature" || hasChildren) continue;
    const owners = item.owner_ids.filter((o) => capacity.has(o));
    if (!owners.length) { spans.set(item.id, null); continue; }

    let remaining = Number(item.estimate_jh);
    let first: number | null = null;
    let d = Math.max(start, ...owners.map((o) => free.get(o) ?? start));
    for (; d < start + HORIZON; d++) {
      const total = owners.reduce((s, o) => s + left(o, d), 0);
      if (total <= 1e-9) continue;
      first ??= d;
      const ratio = Math.min(1, remaining / total);
      for (const o of owners) used.set(`${o}:${d}`, (used.get(`${o}:${d}`) ?? 0) + left(o, d) * ratio);
      remaining -= total * ratio;
      if (remaining <= 1e-9) break;
    }
    if (first === null || remaining > 1e-9) { spans.set(item.id, null); continue; }
    for (const o of owners) free.set(o, left(o, d) > 1e-9 ? d : d + 1);
    spans.set(item.id, { start: toIso(first), end: toIso(d) });
  }

  // Parents (enfants d'abord : parcours inverse) et jalons.
  for (const { item, hasChildren } of [...rows].reverse()) {
    if (item.type === "milestone") {
      spans.set(item.id, item.milestone_date ? { start: item.milestone_date, end: item.milestone_date } : null);
    } else if (hasChildren) {
      const kids = rows
        .filter((r) => r.item.parent_id === item.id && r.item.type === "feature")
        .map((r) => spans.get(r.item.id))
        .filter((s): s is Span => !!s);
      spans.set(item.id, kids.length
        ? { start: kids.map((s) => s.start).sort()[0], end: kids.map((s) => s.end).sort().at(-1)! }
        : null);
    }
  }
  return spans;
}

/** JH d'un Item : les siens si feuille, somme des enfants sinon. */
export function totalJh(items: Item[], id: string): number {
  const kids = items.filter((i) => i.parent_id === id && i.type === "feature");
  if (!kids.length) return Number(items.find((i) => i.id === id)?.estimate_jh ?? 0);
  return kids.reduce((s, k) => s + totalJh(items, k.id), 0);
}

/** L'Item finit-il après son jalon cible ? */
export function isLate(item: Item, span: Span | null | undefined, items: Item[]) {
  const target = items.find((i) => i.id === item.target_id);
  return !!(span && target?.milestone_date && span.end > target.milestone_date);
}
