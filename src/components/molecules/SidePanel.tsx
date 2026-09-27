import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Panneau latéral droit (détail d'un item, fiche personne). Glisse à l'ouverture ;
 * `closing` joue la sortie (voir usePresence).
 */
export function SidePanel({ label, closing, width = 440, header, footer, children }: {
  label: string; closing?: boolean; width?: number; header: ReactNode; footer?: ReactNode; children: ReactNode;
}) {
  return (
    <aside data-side-panel aria-label={label} style={{ width }} className={cx(
      "absolute bottom-0 right-0 top-0 z-30 flex max-w-full flex-col border-l border-stone-200 bg-surface shadow-panel",
      "transition-[translate,opacity] duration-250 ease-out-quint starting:translate-x-8 starting:opacity-0",
      closing && "pointer-events-none translate-x-8 opacity-0 duration-200",
    )}>
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
