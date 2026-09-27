"use client";

import { cx } from "@/lib/cx";

/** Choix exclusif compact ; l'indicateur glisse d'une option à l'autre. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, stretch }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; stretch?: boolean;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="group" aria-label={label} className={cx("relative grid rounded-[7px] bg-stone-100 p-0.5", stretch ? "w-full" : "w-max")}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span aria-hidden className="absolute inset-y-0.5 left-0.5 rounded-[5px] bg-raised shadow-control transition-transform duration-250 ease-out-quint"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={cx("relative h-[22px] whitespace-nowrap rounded-[5px] px-2.5 text-xs transition-colors duration-150", o.value === value ? "font-medium text-stone-900" : "text-stone-500 hover:text-stone-800")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
