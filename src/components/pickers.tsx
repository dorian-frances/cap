"use client";

// Menus d'édition d'un Item, ouverts au clic sur une valeur ou au clavier (S, A, E, M).
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Check, Plus } from "lucide-react";
import { toIso, type Item, type Plan, type Status } from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import type { PickKind } from "./Timeline";
import { Avatar, Diamond, Kbd, STATUS, StatusIcon, fmtDay, itemCls, popupCls } from "./ui";

export type PickerState = { kind: PickKind; ids: string[]; anchor: Element } | null;

const Header = ({ label, k }: { label: string; k: string }) => (
  <div className="mb-1 flex h-8 items-center gap-2 border-b border-stone-100 px-2.5 text-stone-400">
    {label}<span className="flex-1" /><Kbd>{k}</Kbd>
  </div>
);

export function Picker({ state, data, plan, store, onClose, onManageTeam }: {
  state: PickerState; data: Data; plan: Plan; store: Store; onClose: () => void; onManageTeam: () => void;
}) {
  if (!state) return null;
  const items = data.items.filter((i) => state.ids.includes(i.id));
  const common = <K extends keyof Item>(k: K) => (items.every((i) => i[k] === items[0]?.[k]) ? items[0]?.[k] : undefined);

  if (state.kind === "estimate") return <EstimatePopover state={state} items={items} store={store} onClose={onClose} />;

  const menu = (children: React.ReactNode, onKeyDown?: (e: React.KeyboardEvent) => void) => (
    <Menu.Root open onOpenChange={(o) => !o && onClose()}>
      <Menu.Portal>
        <Menu.Positioner anchor={state.anchor} align="start" sideOffset={6} className="z-50">
          <Menu.Popup className={`${popupCls} w-[272px]`} onKeyDown={onKeyDown}>{children}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );

  if (state.kind === "status") {
    const set = (v: Status) => { store.updateItems(state.ids, { status: v }); onClose(); };
    return menu(
      <>
        <Header label="Changer le statut…" k="S" />
        <Menu.RadioGroup value={common("status") ?? ""} onValueChange={(v) => set(v as Status)}>
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <Menu.RadioItem key={s} value={s} className={itemCls} closeOnClick>
              <StatusIcon status={s} /><span className="flex-1">{STATUS[s].label}</span>
              <Menu.RadioItemIndicator><Check size={14} className="text-indigo-600" /></Menu.RadioItemIndicator>
              <Kbd>{STATUS[s].key}</Kbd>
            </Menu.RadioItem>
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
        <Header label="Owners" k="A" />
        {data.people.map((p) => {
          const free = plan.freeFrom.get(p.id);
          return (
            <Menu.CheckboxItem key={p.id} className={`group ${itemCls}`} closeOnClick={false}
              checked={items.every((i) => i.owner_ids.includes(p.id))} onCheckedChange={(c) => toggle(p.id, c)}>
              <span className="flex size-3.5 items-center justify-center rounded border border-stone-300 group-data-[checked]:border-indigo-600 group-data-[checked]:bg-indigo-600">
                <Menu.CheckboxItemIndicator><Check size={10} strokeWidth={3} className="text-white" /></Menu.CheckboxItemIndicator>
              </span>
              <Avatar person={p} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-xs text-stone-400">
                {Number(p.capacity) < 1 ? `${Math.round(p.capacity * 100)} % · ` : ""}{free ? `libre le ${fmtDay(toIso(free))}` : "libre"}
              </span>
            </Menu.CheckboxItem>
          );
        })}
        {!data.people.length && <div className="px-2.5 py-2 text-stone-500">Personne dans l&apos;équipe pour l&apos;instant.</div>}
        <Menu.Separator className="mx-1.5 my-1 h-px bg-stone-100" />
        <Menu.Item className={`${itemCls} text-stone-500`} onClick={onManageTeam}><Plus size={14} />Ajouter une personne</Menu.Item>
      </>,
    );
  }

  const milestones = data.items.filter((i) => i.type === "milestone").sort((a, b) => (a.milestone_date ?? "").localeCompare(b.milestone_date ?? ""));
  return menu(
    <>
      <Header label="Jalon cible" k="M" />
      <Menu.RadioGroup value={common("target_id") ?? "none"}
        onValueChange={(v) => { store.updateItems(state.ids, { target_id: v === "none" ? null : (v as string) }); onClose(); }}>
        <Menu.RadioItem value="none" className={itemCls} closeOnClick>
          <span className="size-2.5" /><span className="flex-1 text-stone-500">Aucun jalon</span>
          <Menu.RadioItemIndicator><Check size={14} className="text-indigo-600" /></Menu.RadioItemIndicator>
        </Menu.RadioItem>
        {milestones.map((m) => (
          <Menu.RadioItem key={m.id} value={m.id} className={itemCls} closeOnClick>
            <Diamond /><span className="min-w-0 flex-1 truncate">{m.title || "Sans titre"}</span>
            <span className="text-xs text-stone-400">{m.milestone_date ? fmtDay(m.milestone_date) : ""}</span>
            <Menu.RadioItemIndicator><Check size={14} className="text-indigo-600" /></Menu.RadioItemIndicator>
          </Menu.RadioItem>
        ))}
      </Menu.RadioGroup>
      {!milestones.length && <div className="px-2.5 py-2 text-xs text-stone-500">Créez des jalons depuis la vue Jalons.</div>}
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
      <Popover.Portal>
        <Popover.Positioner anchor={state.anchor} align="end" sideOffset={6} className="z-50">
          <Popover.Popup className={`${popupCls} w-[272px] p-3`}>
            <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); save(value); }}>
              <label htmlFor="estimate" className="flex items-center text-xs text-stone-500">Estimation<span className="flex-1" /><Kbd>E</Kbd></label>
              <div className="flex h-9 items-center gap-2 rounded-[7px] border border-indigo-500 px-2.5 ring-[3px] ring-indigo-100">
                <input id="estimate" autoFocus inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-16 bg-transparent text-[15px] font-medium tabular-nums outline-none" />
                <span className="flex-1 text-right text-stone-400">jours-homme</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {["0,5", "1", "2", "3", "5", "8", "13"].map((v) => (
                  <button type="button" key={v} onClick={() => save(v)}
                    className={`h-[26px] min-w-[34px] rounded-md border px-2 text-xs tabular-nums ${v === value ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-stone-200 hover:bg-stone-50"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
