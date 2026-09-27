"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthGrid, monthLabel, ymOf } from "@/lib/calendar";
import { isWeekend, monday, toDay, toIso, todayIso } from "@/lib/plan";
import { cx } from "@/lib/cx";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const long = (d: number) => new Date(d * 86_400_000).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Grille mensuelle navigable au clavier (flèches, Pg préc./suiv., Début/Fin).
 * `start`/`end` : sélection (égales pour une date simple). `rangeMode` : prévisualise la plage au survol
 * tant que seule la date de début est choisie.
 */
export function Calendar({ start, end, rangeMode, onPick }: { start?: string | null; end?: string | null; rangeMode?: boolean; onPick: (iso: string) => void }) {
  const today = toDay(todayIso());
  const s = start ? toDay(start) : null;
  const e = end ? toDay(end) : null;
  const [focus, setFocus] = useState(s ?? today);
  const [hover, setHover] = useState<number | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const fromKeyboard = useRef(false);

  useEffect(() => {
    if (!fromKeyboard.current) return;
    fromKeyboard.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-day="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus]);

  const { m } = ymOf(focus);
  const days = monthGrid(focus);
  // Plage affichée : sélection, ou prévisualisation début → survol.
  const [lo, hi] = rangeMode && s !== null && e === null && hover !== null ? [Math.min(s, hover), Math.max(s, hover)] : [s, e ?? s];

  const onKeyDown = (ev: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: focus - 1, ArrowRight: focus + 1, ArrowUp: focus - 7, ArrowDown: focus + 7,
      Home: monday(focus), End: monday(focus) + 6,
      PageUp: addMonths(focus, ev.shiftKey ? -12 : -1), PageDown: addMonths(focus, ev.shiftKey ? 12 : 1),
    };
    if (!(ev.key in moves)) return;
    ev.preventDefault();
    fromKeyboard.current = true;
    setFocus(moves[ev.key]);
    if (rangeMode) setHover(moves[ev.key]);
  };

  return (
    <div className="w-[252px] select-none">
      <div className="mb-1.5 flex items-center gap-1 pl-1.5">
        <span className="flex-1 text-[13px] font-medium capitalize">{monthLabel(focus)}</span>
        <NavButton label="Mois précédent" onClick={() => setFocus(addMonths(focus, -1))}><ChevronLeft size={15} /></NavButton>
        <NavButton label="Mois suivant" onClick={() => setFocus(addMonths(focus, 1))}><ChevronRight size={15} /></NavButton>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-stone-400">
        {WEEKDAYS.map((w) => <abbr key={w} title={w} className="h-7 leading-7 no-underline">{w[0].toUpperCase()}</abbr>)}
      </div>
      <div ref={grid} role="grid" aria-label={monthLabel(focus)} onKeyDown={onKeyDown} onMouseLeave={() => setHover(null)}
        className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const edge = d === lo || d === hi;
          const inside = lo !== null && hi !== null && d > lo && d < hi;
          const outside = ymOf(d).m !== m;
          return (
            <div key={d} role="gridcell" className={cx(
              "relative flex h-8 items-center justify-center",
              inside && "bg-accent-50",
              edge && lo !== hi && (d === lo ? "bg-gradient-to-r from-transparent from-50% to-accent-50 to-50%" : "bg-gradient-to-l from-transparent from-50% to-accent-50 to-50%"),
            )}>
              <button type="button" data-day={d} tabIndex={d === focus ? 0 : -1} aria-label={long(d)} aria-pressed={edge}
                aria-current={d === today ? "date" : undefined}
                onClick={() => { setFocus(d); onPick(toIso(d)); }} onMouseEnter={() => rangeMode && setHover(d)}
                className={cx(
                  "relative flex size-8 items-center justify-center rounded-md text-[13px] tabular-nums outline-offset-0 transition-colors duration-100",
                  edge ? "bg-accent-600 font-medium text-white" : "hover:bg-stone-100",
                  !edge && (outside ? "text-stone-300" : isWeekend(d) ? "text-stone-400" : "text-stone-800"),
                  !edge && d === today && "font-semibold text-accent-700",
                )}>
                {new Date(d * 86_400_000).getUTCDate()}
                {d === today && <span className={cx("absolute bottom-1 size-1 rounded-full", edge ? "bg-white" : "bg-accent-600")} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md text-stone-500 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-900">
      {children}
    </button>
  );
}
