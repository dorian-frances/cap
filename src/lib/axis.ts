// Échelle de temps partagée par la timeline, la vue équipe et la vue client.
import { monday, toDay, toIso, todayIso } from "./plan";

export type Zoom = "semaine" | "mois" | "trimestre";
export const PX: Record<Zoom, number> = { semaine: 32, mois: 12, trimestre: 5 };

/** Du lundi précédant le début jusqu'à 4 semaines après la dernière date connue. */
export function axis(zoom: Zoom, startIso: string, dates: string[], fitWidth?: number) {
  const today = toDay(todayIso());
  const all = [toDay(startIso), today, ...dates.map(toDay)];
  const from = monday(Math.min(...all)) - 7;
  let days = Math.max(monday(Math.max(...all, from + 70)) + 28 - from, 84);
  // fitWidth : échelle choisie pour remplir une largeur donnée (vue client).
  const px = fitWidth ? Math.max(4, Math.min(24, Math.floor(fitWidth / days))) : PX[zoom];
  if (!fitWidth) days = Math.max(days, Math.ceil(1200 / px / 7) * 7); // toujours au moins un écran de large
  const x = (iso: string) => (toDay(iso) - from) * px;
  const months: { label: string; left: number }[] = [];
  for (let d = from; d < from + days; d++) {
    const iso = toIso(d);
    if (d === from || iso.endsWith("-01"))
      months.push({
        left: (d - from) * px,
        label: new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { month: zoom === "trimestre" ? "short" : "long", year: iso.endsWith("-01-01") || d === from ? "numeric" : undefined, timeZone: "UTC" }),
      });
  }
  const ticks: { label: string; sub?: string; left: number; width: number }[] = [];
  if (zoom === "semaine")
    for (let d = from; d < from + days; d++) {
      const dt = new Date(d * 86_400_000);
      ticks.push({ left: (d - from) * px, width: px, label: String(dt.getUTCDate()), sub: "lmmjvsd"[(dt.getUTCDay() + 6) % 7] });
    }
  else
    for (let d = from; d < from + days; d += 7) {
      const dt = new Date(d * 86_400_000);
      ticks.push({ left: (d - from) * px, width: 7 * px, label: zoom === "mois" ? String(dt.getUTCDate()) : "", sub: `S${isoWeek(d)}` });
    }
  return { px, from, days, width: days * px, today, x, months, ticks };
}
export type Axis = ReturnType<typeof axis>;

function isoWeek(day: number) {
  const d = new Date(day * 86_400_000);
  const th = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)));
  const jan4 = new Date(Date.UTC(th.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((th.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}
