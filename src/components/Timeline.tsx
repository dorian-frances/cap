"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { ChevronDown, ChevronRight, GripVertical, Plus, TriangleAlert } from "lucide-react";
import {
  lateBy, isLate, monday, toDay, toIso, todayIso, totalJh, unplannedReason,
  type Item, type Person, type Plan, type Row, type Span,
} from "@/lib/plan";
import { Avatar, Diamond, STATUS, StatusIcon, fmtDay, personColor } from "./ui";

export type Zoom = "semaine" | "mois" | "trimestre";
export type PickKind = "status" | "owners" | "estimate" | "milestone";
export const PX: Record<Zoom, number> = { semaine: 32, mois: 12, trimestre: 5 };
export const LEFT = 380;

/** Échelle de temps : du lundi précédant le début jusqu'à 3 semaines après la dernière date connue. */
export function axis(zoom: Zoom, startIso: string, dates: string[], fitWidth?: number) {
  const today = toDay(todayIso());
  const all = [toDay(startIso), today, ...dates.map(toDay)];
  const from = monday(Math.min(...all)) - 7;
  let days = Math.max(monday(Math.max(...all, from + 70)) + 28 - from, 84);
  // fitWidth : échelle choisie pour remplir une largeur donnée (vue client).
  const px = fitWidth ? Math.max(4, Math.min(24, Math.floor(fitWidth / days))) : PX[zoom];
  if (!fitWidth) days = Math.max(days, Math.ceil(1200 / px / 7) * 7); // toujours au moins un écran de large
  const x = (iso: string) => (toDay(iso) - from) * px;
  const months: { label: string; left: number }[] = [];
  for (let d = from; d < from + days; d++) {
    const iso = toIso(d);
    if (d === from || iso.endsWith("-01"))
      months.push({
        left: (d - from) * px,
        label: new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { month: zoom === "trimestre" ? "short" : "long", year: iso.endsWith("-01-01") || d === from ? "numeric" : undefined, timeZone: "UTC" }),
      });
  }
  const ticks: { label: string; sub?: string; left: number; width: number }[] = [];
  if (zoom === "semaine")
    for (let d = from; d < from + days; d++) {
      const dt = new Date(d * 86_400_000);
      ticks.push({ left: (d - from) * px, width: px, label: String(dt.getUTCDate()), sub: "lmmjvsd"[(dt.getUTCDay() + 6) % 7] });
    }
  else
    for (let d = from; d < from + days; d += 7) {
      const dt = new Date(d * 86_400_000);
      const week = isoWeek(d);
      ticks.push({ left: (d - from) * px, width: 7 * px, label: zoom === "mois" ? String(dt.getUTCDate()) : "", sub: `S${week}` });
    }
  return { px, from, days, width: days * px, today, x, months, ticks };
}
export type Axis = ReturnType<typeof axis>;

function isoWeek(day: number) {
  const d = new Date(day * 86_400_000);
  const th = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)));
  const jan4 = new Date(Date.UTC(th.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((th.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

export const weekendBg = (px: number) => ({
  backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${5 * px}px, rgba(120,113,108,.055) ${5 * px}px ${7 * px}px)`,
});

export function AxisHeader({ ax, milestones, items, plan }: { ax: Axis; milestones: Item[]; items: Item[]; plan: Plan }) {
  const todayLeft = (ax.today - ax.from) * ax.px;
  return (
    <div className="relative h-14 shrink-0 text-[11px] text-stone-500" style={{ width: ax.width }}>
      {ax.months.map((m) => (
        <div key={m.left} className="absolute top-0 h-7 whitespace-nowrap border-l border-stone-200/70 pl-2 font-medium capitalize leading-7 text-stone-600" style={{ left: m.left }}>
          {m.label}
        </div>
      ))}
      {ax.ticks.map((t) => (
        <div key={t.left} className="absolute top-7 h-7 whitespace-nowrap border-l border-stone-100 leading-7" style={{ left: t.left, width: t.width, paddingLeft: ax.px >= 12 ? 6 : 3 }}>
          {t.sub && <span className="text-stone-300">{t.sub}</span>} {t.label}
        </div>
      ))}
      <div className="absolute top-[31px] flex h-[18px] min-w-[18px] -translate-x-1/2 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-medium text-white"
        style={{ left: todayLeft + ax.px / 2 }} title="Aujourd'hui">
        {new Date(ax.today * 86_400_000).getUTCDate()}
      </div>
      {milestones.filter((m) => m.milestone_date).map((m) => {
        const late = items.some((i) => i.target_id === m.id && lateBy(i, plan.spans.get(i.id), items) > 0);
        return (
          <div key={m.id} title={`${m.title} · ${fmtDay(m.milestone_date!)}`}
            className={`absolute top-[5px] flex h-[18px] items-center gap-1 whitespace-nowrap rounded-[5px] pl-1 pr-1.5 text-[11px] font-medium ${late ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-700"}`}
            style={{ left: ax.x(m.milestone_date!) + ax.px / 2 - 6 }}>
            <Diamond late={late} />{m.title}
          </div>
        );
      })}
    </div>
  );
}

