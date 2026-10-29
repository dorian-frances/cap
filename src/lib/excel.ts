// Macro-plan à coller dans Excel (P7) : une ligne par Item, une colonne par semaine, barres en tirets, statut en pastille.
import { finished, isLate, lateBy, monday, orderItems, slip, toDay, toIso, todayIso, totalJh, unplannedReason, workJh, type Item, type Person, type Plan } from "./plan.ts";

// Excel ne lit pas les variables CSS : couleurs des macro-plans Excel (pastilles, en-tête, jalons, trait du jour).
const COLOR = {
  todo: "#a8a29e", doing: "#f08c00", paused: "#868e96", dev_done: "#7048e8", done: "#2f9e44", late: "#e03131",
  head: "#4472c4", milestone: "#ffff00", today: "#e03131",
};
const FIXED = ["Fonctionnalité", "JH", "Owner", "Statut", "Début", "Fin", "Jalons", "Remarque"];
const WIDTHS = [320, 50, 110, 70, 80, 80, 200, 160]; // px ; semaines : 80
// Tirets par cellule de barre : un peu plus large que la date d'en-tête, pour que « ajuster la largeur » cale la colonne sur la barre.
// ponytail: réglage à l'œil (le tiret vient d'une police de repli d'Excel) ; l'augmenter si des blancs restent entre les cellules.
const BAR = 12;
// Caractères d'un libellé de jalon par colonne de semaine : au-delà, il s'étale sur la semaine suivante.
const PER_WEEK = 12;
export const LEGEND = [
  "├ Début · ─ En cours · ○ Livraison prévue · ● Livré · △ Retard prévu · ▲ Livré en retard · pastille violette : dev terminé, pas encore en production · grise : en pause",
  "Pastille de statut : grise à faire · orange en cours · verte terminé · rouge en retard · Trait rouge : cette semaine",
];

// s : style CSS en ligne ; span : cellules fusionnées vers la droite (Excel les ignore en ajustant la largeur).
export type Cell = { v: string; s?: string; span?: number };
const frDate = (iso: string) => iso.split("-").reverse().join("/");
const num = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/**
 * Grille du macro-plan, dans l'ordre de priorité : légende, jalons (◆, chacun à partir de sa semaine, en escalier
 * quand ils se chevauchent), en-tête, puis une ligne par Item : pastille de statut (rouge en retard : après un jalon
 * ciblé ou après la fin prévue) et barre en tirets ├──, ────, puis ──○ (● △ ▲) à la semaine de fin.
 */
