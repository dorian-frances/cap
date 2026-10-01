import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Chiffre clé ; avec `href`, la carte mène à son détail. */
export function StatCard({ label, value, note, href }: { label: string; value: string; note: ReactNode; href?: string }) {
  const cls = cx("flex animate-rise-in flex-col gap-1 rounded-[10px] border border-stone-200/80 bg-surface px-4 py-3.5",
    href && "transition-colors duration-150 hover:border-stone-300 hover:bg-stone-50");
  const body = <>
    <span className="text-xs text-stone-500">{label}</span>
    <span className="text-[17px] font-semibold">{value}</span>
    <span className="text-xs">{note}</span>
  </>;
  return href ? <a href={href} className={cls}>{body}</a> : <div className={cls}>{body}</div>;
}
