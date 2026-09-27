"use client";

import { X } from "lucide-react";
import { usePresence } from "@/lib/usePresence";
import { cx } from "@/lib/cx";
import { Kbd } from "../atoms";
import type { PickKind } from "./Timeline";

const ACTIONS: [PickKind, string, string][] = [["status", "Statut", "S"], ["owners", "Assigner", "A"], ["estimate", "Estimation", "E"], ["milestone", "Jalon", "M"]];
const btn = "flex h-7 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-100 hover:bg-stone-800";

/** Barre flottante des actions groupées, visible dès 2 items sélectionnés. */
export default function BulkActionBar({ count, onPick, onDelete, onClear }: {
  count: number; onPick: (kind: PickKind, anchor: Element) => void; onDelete: () => void; onClear: () => void;
}) {
  const [shown, closing] = usePresence(count > 1 ? count : null, 160);
  if (!shown) return null;
  return (
    <div role="toolbar" aria-label="Actions groupées" className={cx(
      "absolute bottom-5 left-1/2 z-40 flex h-10 -translate-x-1/2 items-center gap-0.5 rounded-[9px] bg-stone-900 pl-3.5 pr-1.5 text-[13px] text-stone-100 shadow-dialog",
      "transition-[opacity,translate] duration-250 ease-out-quint starting:translate-y-3 starting:opacity-0",
      closing && "pointer-events-none translate-y-3 opacity-0",
    )}>
      <span className="mr-2 font-medium tabular-nums">{shown} sélectionnés</span>
      <span className="h-[18px] w-px bg-stone-700" />
      {ACTIONS.map(([k, l, key]) => (
        <button key={k} onClick={(e) => onPick(k, e.currentTarget)} className={btn}>{l}<Kbd tone="dark">{key}</Kbd></button>
      ))}
      <button onClick={onDelete} className={cx(btn, "text-red-300")}>Supprimer</button>
      <button aria-label="Désélectionner" onClick={onClear} className={cx(btn, "w-7 justify-center px-0")}><X size={14} /></button>
    </div>
  );
}
