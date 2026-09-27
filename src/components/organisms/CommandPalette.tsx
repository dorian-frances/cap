"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { cx } from "@/lib/cx";
import { Kbd } from "../atoms";
import { backdropCls, dialogMotion } from "../molecules";

export type Command = { id: string; group: string; label: string; keys?: string[]; keywords?: string; icon?: React.ReactNode; run: () => void };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function CommandPalette({ open, onOpenChange, commands, context }: {
  open: boolean; onOpenChange: (o: boolean) => void; commands: Command[]; context?: string;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const words = norm(q).split(/\s+/).filter(Boolean);
  const list = commands.filter((c) => words.every((w) => norm(`${c.label} ${c.keywords ?? ""} ${c.group}`).includes(w))).slice(0, 40);
  const run = (c: Command | undefined) => { if (!c) return; onOpenChange(false); setQ(""); setTimeout(c.run, 0); };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(""); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={cx(backdropCls, "bg-black/15")} />
        <Dialog.Popup aria-label="Palette de commandes"
          className={cx("fixed left-1/2 top-[14vh] z-50 flex max-h-[70vh] w-[min(580px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-stone-200 bg-surface shadow-dialog outline-none", dialogMotion)}>
          <div className="flex h-[50px] shrink-0 items-center gap-2.5 border-b border-stone-100 px-4">
            {context && <span className="max-w-[160px] truncate rounded-[5px] bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{context}</span>}
            <input autoFocus value={q} placeholder="Tapez une commande ou cherchez un item…" aria-label="Commande"
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); run(list[active]); }
              }}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-400" />
          </div>
          <div role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {list.map((c, i) => {
              const head = i === 0 || list[i - 1].group !== c.group ? c.group : null;
              return (
                <div key={c.id}>
                  {head && <div className="px-4 pb-1 pt-2.5 text-[11px] text-stone-400">{head}</div>}
                  <div role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => run(c)}
                    ref={(el) => { if (i === active) el?.scrollIntoView({ block: "nearest" }); }}
                    className={cx("mx-1.5 flex h-[34px] cursor-default items-center gap-2.5 rounded-[7px] px-3 text-[13px]", i === active && "bg-stone-100")}>
                    {c.icon && <span className="text-stone-500">{c.icon}</span>}
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.keys?.map((k) => <Kbd key={k}>{k}</Kbd>)}
                  </div>
                </div>
              );
            })}
            {!list.length && <div className="px-4 py-6 text-center text-[13px] text-stone-500">Aucun résultat pour « {q} »</div>}
          </div>
          <div className="flex h-9 shrink-0 items-center gap-3.5 border-t border-stone-100 px-4 text-xs text-stone-400">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> naviguer</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> valider</span>
            <span className="flex items-center gap-1"><Kbd>Échap</Kbd> fermer</span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