export function planSheet(items: Item[], people: Person[], plan: Plan, today = todayIso()): Cell[][] {
  const rows = orderItems(items);
  const leaves = (item: Item): Item[] => {
    const kids = items.filter((i) => i.parent_id === item.id && i.type === "feature");
    return kids.length ? kids.flatMap(leaves) : [item];
  };
  const spans = rows.flatMap(({ item }) => plan.spans.get(item.id) ?? []);
  const milestones = items.filter((m) => m.type === "milestone" && m.milestone_date);
  const days = [...spans.flatMap((s) => [s.start, s.end]), ...milestones.map((m) => m.milestone_date!)].map(toDay);
  const weeks: number[] = [];
  if (days.length) for (let w = monday(Math.min(...days)); w <= Math.max(...days); w += 7) weeks.push(w);
  const weekOf = (iso: string) => monday(toDay(iso));
  const now = monday(toDay(today));
  // Semaine courante : bordure rouge à gauche, le trait « aujourd'hui » des macro-plans.
  const wk = (w: number, c: Cell): Cell => (w === now ? { ...c, s: `${c.s ?? ""}border-left:2px solid ${COLOR.today};` } : c);
  const head = `background:${COLOR.head};color:#fff;font-weight:bold;`;

  const blank = () => [...FIXED.map(() => ({ v: "" })), ...weeks.map((w) => wk(w, { v: "" }))];
  // Jalons en escalier : chacun sur la première ligne où il ne chevauche pas le précédent.
  const lanes: { row: Cell[]; free: number }[] = [];
  for (const m of [...milestones].sort((a, b) => a.milestone_date!.localeCompare(b.milestone_date!))) {
    const v = `◆ ${m.title}`, at = weeks.indexOf(weekOf(m.milestone_date!));
    const span = Math.min(Math.ceil(v.length / PER_WEEK), weeks.length - at);
    const lane = lanes.find((l) => l.free <= at) ?? lanes[lanes.push({ row: blank(), free: 0 }) - 1];
    lane.row[FIXED.length + at] = wk(weeks[at], { v, span, s: `background:${COLOR.milestone};font-weight:bold;` });
    lane.free = at + span;
  }
  if (lanes.length) lanes[0].row[0] = { v: "Jalons", s: "font-weight:bold;" };

  const sheet: Cell[][] = [
    ...LEGEND.map((v) => [{ v, span: FIXED.length }, ...FIXED.slice(1).map(() => ({ v: "" }))]),
    ...lanes.map((l) => l.row),
    [...FIXED.map((v) => ({ v, s: head })), ...weeks.map((w) => wk(w, { v: frDate(toIso(w)), s: `${head}text-align:center;` }))],
  ];

  for (const { item, depth, hasChildren } of rows) {
    const span = plan.spans.get(item.id);
    // Parent : terminé (ou dev terminé) si toutes ses feuilles le sont, en cours dès que l'une a démarré.
    const status = hasChildren ? (leaves(item).every((l) => l.status === "done") ? "done" : leaves(item).every(finished) ? "dev_done"
      : leaves(item).some((l) => l.status !== "todo") ? "doing" : "todo") : item.status;
    const done = status === "done" || status === "dev_done";
    const late = hasChildren ? isLate(item, plan, items) : lateBy(item, span, items) > 0 || slip(span) > 0;
    const end = done ? (late ? "▲" : "●") : late ? "△" : "○";
    const bar = weeks.map((w): Cell => {
      if (!span || w < weekOf(span.start) || w > weekOf(span.end)) return wk(w, { v: "" });
      const a = w === weekOf(span.start), b = w === weekOf(span.end);
      return wk(w, { v: (a ? "├" : "") + "─".repeat(BAR - (a ? 1 : 0) - (b ? 1 : 0)) + (b ? end : "") });
    });
    const jh = hasChildren ? totalJh(items, item.id) : Number(item.estimate_jh);
    const extra = hasChildren ? 0 : workJh(item) - jh;
    const bold = hasChildren ? "font-weight:bold;" : undefined;
    sheet.push([
      // Espaces insécables : Excel garde l'indentation.
      { v: "    ".repeat(depth) + (item.title || "Sans titre"), s: bold },
      { v: jh > 0 ? num(jh) + (extra > 0 ? `+${num(extra)}` : "") : "", s: `${bold ?? ""}text-align:center;` },
      { v: people.filter((p) => item.owner_ids.includes(p.id)).map((p) => p.name).join("/") },
      { v: "●", s: `color:${COLOR[late && !done ? "late" : status]};font-size:14pt;text-align:center;` },
      { v: span ? frDate(span.start) : "" },
      { v: span ? frDate(span.end) : "" },
      { v: milestones.filter((m) => item.target_ids.includes(m.id)).map((m) => m.title).join(" / ") },
      { v: span ? "" : hasChildren ? "Sous-items à planifier" : unplannedReason(item, people) },
      ...bar,
    ]);
  }
  return sheet;
}

// Un titre qui commence par = + - @ serait lu comme une formule.
const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);

/** Texte tabulé : repli du presse-papiers pour les applications qui ne lisent pas le HTML. */
export const sheetTsv = (sheet: Cell[][]) => sheet.map((r) => r.map(({ v }) => {
  const x = safe(v);
  return /[\t"\r\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
}).join("\t")).join("\r\n");

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Tableau HTML : ce qu'Excel (bureau ou web) colle avec ses couleurs, gras, fusions et largeurs. */
export function sheetHtml(sheet: Cell[][]) {
  const n = Math.max(...sheet.map((r) => r.length));
  const cols = Array.from({ length: n }, (_, i) => `<col width="${WIDTHS[i] ?? 80}">`).join("");
  const body = sheet.map((r) => {
    let skip = 0; // cellules couvertes par une fusion
    return `<tr>${r.map(({ v, s, span = 1 }) => {
      if (skip) { skip--; return ""; }
      skip = span - 1;
      return `<td${span > 1 ? ` colspan="${span}"` : ""}${s ? ` style="${s}"` : ""}>${esc(safe(v))}</td>`;
    }).join("")}</tr>`;
  }).join("");
  return `<table style="border-collapse:collapse;font-family:Calibri,sans-serif;font-size:11pt;white-space:nowrap">${cols}${body}</table>`;
}
