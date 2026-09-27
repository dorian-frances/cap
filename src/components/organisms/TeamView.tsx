"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { absentSet, orderItems, overloaded, toIso, weekLoad, weekOverload, fmtDay } from "@/lib/plan";
import type { Axis } from "@/lib/axis";
import type { Data, Store } from "@/lib/store";
import { cx } from "@/lib/cx";
import { usePresence } from "@/lib/usePresence";
import type { Plan } from "@/lib/plan";
import { Avatar, Chevron, StatusIcon } from "../atoms";
import { AxisHeader, AxisLines, GanttBar, weekendBg } from "../molecules";
import { HATCH, STATUS } from "../tokens";
import PersonPanel from "./PersonPanel";

const LEFT = 380;

export default function TeamView({ data, plan, store, ax, scrollRef, toolbar, openPerson, onOpenPerson, onOpenItem }: {
  data: Data; plan: Plan; store: Store; ax: Axis; scrollRef: React.RefObject<HTMLDivElement | null>; toolbar: React.ReactNode;
  openPerson: string | null; onOpenPerson: (id: string | null) => void; onOpenItem: (id: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const off = absentSet(data.absences);
  const leaves = orderItems(data.items).filter((r) => !r.hasChildren);
  const milestones = data.items.filter((i) => i.type === "milestone");
  const weeks = Array.from({ length: ax.days / 7 }, (_, w) => ax.from + w * 7);
  const [person, closing] = usePresence(data.people.find((p) => p.id === openPerson));
  const over = overloaded(plan);
  const title = (id: string) => data.items.find((i) => i.id === id)?.title || "Sans titre";

  return (
    <>
      {toolbar}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative min-h-full" style={{ width: LEFT + ax.width }}>
          <div className="sticky top-0 z-20 flex border-b border-stone-200/80 bg-white">
            <div className="sticky left-0 z-30 flex shrink-0 items-center gap-1.5 border-r border-stone-100 bg-white px-5" style={{ width: LEFT }}>
              <span className="font-medium">Personnes</span><span className="text-xs text-stone-400">{data.people.length}</span>
            </div>
            <AxisHeader ax={ax} milestones={milestones} items={data.items} plan={plan} />
          </div>
          {data.people.map((p) => {
            const isOpen = open.has(p.id);
            const active = openPerson === p.id;
            const mine = leaves.filter((r) => r.item.owner_ids.includes(p.id));
            const free = plan.freeFrom.get(p.id);
            return (
              <div key={p.id}>
                <div data-person-row className={cx("group flex h-11 border-b border-stone-100 transition-colors duration-150 starting:opacity-0", active ? "bg-accent-50/60" : "hover:bg-stone-50")}>
                  <div className={cx("sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-stone-100 pl-3 pr-4 transition-colors duration-150", active ? "bg-accent-50" : "bg-white group-hover:bg-stone-50")} style={{ width: LEFT }}>
                    <button aria-label={isOpen ? "Replier" : "Déplier"} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
                      className="flex size-4 items-center justify-center rounded text-stone-500 transition-colors hover:bg-stone-200">
                      <Chevron open={isOpen} />
                    </button>
                    <button onClick={() => onOpenPerson(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <Avatar person={p} size={24} />
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-xs text-stone-400">{Math.round(p.capacity * 100)} %{Number(p.defect_share) > 0 && ` · ${Math.round(Number(p.defect_share) * 100)} % défauts`}</span>
                    </button>
                    {over.has(p.id) && (
                      <span title={`Allocations cumulées jusqu'à ${Math.round(over.get(p.id)!.peak * 100)} % du ${fmtDay(toIso(over.get(p.id)!.from))} au ${fmtDay(toIso(over.get(p.id)!.to))}`}
                        className="shrink-0 animate-fade-in rounded-[4px] bg-red-50 px-1.5 text-[11px] font-medium leading-[18px] text-red-700">Surcharge</span>
                    )}
                    <span className="text-xs text-stone-500">{free ? `libre le ${fmtDay(toIso(free))}` : "libre"}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }}>
                    {weeks.map((w) => {
                      const load = weekLoad(plan, p, off, w);
                      const wide = 7 * ax.px >= 44;
                      const base = "absolute top-2.5 h-6 rounded-[5px] text-center text-[11px] font-medium leading-6 tabular-nums transition-colors duration-300";
                      const style = { left: (w - ax.from) * ax.px + 3, width: 7 * ax.px - 6 };
                      const ov = weekOverload(plan, p.id, w);
                      if (ov) return <div key={w} title={`${Math.round(ov.demand * 100)} % : ${ov.ids.map(title).join(" + ")}`} className={`${base} bg-red-100 text-red-800`} style={style}>{wide && `${Math.round(ov.demand * 100)} %`}</div>;
                      if (load === "abs") return <div key={w} className={`${base} text-stone-600`} style={{ ...style, background: HATCH.absence }}>{wide && "Absent·e"}</div>;
                      if (!load) return null;
                      return <div key={w} title={`${load} % de sa capacité`} className={`${base} ${load >= 95 ? "bg-accent-100 text-accent-800" : "bg-accent-50 text-accent-600"}`} style={style}>{wide && `${load} %`}</div>;
                    })}
                    {data.absences.filter((a) => a.person_id === p.id).map((a) => (
                      <div key={a.id} title={`${a.label || "Absence"} · ${fmtDay(a.start_date)} → ${fmtDay(a.end_date)}`}
                        className="pointer-events-none absolute inset-y-0 opacity-60"
                        style={{ left: ax.x(a.start_date), width: ax.x(a.end_date) - ax.x(a.start_date) + ax.px, background: HATCH.absenceOverlay }} />
                    ))}
                  </div>
                </div>
                {isOpen && mine.map(({ item }, i) => {
                  const s = plan.spans.get(item.id);
                  return (
                    <div key={item.id} data-person-row className="group flex h-8 animate-fade-in cursor-pointer transition-colors hover:bg-stone-50" onClick={() => onOpenItem(item.id)}>
                      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-stone-100 bg-white pl-12 transition-colors group-hover:bg-stone-50" style={{ width: LEFT }}>
                        <span className="w-4 text-xs tabular-nums text-stone-400">{i + 1}</span><StatusIcon status={item.status} />
                        <span className="truncate text-stone-700">{item.title || "Sans titre"}</span>
                      </div>
                      <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }}>
                        {s && <GanttBar ax={ax} span={s} label={item.title} tone={STATUS[item.status]} top={6} height={20} labelMode="inside" />}
                      </div>
                    </div>
                  );
                })}
                {isOpen && !mine.length && <div className="sticky left-0 flex h-8 animate-fade-in items-center pl-12 text-xs text-stone-400" style={{ width: LEFT }}>Aucun item assigné</div>}
              </div>
            );
          })}
          <div className="flex h-9">
            <button onClick={() => onOpenPerson(store.addPerson("Nouvelle personne").id)}
              className="sticky left-0 flex items-center gap-1.5 border-r border-stone-100 bg-white pl-9 text-stone-400 transition-colors hover:text-stone-700" style={{ width: LEFT }}>
              <Plus size={14} />Ajouter une personne
            </button>
          </div>
          {!data.people.length && (
            <div className="sticky left-0 max-w-md px-9 py-6 text-[13px] text-stone-500">
              Ajoutez les membres de l&apos;équipe pour voir leur charge, leurs absences et quand ils se libèrent.
            </div>
          )}
          <AxisLines ax={ax} milestones={milestones} left={LEFT} items={data.items} plan={plan} />
        </div>
      </div>
      {person && <PersonPanel person={person} closing={closing} data={data} plan={plan} store={store} onClose={() => onOpenPerson(null)} onOpenItem={onOpenItem} />}
    </>
  );
}
