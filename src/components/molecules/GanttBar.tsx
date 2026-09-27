import type { Axis } from "@/lib/axis";
import type { Span } from "@/lib/plan";
import { cx } from "@/lib/cx";
import { ACCENT, HATCH } from "../tokens";

// Les barres glissent vers leurs nouvelles dates quand le plan est recalculé.
const motion = "transition-[left,width,opacity,box-shadow] duration-300 ease-out-quint";

/**
 * Barre calculée d'un item. `lateFrom` : date du jalon dépassé, la partie au-delà est hachurée en rouge.
 * Libellé dedans si la barre est assez large, sinon à droite (`auto`) ou masqué (`inside`).
 */
export function GanttBar({ ax, span, label, tone, lateFrom, top, height, labelMode = "auto", selected, faded, title }: {
  ax: Axis; span: Span; label: string; tone: { bar: string; border: string; text: string }; lateFrom?: string | null;
  top: number; height: number; labelMode?: "auto" | "inside"; selected?: boolean; faded?: boolean; title?: string;
}) {
  const left = ax.x(span.start);
  const width = ax.x(span.end) - left + ax.px;
  const fits = width >= 64;
  const ov = lateFrom ? Math.max(left, ax.x(lateFrom) + ax.px) : 0;
  return (
    <>
      <div title={title} className={cx("absolute truncate rounded-[5px] px-2 text-xs font-medium", motion)}
        style={{ left, width, top, height, lineHeight: `${height}px`, background: tone.bar, color: tone.text, opacity: faded ? 0.75 : 1, boxShadow: `inset 0 0 0 1px ${tone.border}${selected ? `, 0 0 0 2px ${ACCENT}` : ""}` }}>
        {fits && label}
      </div>
      {lateFrom && ov < left + width && (
        <div className={cx("pointer-events-none absolute rounded-r-[5px]", motion)}
          style={{ left: ov, width: left + width - ov, top, height, background: HATCH.late, boxShadow: `inset 0 0 0 1px ${HATCH.lateBorder}` }} />
      )}
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
