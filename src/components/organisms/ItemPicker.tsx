"use client";

// Menus d'édition d'un Item, ouverts au clic sur une valeur ou au clavier (S, A, E, M).
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Plus } from "lucide-react";
import { toIso, fmtDay, type Item, type Plan, type Status } from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { cx } from "@/lib/cx";
import type { PickKind } from "./Timeline";
import { Avatar, Diamond, Kbd, StatusIcon } from "../atoms";
import { MenuCheckboxItem, MenuContent, MenuEmpty, MenuHeader, MenuItem, MenuRadioItem, MenuSeparator, PopoverContent } from "../molecules";
import { STATUS } from "../tokens";

export type PickerState = { kind: PickKind; ids: string[]; anchor: Element } | null;

export function ItemPicker({ state, data, plan, store, onClose, onManageTeam }: {
  state: PickerState; data: Data; plan: Plan; store: Store; onClose: () => void; onManageTeam: () => void;
}) {
  if (!state) return null;
  const items = data.items.filter((i) => state.ids.includes(i.id));
  const common = <K extends keyof Item>(k: K) => (items.every((i) => i[k] === items[0]?.[k]) ? items[0]?.[k] : undefined);

  if (state.kind === "estimate") return <EstimatePopover state={state} items={items} store={store} onClose={onClose} />;

  const menu = (children: React.ReactNode, onKeyDown?: (e: React.KeyboardEvent) => void) => (
    <Menu.Root open onOpenChange={(o) => !o && onClose()}>
      <MenuContent anchor={state.anchor} className="w-[272px]" onKeyDown={onKeyDown}>{children}</MenuContent>
    </Menu.Root>
  );

  if (state.kind === "status") {
    const set = (v: Status) => { store.updateItems(state.ids, { status: v }); onClose(); };
    return menu(
      <>
        <MenuHeader label="Changer le statut…" kbd="S" />
        <Menu.RadioGroup value={common("status") ?? ""} onValueChange={(v) => set(v as Status)}>
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <MenuRadioItem key={s} value={s} kbd={STATUS[s].key}><StatusIcon status={s} />{STATUS[s].label}</MenuRadioItem>
          ))}
        </Menu.RadioGroup>
      </>,
      (e) => {
        const s = (Object.keys(STATUS) as Status[]).find((k) => STATUS[k].key === e.key);
        if (s) { e.preventDefault(); set(s); }
      },
    );
  }

  if (state.kind === "owners") {
    const toggle = (pid: string, on: boolean) => {
      for (const it of items) {
        const ids = on ? [...new Set([...it.owner_ids, pid])] : it.owner_ids.filter((o) => o !== pid);
        store.updateItems([it.id], { owner_ids: ids });
      }
    };
    return menu(
      <>
        <MenuHeader label="Owners" kbd="A" />
        {data.people.map((p) => {
          const free = plan.freeFrom.get(p.id);
          return (
            <MenuCheckboxItem key={p.id} checked={items.every((i) => i.owner_ids.includes(p.id))} onCheckedChange={(c) => toggle(p.id, c)}
              trailing={<span className="text-xs text-stone-400">{Number(p.capacity) < 1 ? `${Math.round(p.capacity * 100)} % · ` : ""}{free ? `libre le ${fmtDay(toIso(free))}` : "libre"}</span>}>
              <Avatar person={p} /><span className="truncate">{p.name}</span>
            </MenuCheckboxItem>
          );
        })}
        {!data.people.length && <MenuEmpty>Personne dans l&apos;équipe pour l&apos;instant.</MenuEmpty>}
        <MenuSeparator />
        <MenuItem icon={<Plus size={14} />} onClick={onManageTeam}><span className="text-stone-500">Ajouter une personne</span></MenuItem>
      </>,
    );
  }

  const milestones = data.items.filter((i) => i.type === "milestone").sort((a, b) => (a.milestone_date ?? "").localeCompare(b.milestone_date ?? ""));
  return menu(
    <>
      <MenuHeader label="Jalon cible" kbd="M" />
      <Menu.RadioGroup value={common("target_id") ?? "none"}
        onValueChange={(v) => { store.updateItems(state.ids, { target_id: v === "none" ? null : (v as string) }); onClose(); }}>
        <MenuRadioItem value="none"><span className="size-2.5" /><span className="text-stone-500">Aucun jalon</span></MenuRadioItem>
        {milestones.map((m) => (
          <MenuRadioItem key={m.id} value={m.id} trailing={<span className="text-xs text-stone-400">{m.milestone_date ? fmtDay(m.milestone_date) : ""}</span>}>
            <Diamond /><span className="truncate">{m.title || "Sans titre"}</span>
          </MenuRadioItem>
        ))}
      </Menu.RadioGroup>
      {!milestones.length && <MenuEmpty>Créez des jalons depuis la vue Jalons.</MenuEmpty>}
    </>,
  );
}

function EstimatePopover({ state, items, store, onClose }: { state: NonNullable<PickerState>; items: Item[]; store: Store; onClose: () => void }) {
  const start = items.length === 1 ? String(Number(items[0].estimate_jh)) : "";
  const [value, setValue] = useState(start);
  const save = (v: string) => {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n) && n >= 0) store.updateItems(state.ids, { estimate_jh: n });
    onClose();
  };
  return (
    <Popover.Root open onOpenChange={(o) => !o && onClose()}>
      <PopoverContent anchor={state.anchor} align="end" className="w-[272px] p-3">
        <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); save(value); }}>
          <label htmlFor="estimate" className="flex items-center text-xs text-stone-500">Estimation<span className="flex-1" /><Kbd>E</Kbd></label>
          <div className="flex h-9 items-center gap-2 rounded-[7px] border border-accent-500 px-2.5 ring-[3px] ring-accent-100">
            <input id="estimate" autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="w-16 bg-transparent text-[15px] font-medium tabular-nums outline-none" />
            <span className="flex-1 text-right text-stone-400">jours-homme</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["0,5", "1", "2", "3", "5", "8", "13"].map((v) => (
              <button type="button" key={v} onClick={() => save(v)}
                className={cx("h-[26px] min-w-[34px] rounded-md border px-2 text-xs tabular-nums transition-colors duration-100", v === value ? "border-accent-500 bg-accent-50 text-accent-800" : "border-stone-200 hover:bg-stone-50")}>
                {v}
              </button>
            ))}
          </div>
        </form>
      </PopoverContent>
    </Popover.Root>
  );
}
