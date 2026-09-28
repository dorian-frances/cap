"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Panneau latéral droit (détail d'un item, fiche personne). Glisse à l'ouverture ;
 * `closing` joue la sortie (voir usePresence).
 * Bord gauche : glisser (ou flèches) pour l'élargir, double-clic = largeur par défaut ; mémorisé sur ce navigateur.
 */
export function SidePanel({ label, closing, width: initial = 440, header, footer, children }: {
  label: string; closing?: boolean; width?: number; header: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  const key = `cap:panel:${label}`;
  const [width, setWidth] = useState(() => { try { return Number(localStorage.getItem(key)) || initial; } catch { return initial; } });
  const clamp = (w: number) => setWidth(Math.round(Math.min(innerWidth - 320, Math.max(initial, w))));
  useEffect(() => { try { localStorage.setItem(key, String(width)); } catch {} }, [key, width]);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = width;
    const move = (ev: PointerEvent) => clamp(w0 + x0 - ev.clientX);
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
  };
  return (
    <aside data-side-panel aria-label={label} style={{ width }} className={cx(
      "absolute bottom-0 right-0 top-0 z-30 flex max-w-full flex-col border-l border-stone-200 bg-surface shadow-panel",
      "transition-[translate,opacity] duration-250 ease-out-quint starting:translate-x-8 starting:opacity-0",
      closing && "pointer-events-none translate-x-8 opacity-0 duration-200",
    )}>
      <div role="separator" aria-orientation="vertical" aria-label="Largeur du panneau" aria-valuenow={width} tabIndex={0}
        title="Glisser pour élargir · double-clic : largeur par défaut"
        onPointerDown={startResize} onDoubleClick={() => setWidth(initial)}
        onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); clamp(width + (e.key === "ArrowLeft" ? 80 : -80)); } }}
        className="group absolute -left-1.5 top-0 z-10 flex h-full w-3 cursor-col-resize justify-center outline-none">
        <span className="h-full w-0.5 rounded-full transition-colors duration-150 group-hover:bg-accent-400 group-focus-visible:bg-accent-500" />
      </div>
      <div className="flex h-11 shrink-0 items-center gap-1.5 pl-5 pr-3 text-xs text-stone-500">{header}</div>
      {children}
      {footer && <div className="flex h-10 shrink-0 items-center gap-3 border-t border-stone-100 px-5 text-xs text-stone-400">{footer}</div>}
    </aside>
  );
}

/** Corps défilant d'un panneau ; `contentKey` fait un fondu quand le contenu change. */
export function SidePanelBody({ contentKey, children }: { contentKey?: string; children: ReactNode }) {
  return <div key={contentKey} className="flex min-h-0 flex-1 animate-fade-in flex-col gap-5 overflow-y-auto px-6 pb-6 pt-2">{children}</div>;
}

export const SectionTitle = ({ children }: { children: ReactNode }) => <h3 className="text-xs font-medium text-stone-500">{children}</h3>;
