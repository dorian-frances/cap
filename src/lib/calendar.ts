// Calcul de la grille d'un mois pour le sélecteur de dates (jours = entiers depuis l'epoch, UTC).
import { monday, toDay, toIso } from "./plan.ts";

const pad = (n: number) => String(n).padStart(2, "0");
export const ymOf = (day: number) => { const d = new Date(day * 86_400_000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; };
export const firstOfMonth = (y: number, m: number) => Math.round(Date.UTC(y, m, 1) / 86_400_000);

/** Même jour du mois, `n` mois plus tard (borné au dernier jour du mois). */
export function addMonths(day: number, n: number) {
  const { y, m } = ymOf(day);
  const dom = new Date(day * 86_400_000).getUTCDate();
  const last = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
  return toDay(`${new Date(Date.UTC(y, m + n, 1)).getUTCFullYear()}-${pad(((m + n) % 12 + 12) % 12 + 1)}-${pad(Math.min(dom, last))}`);
}

/** 6 semaines de 7 jours, en commençant au lundi précédant le 1er du mois. */
export function monthGrid(day: number) {
  const { y, m } = ymOf(day);
  const start = monday(firstOfMonth(y, m));
  return Array.from({ length: 42 }, (_, i) => start + i);
}

export const monthLabel = (day: number) =>
  new Date(day * 86_400_000).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export const nextMonday = (iso: string) => toIso(monday(toDay(iso)) + 7);
