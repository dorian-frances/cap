import type { ReactNode } from "react";

/** Libellé + contrôle. `inline` : libellé à gauche (pages de réglages), sinon au-dessus (formulaires). */
export function Field({ label, hint, inline, children }: { label: string; hint?: string; inline?: boolean; children: ReactNode }) {
  if (inline)
    return (
      <div className="flex items-center justify-between gap-4 text-[13px]">
        <div><div>{label}</div>{hint && <div className="text-xs text-stone-400">{hint}</div>}</div>
        {children}
      </div>
    );
  return (
    <div className="flex min-w-0 flex-col gap-1 text-[13px]">
      <span className="text-stone-500">{label}</span>
      {children}
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </div>
  );
}
