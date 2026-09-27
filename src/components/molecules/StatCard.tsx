import type { ReactNode } from "react";

export function StatCard({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <div className="flex animate-rise-in flex-col gap-1 rounded-[10px] border border-stone-200/80 bg-white px-4 py-3.5">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-[17px] font-semibold">{value}</span>
      <span className="text-xs">{note}</span>
    </div>
  );
}
