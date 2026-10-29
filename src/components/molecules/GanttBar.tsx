import type { Axis } from "@/lib/axis";
import type { Span } from "@/lib/plan";
import { cx } from "@/lib/cx";
import { ACCENT, HATCH } from "../tokens";

// Les barres glissent vers leurs nouvelles dates quand le plan est recalculé.
const motion = "transition-[left,width,opacity,box-shadow] duration-300 ease-out-quint";

/**
 * Barre calculée d'un item.
 * - Au-delà de la fin prévue (`span.planned`) : hachures ambre, retard sur l'estimation.
 * - Au-delà de `lateFrom` (date du jalon dépassé) : hachures rouges.
 * Libellé dedans si la barre est assez large, sinon à droite (`auto`) ou masqué (`inside`) ;
 * dedans, il passe au-dessus des hachures sur un fond de la couleur de la barre pour rester lisible.
 */
export function GanttBar({ ax, span, label, tone, lateFrom, top, height, labelMode = "auto", selected, faded, title }: {
  ax: Axis; span: Span; label: string; tone: { bar: string; border: string; text: string }; lateFrom?: string | null;
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
      <div title={title} className={cx("absolute rounded-[5px]", motion)}
        style={{ left, width, top, height, background: tone.bar, opacity: faded ? 0.85 : 1, boxShadow: `inset 0 0 0 1px ${tone.border}${selected ? `, 0 0 0 2px ${ACCENT}` : ""}` }} />
      {run > 0 && run < left + width && (
        <div className={cx("pointer-events-none absolute rounded-r-[5px]", motion)}
          style={{ left: run, width: left + width - run, top, height, background: HATCH.overrun, boxShadow: `inset 0 0 0 1px ${HATCH.overrunBorder}` }} />
      )}
      {lateFrom && ov < left + width && (
        <div className={cx("pointer-events-none absolute rounded-r-[5px]", motion)}
          style={{ left: ov, width: left + width - ov, top, height, background: HATCH.late, boxShadow: `inset 0 0 0 1px ${HATCH.lateBorder}` }} />
      )}
      {fits && (
        <div className={cx("pointer-events-none absolute truncate px-1.5 text-xs font-medium", motion)}
          style={{ left, width, top, height, lineHeight: `${height}px`, color: tone.text, opacity: faded ? 0.85 : 1 }}>
          <span className="rounded-[3px] px-0.5 box-decoration-clone" style={{ background: tone.bar }}>{label}</span>
        </div>
      )}
      {!fits && labelMode === "auto" && (
        <span className={cx("pointer-events-none absolute whitespace-nowrap text-xs text-stone-500", motion)} style={{ left: left + width + 6, top, lineHeight: `${height}px` }}>{label}</span>
      )}
    </>
  );
}
