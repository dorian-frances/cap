import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Point d'état : bien (vert), attention (ambre), problème (rouge). */
export const TONE_DOT = { ok: "bg-green-600", warn: "bg-amber-600", bad: "bg-red-600" };
export type CardTone = keyof typeof TONE_DOT;

/** Chiffre clé ; avec `href`, la carte mène à son détail ; `tone` ajoute un point d'état devant la valeur. */
export function StatCard({ label, value, note, href, tone }: { label: string; value: string; note?: ReactNode; href?: string; tone?: CardTone }) {
  const cls = cx("flex animate-rise-in flex-col gap-1 rounded-[10px] border border-stone-200/80 bg-surface px-4 py-3.5",
    href && "transition-colors duration-150 hover:border-stone-300 hover:bg-stone-50");
  const body = <>
    <span className="text-xs text-stone-500">{label}</span>
    <span className="flex items-center gap-2 text-[17px] font-semibold">{tone && <span className={cx("size-2.5 shrink-0 rounded-full", TONE_DOT[tone])} />}{value}</span>
    {note && <span className="text-xs">{note}</span>}
  </>;
  return href ? <a href={href} className={cls}>{body}</a> : <div className={cls}>{body}</div>;
}
