"use client";

import { useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, X } from "lucide-react";
import { fmtDay, todayIso, toDay, toIso, workingDays } from "@/lib/plan";
import { nextMonday } from "@/lib/calendar";
import { cx } from "@/lib/cx";
import { fieldCls } from "../atoms/Input";
import { Calendar } from "./Calendar";
import { PopoverContent } from "./Popover";

type Variant = "field" | "ghost";
// À l'ouverture, le focus va sur le jour sélectionné (ou aujourd'hui) pour naviguer aux flèches.
const DAY = '[data-day][tabindex="0"]';
const triggerCls = (variant: Variant, empty: boolean) => cx(
  "inline-flex items-center gap-2 whitespace-nowrap text-left tabular-nums",
  variant === "field"
    ? cx(fieldCls, "w-full data-[popup-open]:border-accent-400 data-[popup-open]:ring-[3px] data-[popup-open]:ring-accent-100")
    : "h-7 rounded-md px-2 text-[13px] transition-colors duration-150 hover:bg-stone-100 data-[popup-open]:bg-stone-100",
  empty && "text-stone-400",
);

const Quick = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="h-6 rounded-md border border-stone-200 px-2 text-xs text-stone-600 transition-colors duration-150 hover:border-stone-300 hover:bg-stone-50">
    {children}
  </button>
);

/** Sélecteur d'une date ISO (AAAA-MM-JJ). */
export function DatePicker({ value, onChange, label, placeholder = "Choisir une date", variant = "field", clearable, className }: {
  value: string | null; onChange: (iso: string | null) => void; label: string; placeholder?: string; variant?: Variant; clearable?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const cal = useRef<HTMLDivElement>(null);
  const pick = (iso: string | null) => { onChange(iso); setOpen(false); };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={label} className={cx(triggerCls(variant, !value), className)}>
        <CalendarDays size={14} className="shrink-0 text-stone-400" />
        <span className="flex-1">{value ? fmtDay(value, true) : placeholder}</span>
      </Popover.Trigger>
      <PopoverContent initialFocus={() => cal.current?.querySelector<HTMLElement>(DAY) ?? true} className="min-w-0 p-2.5">
        <div ref={cal}><Calendar start={value} end={value} onPick={pick} /></div>
        <div className="mt-2 flex items-center gap-1.5 border-t border-stone-100 pt-2.5">
          <Quick onClick={() => pick(todayIso())}>Aujourd&apos;hui</Quick>
          <Quick onClick={() => pick(nextMonday(todayIso()))}>Lundi prochain</Quick>
          <span className="flex-1" />
          {clearable && value && (
            <button type="button" aria-label="Effacer la date" onClick={() => pick(null)} className="flex size-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X size={13} /></button>
          )}
        </div>
      </PopoverContent>
    </Popover.Root>
  );
}

export type Range = { start: string; end: string };
export const fmtRange = (r: Range) => (r.start === r.end ? fmtDay(r.start, true) : `${fmtDay(r.start)} → ${fmtDay(r.end, true)}`);

/** Sélecteur de période : premier clic = début, second = fin (recliquer le même jour = un seul jour). */
export function DateRangePicker({ value, onChange, label, placeholder = "Choisir les dates", className }: {
  value: Range | null; onChange: (r: Range) => void; label: string; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const cal = useRef<HTMLDivElement>(null);
  const done = (r: Range) => { onChange(r); setDraft(null); setOpen(false); };
  const pick = (iso: string) => {
    if (!draft) return setDraft(iso);
    const [start, end] = [draft, iso].sort();
    done({ start, end });
  };
  const monday = nextMonday(todayIso());
  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft(null); }}>
      <Popover.Trigger aria-label={label} className={cx(triggerCls("field", !value), className)}>
        <CalendarDays size={14} className="shrink-0 text-stone-400" />
        <span className="flex-1 truncate">{value ? fmtRange(value) : placeholder}</span>
        {value && <span className="text-xs text-stone-400">{workingDays(value.start, value.end)} j ouvré{workingDays(value.start, value.end) > 1 ? "s" : ""}</span>}
      </Popover.Trigger>
      <PopoverContent initialFocus={() => cal.current?.querySelector<HTMLElement>(DAY) ?? true} className="min-w-0 p-2.5">
        <p className="mb-2 px-1.5 text-xs text-stone-500" aria-live="polite">
          {draft ? `Du ${fmtDay(draft)} au… choisissez la fin` : "Choisissez le premier jour"}
        </p>
        <div ref={cal}><Calendar rangeMode start={draft ?? value?.start} end={draft ? null : value?.end} onPick={pick} /></div>
        <div className="mt-2 flex items-center gap-1.5 border-t border-stone-100 pt-2.5">
          <Quick onClick={() => done({ start: todayIso(), end: todayIso() })}>Aujourd&apos;hui</Quick>
          <Quick onClick={() => done({ start: monday, end: toIso(toDay(monday) + 4) })}>Semaine prochaine</Quick>
        </div>
      </PopoverContent>
    </Popover.Root>
  );
}
