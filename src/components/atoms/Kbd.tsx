import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Kbd({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <kbd className={cx(
      "inline-flex h-4 min-w-4 items-center justify-center rounded border px-1 font-mono text-[11px] leading-none",
      tone === "dark" ? "border-white/15 bg-white/10 text-stone-300" : "border-stone-200 bg-stone-50 text-stone-400",
    )}>
      {children}
    </kbd>
  );
}
