// Tokens utilisés en style inline (couleurs calculées à l'exécution). Le reste vit dans globals.css (@theme).
import { Ban, Flame, Link, type LucideIcon } from "lucide-react";
import type { Status, Tag } from "@/lib/plan";

export const STATUS: Record<Status, { label: string; bar: string; border: string; text: string; key: string }> = {
  todo: { label: "À faire", bar: "var(--st-todo-bar)", border: "var(--st-todo-border)", text: "var(--st-todo-text)", key: "1" },
  doing: { label: "En cours", bar: "var(--st-doing-bar)", border: "var(--st-doing-border)", text: "var(--st-doing-text)", key: "2" },
  done: { label: "Fait", bar: "var(--st-done-bar)", border: "var(--st-done-border)", text: "var(--st-done-text)", key: "3" },
};

// Ordre d'affichage : du plus grave au moins grave.
// Ordre = priorité : la ligne d'un item prend la couleur (`tone`) de son premier tag actif.
export const TAGS: Record<Tag, { label: string; hint: string; Icon: LucideIcon; cls: string; tone: string }> = {
  blocked: { label: "Bloqué", hint: "Ne peut pas avancer", Icon: Ban, cls: "bg-red-50 text-red-700", tone: "var(--color-red-600)" },
  risk: { label: "À risque", hint: "Incertitude à surveiller", Icon: Flame, cls: "bg-amber-100 text-amber-800", tone: "var(--color-amber-600)" },
  dependency: { label: "Dépendance", hint: "Attend une équipe, un client ou une API externe", Icon: Link, cls: "bg-(--p4-bg) text-(--p4-fg)", tone: "var(--p4-fg)" },
};

export const ACCENT = "var(--color-accent-600)";

// Valeurs par thème dans globals.css.
export const HATCH = {
  late: "var(--hatch-late)",
  lateBorder: "var(--hatch-late-border)",
  // Retard sur l'estimation (ambre) : distinct du dépassement de jalon (rouge).
  overrun: "var(--hatch-overrun)",
  overrunBorder: "var(--hatch-overrun-border)",
  // En pause : rayures verticales grises, comme un « || ».
  pause: "var(--hatch-pause)",
  pauseBorder: "var(--hatch-pause-border)",
  absence: "var(--hatch-absence)",
  absenceOverlay: "var(--hatch-absence-overlay)",
};

/** Palette des personnes : [fond, texte], teintes bien distinctes. */
export const PALETTE: [string, string][] = Array.from({ length: 12 }, (_, i) => [`var(--p${i}-bg)`, `var(--p${i}-fg)`]);

/** Couleur choisie d'une personne, sinon couleur stable dérivée de l'id : [fond, texte]. */
export function personColor(p: string | { id: string; color?: number | null }) {
  if (typeof p !== "string" && p.color != null) return PALETTE[p.color % PALETTE.length];
  let h = 0;
  for (const c of typeof p === "string" ? p : p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Première couleur que personne n'a encore (la moins utilisée si la palette est épuisée). */
export function freeColor(people: { color?: number | null }[]) {
  const n = PALETTE.map((_, i) => people.filter((p) => p.color === i).length);
  return n.indexOf(Math.min(...n));
}

export const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
