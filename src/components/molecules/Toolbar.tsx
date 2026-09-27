import type { ReactNode } from "react";

/** Barre d'outils sous l'en-tête d'une vue. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stone-100 px-5 text-xs text-stone-500">{children}</div>;
}