/** Lignes verticales : aujourd'hui + jalons, sur toute la hauteur. */
export function AxisLines({ ax, milestones, left, items, plan }: { ax: Axis; milestones: Item[]; left: number; items: Item[]; plan: Plan }) {
  return (
    <>
      <div className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px bg-indigo-500/70" style={{ left: left + (ax.today - ax.from) * ax.px + ax.px / 2 }} />
      {milestones.filter((m) => m.milestone_date).map((m) => {
        const late = items.some((i) => i.target_id === m.id && lateBy(i, plan.spans.get(i.id), items) > 0);
        return <div key={m.id} className={`pointer-events-none absolute bottom-0 top-0 z-[1] border-l border-dashed ${late ? "border-red-400" : "border-stone-300"}`}
          style={{ left: left + ax.x(m.milestone_date!) + ax.px / 2 }} />;
      })}
    </>
  );
}

type Props = {
  items: Item[];
  people: Person[];
  plan: Plan;
  rows: Row[];
  ax: Axis;
  colorBy: "status" | "owner";
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

export default function Timeline({ scrollRef, ...p }: Props) {
  const { items, people, plan, ax } = p;
  const [drop, setDrop] = useState<{ id: string; where: "before" | "after" } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const milestones = items.filter((i) => i.type === "milestone");

  const bar = (item: Item, span: Span, hasChildren: boolean, selected: boolean) => {
    const left = ax.x(span.start);
    const width = ax.x(span.end) - left + ax.px;
    const jh = totalJh(items, item.id);
    const title = `${item.title || "Sans titre"} · ${fmtDay(span.start)} → ${fmtDay(span.end)} · ${jh} j`;
    if (hasChildren) {
      const closed = p.collapsed.has(item.id);
      return <div title={title} className="absolute rounded-[3px]"
        style={{ left, width, top: closed ? 12 : 13, height: closed ? 8 : 6, background: closed ? "#8a847e" : "#b9b3ad", boxShadow: selected ? "0 0 0 2px #5b5bd6" : undefined }} />;
    }
    const target = items.find((i) => i.id === item.target_id);
    const late = lateBy(item, span, items) > 0;
    const [bg, border, color] = p.colorBy === "owner" && item.owner_ids[0]
      ? [personColor(item.owner_ids[0])[0], "rgba(28,25,23,.08)", personColor(item.owner_ids[0])[1]]
      : [STATUS[item.status].bar, STATUS[item.status].border, STATUS[item.status].text];
    const inside = width >= 64;
    const ovLeft = late ? ax.x(target!.milestone_date!) + ax.px : 0;
    return (
      <>
        <div title={title} className="absolute top-1.5 h-5 truncate rounded-[5px] px-2 text-xs font-medium leading-5"
          style={{ left, width, background: bg, color, boxShadow: `inset 0 0 0 1px ${border}${selected ? ", 0 0 0 2px #5b5bd6" : ""}`, opacity: item.status === "done" ? 0.75 : 1 }}>
          {inside && (item.title || "Sans titre")}
        </div>
        {late && (
          <div className="pointer-events-none absolute top-1.5 h-5 rounded-r-[5px]"
            style={{ left: ovLeft, width: left + width - ovLeft, background: "repeating-linear-gradient(135deg,rgba(220,38,38,.30) 0 2px,rgba(253,236,236,.95) 2px 5px)", boxShadow: "inset 0 0 0 1px #f0a8a8" }} />
        )}
        {!inside && <span className="pointer-events-none absolute top-1.5 whitespace-nowrap text-xs leading-5 text-stone-500" style={{ left: left + width + 6 }}>{item.title || "Sans titre"}</span>}
      </>
    );
  };

  const rowEl = ({ item, depth, hasChildren }: Row) => {
    const sel = p.selected.has(item.id);
    const span = plan.spans.get(item.id);
    const late = hasChildren ? isLate(item, plan, items) : lateBy(item, span, items) > 0;
    const owners = people.filter((o) => item.owner_ids.includes(o.id));
    const rowBg = sel ? "bg-indigo-50/70" : "hover:bg-stone-50";
    const hint = drop?.id === item.id ? (drop.where === "before" ? "shadow-[inset_0_2px_0_#5b5bd6]" : "shadow-[inset_0_-2px_0_#5b5bd6]") : "";
    return (
      <div key={item.id} data-row={item.id} role="row" aria-selected={sel}
        className={`group flex h-8 select-none ${rowBg} ${hint}`}
        onClick={(e) => p.onRowClick(item.id, e)}
        onContextMenu={() => p.onContext(item.id)}
        onDragOver={(e) => {
          if (!dragId || dragId === item.id) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          setDrop({ id: item.id, where: e.clientY < r.top + r.height / 2 ? "before" : "after" });
        }}
        onDragLeave={() => setDrop((d) => (d?.id === item.id ? null : d))}
        onDrop={(e) => { e.preventDefault(); if (dragId && drop) p.onDrop(dragId, drop.id, drop.where); setDrop(null); setDragId(null); }}>
        <div className={`sticky left-0 z-10 flex shrink-0 items-center gap-1.5 border-r border-stone-100 pr-3 ${sel ? "bg-[#f3f3fc]" : "bg-white group-hover:bg-stone-50"}`} style={{ width: LEFT }}>
          <span draggable aria-label="Déplacer" title="Glisser pour réordonner"
            onDragStart={(e) => { setDragId(item.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); }}
            onDragEnd={() => { setDragId(null); setDrop(null); }}
            className="flex w-7 shrink-0 cursor-grab justify-center text-stone-400 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-40">
            <GripVertical size={14} />
          </span>
          <span className="shrink-0" style={{ width: depth * 18 }} />
          {hasChildren ? (
            <button aria-label={p.collapsed.has(item.id) ? "Déplier" : "Replier"} onClick={(e) => { e.stopPropagation(); p.onToggle(item.id); }}
              className="flex size-4 shrink-0 items-center justify-center rounded text-stone-500 hover:bg-stone-200">
              {p.collapsed.has(item.id) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <button data-cell="status" aria-label={`Statut : ${STATUS[item.status].label}`}
              onClick={(e) => { e.stopPropagation(); p.onPick("status", item.id, e.currentTarget); }}
              className="flex size-4 shrink-0 items-center justify-center rounded-full hover:ring-2 hover:ring-stone-200">
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
              className="h-6 min-w-0 flex-1 rounded border border-indigo-400 bg-white px-1.5 text-[13px] outline-none ring-2 ring-indigo-100" />
          ) : (
            <span data-cell="title" onDoubleClick={() => p.onStartRename(item.id)}
              className={`min-w-0 truncate text-[13px] ${hasChildren ? "font-semibold" : ""} ${item.title ? "" : "text-stone-400"}`}>
              {item.title || "Sans titre"}
            </span>
          )}
          {late && <TriangleAlert size={13} className="shrink-0 text-red-600" aria-label="Après son jalon" />}
          <span className="flex-1" />
          <button aria-label="Ajouter un sous-item" title="Ajouter un sous-item"
            onClick={(e) => { e.stopPropagation(); p.onAddChild(item.id); }}
            className="flex size-[22px] shrink-0 items-center justify-center rounded-[5px] text-stone-500 opacity-0 hover:bg-stone-200 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-40">
            <Plus size={14} />
          </button>
          {hasChildren ? (
            <span className="w-11 shrink-0 text-right text-xs tabular-nums text-stone-400">Σ {totalJh(items, item.id)} j</span>
          ) : (
            <button data-cell="estimate" aria-label="Estimation" onClick={(e) => { e.stopPropagation(); p.onPick("estimate", item.id, e.currentTarget); }}
              className={`h-6 w-11 shrink-0 rounded px-1 text-right text-xs tabular-nums hover:bg-stone-200/70 ${Number(item.estimate_jh) ? "text-stone-500" : "text-stone-300"}`}>
              {Number(item.estimate_jh) ? `${Number(item.estimate_jh).toLocaleString("fr-FR")} j` : "– j"}
            </button>
          )}
          {hasChildren ? (
            <span className="flex w-14 shrink-0 justify-end">
              {[...new Set(items.filter((c) => c.parent_id === item.id).flatMap((c) => c.owner_ids))].slice(0, 3)
                .map((o) => people.find((x) => x.id === o)).filter(Boolean)
                .map((o, i) => <span key={o!.id} style={{ marginLeft: i ? -5 : 0 }} className="opacity-60"><Avatar person={o!} ring={sel ? "#f3f3fc" : "#fff"} /></span>)}
            </span>
          ) : (
            <button data-cell="owners" aria-label="Owners" onClick={(e) => { e.stopPropagation(); p.onPick("owners", item.id, e.currentTarget); }}
              className="flex h-6 w-14 shrink-0 items-center justify-end rounded px-0.5 hover:bg-stone-200/70">
              {owners.length ? owners.slice(0, 3).map((o, i) => (
                <span key={o.id} style={{ marginLeft: i ? -5 : 0 }}><Avatar person={o} ring={sel ? "#f3f3fc" : "#fff"} /></span>
              )) : <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-stone-300 text-[10px] text-stone-400">+</span>}
              {owners.length > 3 && <span className="ml-0.5 text-[11px] text-stone-400">+{owners.length - 3}</span>}
            </button>
          )}
        </div>
        <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }} onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0" onClick={(e) => p.onRowClick(item.id, e)} />
          {span && <div onClick={(e) => p.onRowClick(item.id, e)} className="cursor-pointer">{bar(item, span, hasChildren, sel)}</div>}
          {!span && (
            <span className="pointer-events-none absolute top-1.5 whitespace-nowrap rounded-[5px] border border-dashed border-amber-300 bg-amber-50/60 px-2 text-xs leading-[18px] text-amber-800"
              style={{ left: (ax.today - ax.from) * ax.px + 8 }}>
              À planifier · {hasChildren ? "aucun sous-item planifiable" : unplannedReason(item, people).toLowerCase()}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto" role="grid" aria-label="Timeline des items">
      <div className="relative min-h-full" style={{ width: LEFT + ax.width }}>
        <div className="sticky top-0 z-20 flex border-b border-stone-200/80 bg-white">
          <div className="sticky left-0 z-30 flex shrink-0 flex-col justify-center border-r border-stone-100 bg-white pl-5 pr-3" style={{ width: LEFT }}>
            {p.header}
          </div>
          <AxisHeader ax={ax} milestones={milestones} items={items} plan={plan} />
        </div>
        {p.rows.map((r) => rowEl(r))}
        {p.footer}
        <AxisLines ax={ax} milestones={milestones} left={LEFT} items={items} plan={plan} />
      </div>
    </div>
  );
}
