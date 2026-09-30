"use client";

// Menus d'édition d'un Item, ouverts au clic sur une valeur ou au clavier (S, A, E, M).
import { useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Plus } from "lucide-react";
import { isWeekend, planCapacity, startBefore, workJh, toDay, toIso, todayIso, fmtDay, type Item, type Plan, type Status, type Tag } from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { cx } from "@/lib/cx";
import type { PickKind } from "./Timeline";
import { Avatar, Button, Diamond, Kbd, StatusIcon } from "../atoms";
import { Calendar, MenuCheckboxItem, MenuContent, MenuEmpty, MenuHeader, MenuItem, MenuRadioItem, MenuSeparator, PopoverContent } from "../molecules";
import { STATUS, TAGS } from "../tokens";

export type PickerState = { kind: PickKind; ids: string[]; anchor: Element } | null;

/**
 * `onClose(kind)` ne ferme que si le sélecteur affiché est encore celui-là : passer du statut
 * à sa date (`onStep`) ferme le menu sans fermer l'étape suivante.
 */
export function ItemPicker({ state, data, plan, store, me, onClose: close, onStep, onManageTeam }: {
  state: PickerState; data: Data; plan: Plan; store: Store; me: string; onClose: (kind: PickKind) => void; onStep: (kind: "start" | "done") => void; onManageTeam: () => void;
}) {
  if (!state) return null;
  const onClose = () => close(state.kind);
  const items = data.items.filter((i) => state.ids.includes(i.id));
  const common = <K extends keyof Item>(k: K) => (items.every((i) => i[k] === items[0]?.[k]) ? items[0]?.[k] : undefined);

  if (state.kind === "estimate") return <EstimatePopover state={state} items={items} store={store} onClose={onClose} />;
  if (state.kind === "tags") return <TagPopover state={state} items={items} store={store} me={me} onClose={onClose} />;
  if (state.kind === "extra") return <AvenantPopover state={state} items={items} store={store} onClose={onClose} />;
  if (state.kind === "start" || state.kind === "done") return <DateStep kind={state.kind} state={state} items={items} data={data} plan={plan} store={store} onClose={onClose} />;

  // Le focus ne revient pas à l'ancre : sinon il serait repris au sélecteur suivant (raccourcis enchaînés, étape de date).
  const menu = (children: React.ReactNode, onKeyDown?: (e: React.KeyboardEvent) => void) => (
    <Menu.Root open onOpenChange={(o) => !o && onClose()}>
      <MenuContent anchor={state.anchor} className="w-[272px]" onKeyDown={onKeyDown} finalFocus={false}>{children}</MenuContent>
    </Menu.Root>
  );

  if (state.kind === "status") {
    // « À faire » s'applique tout de suite ; « En cours » et « Terminé » demandent une date.
    const set = (v: Status) => {
      if (v === "todo") { store.updateItems(state.ids, { status: "todo", started_on: null, done_on: null }); onClose(); }
      else onStep(v === "doing" ? "start" : "done");
    };
    return menu(
      <>
        <MenuHeader label="Changer le statut…" kbd="S" />
        <Menu.RadioGroup value={common("status") ?? ""} onValueChange={(v) => set(v as Status)}>
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <MenuRadioItem key={s} value={s} kbd={STATUS[s].key}
              trailing={s !== "todo" && <span className="text-xs text-stone-400">{s === "doing" ? "depuis le…" : "le…"}</span>}>
              <StatusIcon status={s} />{STATUS[s].label}
            </MenuRadioItem>
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
              trailing={<span className="text-xs text-stone-400">{planCapacity(p) < 1 ? `${Math.round(planCapacity(p) * 100)} % dispo · ` : ""}{free ? `libre le ${fmtDay(toIso(free))}` : "libre"}</span>}>
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

const prevWorkday = (iso: string) => { let d = toDay(iso) - 1; while (isWeekend(d)) d--; return toIso(d); };

/** Date de démarrage ou de fin d'une ou plusieurs tâches (aujourd'hui par défaut, modifiable a posteriori). */
function DateStep({ kind, state, items, data, plan, store, onClose }: {
  kind: "start" | "done"; state: NonNullable<PickerState>; items: Item[]; data: Data; plan: Plan; store: Store; onClose: () => void;
}) {
  const cal = useRef<HTMLDivElement>(null);
  const today = todayIso();
  const current = items.length === 1 ? (kind === "start" ? items[0].started_on : items[0].done_on) : null;
  const apply = (iso: string) => {
    for (const it of items) {
      if (kind === "done") {
        // Sans date de début : celle du calcul si la tâche était déjà en cours, sinon déduite de l'estimation.
        const computed = plan.spans.get(it.id)?.start;
        const owners = data.people.filter((p) => it.owner_ids.includes(p.id));
        const began = it.started_on
          ?? (it.status === "doing" && computed && computed <= iso ? computed : startBefore(iso, workJh(it), owners, data.absences));
        store.updateItems([it.id], { status: "done", done_on: iso, started_on: began > iso ? iso : began });
      } else if (it.status === "done") {
        store.updateItems([it.id], { started_on: it.done_on && iso > it.done_on ? it.done_on : iso });
      } else {
        store.updateItems([it.id], { status: "doing", started_on: iso, done_on: null });
      }
    }
    onClose();
  };
  const chip = "h-6 rounded-md border border-stone-200 px-2 text-xs text-stone-600 transition-colors duration-150 hover:border-stone-300 hover:bg-stone-50";
  return (
    <Popover.Root open onOpenChange={(o) => !o && onClose()}>
      <PopoverContent anchor={state.anchor} finalFocus={false} initialFocus={() => cal.current?.querySelector<HTMLElement>('[data-day][tabindex="0"]') ?? true} className="min-w-0 p-2.5">
        <div className="mb-2 flex items-center gap-2 px-1.5 text-xs text-stone-500">
          <StatusIcon status={kind === "start" ? "doing" : "done"} size={12} />
          {kind === "start" ? "En cours depuis le…" : "Terminé le…"}
          <span className="flex-1" /><Kbd>↵</Kbd>
        </div>
        <div ref={cal}><Calendar start={current ?? today} end={current ?? today} onPick={apply} /></div>
        {kind === "done" && items.some((i) => !i.started_on) && (
          <p className="mt-1.5 max-w-[252px] px-1.5 text-[11px] leading-snug text-stone-400">Sans date de début, elle est déduite de l&apos;estimation ; modifiable ensuite depuis le panneau.</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 border-t border-stone-100 pt-2.5">
          <button type="button" className={chip} onClick={() => apply(today)}>Aujourd&apos;hui</button>
          <button type="button" className={chip} onClick={() => apply(prevWorkday(today))}>Veille ouvrée</button>
        </div>
      </PopoverContent>
    </Popover.Root>
  );
}

/** Pose d'un tag, avec sa raison, sur un ou plusieurs items (plusieurs tags d'une même catégorie possibles, chacun avec sa raison). */
function TagPopover({ state, items, store, me, onClose }: { state: NonNullable<PickerState>; items: Item[]; store: Store; me: string; onClose: () => void }) {
  const [tag, setTag] = useState<Tag | null>("risk");
  const [reason, setReason] = useState("");
  const save = () => {
    if (!tag || !reason.trim()) return;
    for (const it of items) {
      store.updateItems([it.id], { tag_log: [...(it.tag_log ?? []), { id: crypto.randomUUID(), tag, reason: reason.trim(), on: todayIso(), by: me }] });
    }
    onClose();
  };
  return (
    <Popover.Root open onOpenChange={(o) => !o && onClose()}>
      <PopoverContent anchor={state.anchor} align="end" finalFocus={false} className="w-[300px] p-3">
        <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <span className="text-xs text-stone-500">Poser un tag</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(TAGS) as Tag[]).map((t) => {
              const { label, hint, Icon, cls } = TAGS[t];
              return (
                <button type="button" key={t} onClick={() => setTag(t)} title={hint}
                  className={cx("flex h-[26px] items-center gap-1.5 rounded-md border px-2 text-xs transition-colors duration-100", t === tag ? "border-accent-500 bg-accent-50 text-accent-800" : "border-stone-200 hover:bg-stone-50")}>
                  <span className={cx("flex size-4 items-center justify-center rounded-[4px]", cls)}><Icon size={10} strokeWidth={2.5} /></span>{label}
                </button>
              );
            })}
          </div>
          <input aria-label="Raison" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison (ex. attend la validation de l'API client)"
            className="h-8 rounded-[7px] border border-stone-200 px-2.5 text-[13px] outline-none transition-shadow focus:border-accent-500 focus:ring-[3px] focus:ring-accent-100" />
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="primary" disabled={!tag || !reason.trim()}>Poser le tag</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover.Root>
  );
}

/** Avenant : retard anticipé en JH, avec son motif. La fin prévue reste celle de l'estimation. */
function AvenantPopover({ state, items, store, onClose }: { state: NonNullable<PickerState>; items: Item[]; store: Store; onClose: () => void }) {
  const one = items.length === 1 ? items[0] : null;
  const [value, setValue] = useState(one && Number(one.extra_jh) ? String(Number(one.extra_jh)).replace(".", ",") : "");
  const [note, setNote] = useState(one?.extra_note ?? "");
  const save = (v: string) => {
    const n = Number(v.replace(",", ".") || 0);
    if (Number.isFinite(n) && n >= 0) store.updateItems(state.ids, { extra_jh: n, extra_note: n ? note.trim() : "" });
    onClose();
  };
  return (
    <Popover.Root open onOpenChange={(o) => !o && onClose()}>
      <PopoverContent anchor={state.anchor} align="end" finalFocus={false} className="w-[300px] p-3">
        <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); save(value); }}>
          <label htmlFor="extra" className="text-xs text-stone-500">Avenant : retard anticipé</label>
          <div className="flex h-9 items-center gap-2 rounded-[7px] border border-accent-500 px-2.5 ring-[3px] ring-accent-100">
            <span className="text-[15px] font-medium text-amber-700">+</span>
            <input id="extra" autoFocus inputMode="decimal" value={value} placeholder="0" onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="w-16 bg-transparent text-[15px] font-medium tabular-nums outline-none" />
            <span className="flex-1 text-right text-stone-400">jours-homme</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {["0,5", "1", "2", "3", "5"].map((v) => (
              <button type="button" key={v} onClick={() => setValue(v)}
                className={cx("h-[26px] min-w-[34px] rounded-md border px-2 text-xs tabular-nums transition-colors duration-100", v === value ? "border-accent-500 bg-accent-50 text-accent-800" : "border-stone-200 hover:bg-stone-50")}>
                +{v}
              </button>
            ))}
          </div>
          <input aria-label="Motif de l'avenant" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif (ex. dépendance API en retard)"
            className="h-8 rounded-[7px] border border-stone-200 px-2.5 text-[13px] outline-none transition-shadow focus:border-accent-500 focus:ring-[3px] focus:ring-accent-100" />
          <p className="text-xs text-stone-400">S&apos;ajoute à l&apos;estimation : la tâche occupe ses owners plus longtemps et la suite glisse. La fin prévue ne change pas, le retard se voit en hachures.</p>
          <div className="flex justify-end gap-1.5">
            {one && Number(one.extra_jh) > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => save("0")}>Retirer</Button>}
            <Button type="submit" size="sm" variant="primary">Appliquer</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover.Root>
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
      <PopoverContent anchor={state.anchor} align="end" finalFocus={false} className="w-[272px] p-3">
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
