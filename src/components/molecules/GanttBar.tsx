import type { Axis } from "@/lib/axis";
import type { Span } from "@/lib/plan";
import { cx } from "@/lib/cx";
import { Pause } from "lucide-react";
import { ACCENT, HATCH } from "../tokens";

// Les barres glissent vers leurs nouvelles dates quand le plan est recalculé.
const motion = "transition-[left,width,opacity,box-shadow] duration-300 ease-out-quint";

/**
 * Barre calculée d'un item.
 * - Au-delà de la fin prévue (`span.planned`) : hachures ambre, retard sur l'estimation.
 * - Au-delà de `lateFrom` (date du jalon dépassé) : hachures rouges.
 * - `pauses` : périodes où la tâche est en pause (0 %), rayures grises.
 * Libellé dedans si la barre est assez large, sinon à droite (`auto`) ou masqué (`inside`).
 */
export function GanttBar({ ax, span, label, tone, lateFrom, pauses = [], top, height, labelMode = "auto", selected, faded, title }: {
  ax: Axis; span: Span; label: string; tone: { bar: string; border: string; text: string }; lateFrom?: string | null; pauses?: Span[];
  top: number; height: number; labelMode?: "auto" | "inside"; selected?: boolean; faded?: boolean; title?: string;
}) {
  const left = ax.x(span.start);
  const width = ax.x(span.end) - left + ax.px;
  // Libellé dedans s'il tient (largeur estimée du texte), sinon à droite de la barre en mode `auto`.
  const fits = labelMode === "inside" ? width >= 64 : width >= label.length * 6.6 + 16;
  const ov = lateFrom ? Math.max(left, ax.x(lateFrom) + ax.px) : 0;
  const run = span.planned && span.planned < span.end ? Math.max(left, ax.x(span.planned) + ax.px) : 0;
  return (
    <>
      <div title={title} className={cx("absolute truncate rounded-[5px] px-2 text-xs font-medium", motion)}
        style={{ left, width, top, height, lineHeight: `${height}px`, background: tone.bar, color: tone.text, opacity: faded ? 0.75 : 1, boxShadow: `inset 0 0 0 1px ${tone.border}${selected ? `, 0 0 0 2px ${ACCENT}` : ""}` }}>
        {fits && label}
      </div>
      {run > 0 && run < left + width && (
        <div className={cx("pointer-events-none absolute rounded-r-[5px]", motion)}
          style={{ left: run, width: left + width - run, top, height, background: HATCH.overrun, boxShadow: `inset 0 0 0 1px ${HATCH.overrunBorder}` }} />
      )}
      {lateFrom && ov < left + width && (
        <div className={cx("pointer-events-none absolute rounded-r-[5px]", motion)}
          style={{ left: ov, width: left + width - ov, top, height, background: HATCH.late, boxShadow: `inset 0 0 0 1px ${HATCH.lateBorder}` }} />
      )}
      {pauses.map((p) => {
        const l = ax.x(p.start), w = ax.x(p.end) - l + ax.px;
        return (
          <div key={p.start} title={title} className={cx("pointer-events-none absolute flex items-center justify-center rounded-[5px] text-stone-500", motion)}
            style={{ left: l, width: w, top, height, background: HATCH.pause, boxShadow: `inset 0 0 0 1px ${HATCH.pauseBorder}` }}>
            {w >= 18 && (
              <span className="flex items-center gap-0.5 rounded-full bg-white px-1 text-[10px] font-medium leading-[14px] text-stone-600 shadow-[0_0_0_1px_rgb(28_25_23/0.08)]">
                <Pause size={8} fill="currentColor" strokeWidth={0} />{w >= 64 && "Pause"}
              </span>
            )}
          </div>
        );
      })}
      {!fits && labelMode === "auto" && (
        <span className={cx("pointer-events-none absolute whitespace-nowrap text-xs text-stone-500", motion)} style={{ left: left + width + 6, top, lineHeight: `${height}px` }}>{label}</span>
      )}
    </>
  );
}

/** Barre fine d'un item parent : l'enveloppe de ses sous-items. */
export function SummaryBar({ ax, span, collapsed, selected, title }: { ax: Axis; span: Span; collapsed: boolean; selected?: boolean; title?: string }) {
  const left = ax.x(span.start);
  return (
    <div title={title} className={cx("absolute rounded-[3px]", motion)}
      style={{ left, width: ax.x(span.end) - left + ax.px, top: collapsed ? 12 : 13, height: collapsed ? 8 : 6, background: collapsed ? "#8a847e" : "#b9b3ad", boxShadow: selected ? `0 0 0 2px ${ACCENT}` : undefined }} />
  );
}
