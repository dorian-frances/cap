// Tokens utilisés en style inline (couleurs calculées à l'exécution). Le reste vit dans globals.css (@theme).
import type { Status } from "@/lib/plan";

export const STATUS: Record<Status, { label: string; bar: string; border: string; text: string; key: string }> = {
  todo: { label: "À faire", bar: "#f0eeeb", border: "#e0dcd7", text: "#57534e", key: "1" },
  doing: { label: "En cours", bar: "#fcebd0", border: "#f4d4a2", text: "#8a4a0b", key: "2" },
  done: { label: "Fait", bar: "#ddf2e3", border: "#bfe3ca", text: "#1f6b3a", key: "3" },
};

export const ACCENT = "#5b5bd6";

export const HATCH = {
  late: "repeating-linear-gradient(135deg,rgba(220,38,38,.30) 0 2px,rgba(253,236,236,.95) 2px 5px)",
  lateBorder: "#f0a8a8",
  // Retard sur l'estimation (ambre) : distinct du dépassement de jalon (rouge).
  overrun: "repeating-linear-gradient(135deg,rgba(217,119,6,.32) 0 2px,rgba(254,243,199,.95) 2px 5px)",
  overrunBorder: "#efc587",
  absence: "repeating-linear-gradient(135deg,#d6d3d1 0 2px,#f4f3f1 2px 5px)",
  absenceOverlay: "repeating-linear-gradient(135deg,rgba(168,162,158,.5) 0 2px,transparent 2px 5px)",
};

const PALETTE = [
  ["#d7ede6", "#0f5e4c"], ["#f3e1d1", "#8a4b17"], ["#e4ddf5", "#4c3a8a"], ["#f6dfe6", "#8a2f4f"],
  ["#dde8f6", "#1f4f86"], ["#eef0d5", "#5b6313"], ["#f5e3cf", "#7a4a12"], ["#dff1f4", "#155e6b"],
];

/** Couleur stable dérivée d'un id : [fond, texte]. */
export function personColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
