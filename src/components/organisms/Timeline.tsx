"use client";

import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { GripVertical, Pause, Plus, TriangleAlert } from "lucide-react";
import {
  activeTags, openTags, allocationOn, itemOverload, pauses, pctLabel, workJh, lateBy, isLate, targetsOf, overdue, slip, todayIso, totalJh, unplannedReason, fmtDay,
  type Item, type Person, type Plan, type Row, type Tag,
} from "@/lib/plan";
import type { Axis } from "@/lib/axis";
import { cx } from "@/lib/cx";
import { AvatarStack, AxisHeader, AxisLines, GanttBar, weekendBg } from "../molecules";
import { Chevron, StatusIcon } from "../atoms";
import { STATUS, TAGS, personColor } from "../tokens";

// start / done : date de démarrage ou de fin, demandée après le choix du statut.
// extra : avenant (retard anticipé en JH).
export type PickKind = "status" | "owners" | "estimate" | "extra" | "milestone" | "start" | "done" | "tags";
export const LEFT = 380; // largeur par défaut de la colonne des titres, redimensionnable

type Props = {
  items: Item[];
  people: Person[];
  plan: Plan;
  rows: Row[];
  unplanned: Row[]; // groupe « À planifier »
  groupOpen: boolean;
  onToggleGroup: () => void;
  ax: Axis;
  colorBy: "status" | "owner";
  flat?: boolean; // vue par date de début : lignes à plat (chemin du parent affiché), pas de glisser-déposer
  selected: Set<string>;
  renaming: string | null;
  collapsed: Set<string>;
  scrollRef: RefObject<HTMLDivElement | null>;
  header: ReactNode;
  footer?: ReactNode;
  onRowClick: (id: string, e: React.MouseEvent) => void;
  onContext: (id: string) => void;
  onPick: (kind: PickKind, id: string, anchor: Element) => void;
  onRename: (id: string, title: string | null) => void;
  onStartRename: (id: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onDrop: (dragId: string, targetId: string, where: "before" | "after") => void;
};

// Parent, replié ou déplié : barre pleine comme un item, en gris foncé pour le distinguer.
const PARENT = { bar: "var(--color-stone-500)", border: "transparent", text: "var(--color-surface)" };

const cellBtn = "flex h-6 shrink-0 items-center rounded px-1 transition-colors duration-100 hover:bg-stone-200/70";

export default function Timeline({ scrollRef, ...p }: Props) {
  const { items, people, plan, ax } = p;
  const [drop, setDrop] = useState<{ id: string; where: "before" | "after" } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const milestones = items.filter((i) => i.type === "milestone");
  // Colonne des titres : largeur réglable (glisser, flèches, double-clic = défaut), mémorisée sur ce navigateur.
  const [left, setLeft] = useState(() => { try { return Number(localStorage.getItem("cap:left")) || LEFT; } catch { return LEFT; } });
  const clampLeft = (w: number) => setLeft(Math.round(Math.min(760, Math.max(280, w))));
  useEffect(() => { try { localStorage.setItem("cap:left", String(left)); } catch {} }, [left]);
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = left;
    const move = (ev: PointerEvent) => clampLeft(w0 + ev.clientX - x0);
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
    document.body.style.cursor = "col-resize";
  };

  const bar = (item: Item, hasChildren: boolean, selected: boolean) => {
    const span = plan.spans.get(item.id)!;
    const title = `${item.title || "Sans titre"} · ${fmtDay(span.start)} → ${fmtDay(span.end)} · ${totalJh(items, item.id)} j`;
    if (hasChildren) return <GanttBar ax={ax} span={span} label={item.title || "Sans titre"} tone={PARENT} top={6} height={20} selected={selected} title={title} />;
    const owner = p.colorBy === "owner" ? people.find((o) => o.id === item.owner_ids[0]) : undefined;
    const tone = owner
      ? { bar: personColor(owner)[0], border: "color-mix(in srgb, currentColor 10%, transparent)", text: personColor(owner)[1] }
      : STATUS[item.status];
    const late = lateBy(item, span, items) > 0;
    return (
      <GanttBar ax={ax} span={span} label={item.title || "Sans titre"} tone={tone} top={6} height={20} selected={selected}
        faded={item.status === "done"} title={title} pauses={pauses(item, span)} lateFrom={late ? targetsOf(item, items)[0].milestone_date : null} />
    );
  };

  const pathOf = (it: Item): string => {
    const parent = items.find((i) => i.id === it.parent_id);
    return parent ? `${pathOf(parent)}${parent.title || "Sans titre"} › ` : "";
  };

  const rowEl = ({ item, depth, hasChildren }: Row, inGroup = false) => {
    const sel = p.selected.has(item.id);
    const span = plan.spans.get(item.id);
    const late = hasChildren ? isLate(item, plan, items) : lateBy(item, span, items) > 0;
    const owners = people.filter((o) => item.owner_ids.includes(o.id));
    const over = hasChildren || item.status === "done" ? [] : [...itemOverload(plan, item)].map(([id, ov]) => ({ o: people.find((x) => x.id === id), ov }));
    const ring = sel ? "var(--color-accent-50)" : "var(--color-surface)";
    // Liseré à gauche de la couleur du tag actif le plus grave (un parent déplié ne reprend pas ceux de ses sous-items, visibles en dessous).
    const tags = hasChildren && !p.collapsed.has(item.id) ? openTags(item) : activeTags(items, item.id);
    const tag = (Object.keys(TAGS) as Tag[]).find((t) => tags.some((e) => e.tag === t));
    const hint = drop?.id === item.id ? (drop.where === "before" ? "shadow-[inset_0_2px_0_var(--color-accent-600)]" : "shadow-[inset_0_-2px_0_var(--color-accent-600)]") : "";
    return (
      <div key={inGroup ? `u-${item.id}` : item.id} data-row={item.id} role="row" aria-selected={sel}
        className={cx("group flex h-8 select-none transition-[background-color,opacity] duration-150 starting:opacity-0", sel ? "bg-accent-50/70" : "hover:bg-stone-50", hint, dragId === item.id && "opacity-50")}
        onClick={(e) => p.onRowClick(item.id, e)}
        onContextMenu={() => p.onContext(item.id)}
        onDragOver={(e) => {
          if (p.flat || !dragId || dragId === item.id) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          setDrop({ id: item.id, where: e.clientY < r.top + r.height / 2 ? "before" : "after" });
        }}
        onDragLeave={() => setDrop((d) => (d?.id === item.id ? null : d))}
        onDrop={(e) => { e.preventDefault(); if (dragId && drop) p.onDrop(dragId, drop.id, drop.where); setDrop(null); setDragId(null); }}>
        <div className={cx("sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-stone-100 pr-3 transition-colors duration-150", sel ? "bg-accent-50" : "bg-surface group-hover:bg-stone-50")}
          style={{ width: "var(--left)", boxShadow: tag ? `inset 3px 0 0 ${TAGS[tag].tone}` : undefined }}>
          <span draggable={!p.flat} aria-label="Déplacer" title="Glisser pour réordonner"
            onDragStart={(e) => { setDragId(item.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); }}
            onDragEnd={() => { setDragId(null); setDrop(null); }}
            className={cx("flex w-7 shrink-0 cursor-grab justify-center text-stone-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-coarse:opacity-40", p.flat && "invisible")}>
            <GripVertical size={14} />
          </span>
          <span className="shrink-0" style={{ width: depth * 18 }} />
          {hasChildren ? (
            <button aria-label={p.collapsed.has(item.id) ? "Déplier" : "Replier"} onClick={(e) => { e.stopPropagation(); p.onToggle(item.id); }}
              className="flex size-4 shrink-0 items-center justify-center rounded text-stone-500 transition-colors hover:bg-stone-200">
              <Chevron open={!p.collapsed.has(item.id)} />
            </button>
          ) : (
            <button data-cell="status" aria-label={`Statut : ${STATUS[item.status].label}`}
              onClick={(e) => { e.stopPropagation(); p.onPick("status", item.id, e.currentTarget); }}
              className="flex size-4 shrink-0 items-center justify-center rounded-full transition-shadow duration-150 hover:ring-2 hover:ring-stone-200">
              <StatusIcon status={item.status} />
            </button>
          )}
          {p.renaming === item.id ? (
            <input autoFocus defaultValue={item.title} aria-label="Titre" placeholder="Titre de l'item"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") p.onRename(item.id, e.currentTarget.value);
                if (e.key === "Escape") p.onRename(item.id, null);
                e.stopPropagation();
              }}
              onBlur={(e) => p.onRename(item.id, e.currentTarget.value)}
              className="h-6 min-w-0 flex-1 rounded border border-accent-400 bg-surface px-1.5 text-[13px] outline-none ring-2 ring-accent-100" />
          ) : (
            <span data-cell="title" title={`${inGroup || p.flat ? pathOf(item) : ""}${item.title || "Sans titre"}`} onDoubleClick={() => p.onStartRename(item.id)}
              className={cx("min-w-0 truncate text-[13px]", hasChildren && "font-semibold", !item.title && "text-stone-400")}>
              {(inGroup || p.flat) && <span className="text-stone-400">{pathOf(item)}</span>}{item.title || "Sans titre"}
            </span>
          )}
          {(Object.keys(TAGS) as (keyof typeof TAGS)[]).map((t) => {
            const on = activeTags(items, item.id).filter((e) => e.tag === t);
            if (!on.length) return null;
            const { label, Icon, cls } = TAGS[t];
            return (
              <span key={t} title={`${label}${on.length > 1 ? ` ×${on.length}` : ""}${hasChildren ? " (dans les sous-items)" : ""} : ${on.map((e) => e.reason).join(" · ")}`} aria-label={label}
                className="flex shrink-0 animate-fade-in items-center gap-0.5">
                <span className={cx("flex size-4 items-center justify-center rounded-[4px]", cls)}><Icon size={10} strokeWidth={2.5} /></span>
                {on.length > 1 && <span className="text-[11px] font-medium tabular-nums text-stone-500">{on.length}</span>}
              </span>
            );
          })}
          {late && <TriangleAlert size={13} className="shrink-0 animate-fade-in text-red-600" aria-label="Après son jalon" />}
          {!hasChildren && item.status === "doing" && (allocationOn(item, todayIso()) === 0 ? (
            <span title="En pause : tous ses owners sont à 0 %, la tâche n'avance plus" aria-label="En pause"
              className="flex size-4 shrink-0 animate-fade-in items-center justify-center rounded-[4px] bg-stone-100 text-stone-600">
              <Pause size={9} fill="currentColor" strokeWidth={0} />
            </span>
          ) : allocationOn(item, todayIso()) < 1 && (
            <span title="Allocation du jour" className="shrink-0 text-[11px] tabular-nums text-stone-400">{pctLabel(allocationOn(item, todayIso()))}</span>
          ))}
          {!hasChildren && overdue(item, span) && (
            <span title={`${span!.planned! < todayIso() ? "En retard" : "Glissement prévu"} de ${slip(span)} j ouvrés (fin prévue le ${fmtDay(span!.planned!)})${Number(item.extra_jh) ? `, dont avenant de +${Number(item.extra_jh).toLocaleString("fr-FR")} JH${item.extra_note ? ` : ${item.extra_note}` : ""}` : ""}`}
              className="shrink-0 animate-fade-in rounded-[4px] bg-amber-100 px-1 text-[11px] font-medium tabular-nums leading-4 text-amber-800">
              +{slip(span)} j
            </span>
          )}
          {over.length > 0 && (
            <span title={over.map(({ o, ov }) => `${o?.name} à ${Math.round(ov.peak * 100)} % de son temps${Number(o?.defect_share) > 0 ? ` (dont ${pctLabel(Number(o!.defect_share))} défauts)` : ""}`).join(" · ")}
              className="shrink-0 animate-fade-in rounded-[4px] bg-red-50 px-1 text-[11px] font-medium tabular-nums leading-4 text-red-700">
              {Math.round(Math.max(...over.map((x) => x.ov.peak)) * 100)} %
            </span>
          )}
          <span className="flex-1" />
          <button aria-label="Ajouter un sous-item" title="Ajouter un sous-item"
            onClick={(e) => { e.stopPropagation(); p.onAddChild(item.id); }}
            className="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] text-stone-500 opacity-0 transition-[opacity,background-color] duration-150 hover:bg-stone-200 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-40">
            <Plus size={14} />
          </button>
          {hasChildren ? (
            <span className="w-11 shrink-0 text-right text-xs tabular-nums text-stone-400">Σ {totalJh(items, item.id)} j</span>
          ) : (
            <button data-cell="estimate" aria-label="Estimation" onClick={(e) => { e.stopPropagation(); p.onPick("estimate", item.id, e.currentTarget); }}
              title={Number(item.extra_jh) ? `Estimation ${Number(item.estimate_jh).toLocaleString("fr-FR")} j + avenant ${Number(item.extra_jh).toLocaleString("fr-FR")} j = ${workJh(item).toLocaleString("fr-FR")} j` : undefined}
              className={cx(cellBtn, "min-w-11 justify-end whitespace-nowrap text-xs tabular-nums", Number(item.estimate_jh) ? "text-stone-500" : "text-stone-400")}>
              {Number(item.estimate_jh) ? Number(item.estimate_jh).toLocaleString("fr-FR") : "–"}
              {Number(item.extra_jh) > 0 && <span className="text-amber-700">+{Number(item.extra_jh).toLocaleString("fr-FR")}</span>}&nbsp;j
            </button>
          )}
          {hasChildren ? (
            <span className="flex w-14 shrink-0 justify-end">
              <AvatarStack ring={ring} people={[...new Set(items.filter((c) => c.parent_id === item.id).flatMap((c) => c.owner_ids))]
                .map((o) => people.find((x) => x.id === o)).filter((x): x is Person => !!x)} />
            </span>
          ) : (
            <button data-cell="owners" aria-label="Owners" onClick={(e) => { e.stopPropagation(); p.onPick("owners", item.id, e.currentTarget); }}
              className={cx(cellBtn, "w-14 justify-end px-0.5")}>
              {owners.length ? <AvatarStack people={owners} ring={ring} />
                : <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-stone-300 text-[10px] text-stone-400">+</span>}
            </button>
          )}
        </div>
        <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }} onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0" onClick={(e) => p.onRowClick(item.id, e)} />
          {span && <div onClick={(e) => p.onRowClick(item.id, e)} className="cursor-pointer">{bar(item, hasChildren, sel)}</div>}
          {!span && (
            <span className="pointer-events-none absolute top-1.5 animate-fade-in whitespace-nowrap rounded-[5px] border border-dashed border-amber-300 bg-amber-50/60 px-2 text-xs leading-[18px] text-amber-800"
              style={{ left: (ax.today - ax.from) * ax.px + 8 }}>
              {inGroup ? unplannedReason(item, people) : `À planifier · ${hasChildren ? "sous-items à planifier" : unplannedReason(item, people).toLowerCase()}`}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto" role="grid" aria-label="Timeline des items">
      <div className="relative min-h-full" style={{ width: left + ax.width, "--left": `${left}px` } as CSSProperties}>
        <div className="sticky top-0 z-20 flex border-b border-stone-200/80 bg-surface">
          <div className="sticky left-0 z-30 flex shrink-0 flex-col justify-center border-r border-stone-100 bg-surface pl-5 pr-3" style={{ width: "var(--left)" }}>
            {p.header}
            <div role="separator" aria-orientation="vertical" aria-label="Largeur de la colonne des titres" aria-valuenow={left} aria-valuemin={280} aria-valuemax={760}
              tabIndex={0} title="Glisser pour élargir · double-clic : largeur par défaut"
              onPointerDown={startResize} onDoubleClick={() => setLeft(LEFT)}
              onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); clampLeft(left + (e.key === "ArrowRight" ? 40 : -40)); } }}
              className="group absolute -right-1.5 top-0 z-40 flex h-full w-3 cursor-col-resize justify-center outline-none">
              <span className="h-full w-0.5 rounded-full transition-colors duration-150 group-hover:bg-accent-400 group-focus-visible:bg-accent-500" />
            </div>
          </div>
          <AxisHeader ax={ax} milestones={milestones} items={items} plan={plan} />
        </div>
        {p.rows.map((r) => rowEl(r))}
        {p.footer}
        {p.unplanned.length > 0 && (
          <>
            <div className="flex h-9 border-t border-stone-100">
              <button onClick={p.onToggleGroup} aria-expanded={p.groupOpen}
                className="sticky left-0 flex items-center gap-2 border-r border-stone-100 bg-surface pl-[34px] pr-3 text-left transition-colors hover:bg-stone-50" style={{ width: "var(--left)" }}>
                <span className="text-stone-500"><Chevron open={p.groupOpen} /></span>
                <span className="text-[13px] font-medium">À planifier</span>
                <span className="text-xs tabular-nums text-stone-400">{p.unplanned.length}</span>
                <span className="min-w-0 flex-1 truncate text-right text-[11px] text-stone-400">Sans owner ou sans estimation</span>
              </button>
            </div>
            {p.groupOpen && p.unplanned.map((r) => rowEl(r, true))}
          </>
        )}
        <AxisLines ax={ax} milestones={milestones} left={left} items={items} plan={plan} />
      </div>
    </div>
  );
}
