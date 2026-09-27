"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, Download, TriangleAlert } from "lucide-react";
import {
  isLate, orderItems, schedule, todayIso, type Absence, type Item, type Person, type Plan, type Project, type Status,
} from "@/lib/plan";
import { supabase } from "@/lib/supabase";
import { AxisHeader, AxisLines, axis, weekendBg } from "@/components/Timeline";
import { Logo } from "@/components/Sidebar";
import { STATUS, StatusIcon, fmtDay } from "@/components/ui";

type Shared = { project: Project; items: Item[]; people: Person[]; absences: Absence[] };
const LEFT = 320;

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Shared | null | undefined>(undefined);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.rpc("get_shared_project", { token }).then(({ data }) => setData(data));
  }, [token]);

  const plan = useMemo(() => (data ? schedule(data.items, data.people, data.absences, data.project.start_date) : null), [data]);
  if (data === undefined) return null;
  if (!data || !plan) return <main className="flex min-h-screen items-center justify-center text-[13px] text-stone-600">Ce lien n&apos;est plus valide. Demandez-en un nouveau à l&apos;équipe.</main>;

  const { items } = data;
  const rows = orderItems(items);
  const leavesOf = (id: string): Item[] => {
    const kids = items.filter((i) => i.parent_id === id && i.type === "feature");
    return kids.length ? kids.flatMap((k) => leavesOf(k.id)) : [items.find((i) => i.id === id)!];
  };
  const statusOf = (id: string): Status => {
    const l = leavesOf(id);
    if (l.every((i) => i.status === "done")) return "done";
    return l.some((i) => i.status !== "todo") ? "doing" : "todo";
  };
  const top = rows.filter((r) => r.depth === 0);
  const visible = rows.filter((r) => r.depth === 0 || (r.item.parent_id && open.has(r.item.parent_id) && rows.find((x) => x.item.id === r.item.parent_id)!.depth === 0));
  const milestones = items.filter((i) => i.type === "milestone" && i.milestone_date).sort((a, b) => a.milestone_date!.localeCompare(b.milestone_date!));
  const today = todayIso();
  const next = milestones.find((m) => m.milestone_date! >= today);
  const lastMs = milestones.at(-1);
  // Livrables (niveau 0) dont un Item ciblant ce jalon finit après lui.
  const topOf = (it: Item): Item => (it.parent_id ? topOf(items.find((i) => i.id === it.parent_id)!) : it);
  const lateFor = (m: Item) => [...new Set(rows.filter((r) => r.item.target_id === m.id && isLate(r.item, plan, items)).map((r) => topOf(r.item).id))];
  const done = top.filter((r) => statusOf(r.item.id) === "done").length;
  const dates = [...plan.spans.values()].flatMap((s) => (s ? [s.start, s.end] : []));
  const ax = axis("mois", data.project.start_date, dates, 1000);
  const lastEnd = rows.map((r) => plan.spans.get(r.item.id)?.end).filter(Boolean).sort().at(-1);

  return (
    <main className="min-h-screen bg-[#fafaf9] text-stone-900">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-7 px-4 py-8 sm:px-10 sm:py-10">
        <header className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-stone-400"><Logo size={18} />Macro-plan partagé</div>
            <h1 className="text-[28px] font-semibold tracking-tight">{data.project.name}</h1>
            <p className="text-[13px] text-stone-500">Dates calculées à partir de la charge et de la disponibilité de l&apos;équipe · consulté le {fmtDay(today, true)}</p>
          </div>
          <button onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-stone-200 bg-white px-3 text-[13px] font-medium hover:bg-stone-50 print:hidden">
            <Download size={14} />Exporter en PDF
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card label="Prochain jalon" value={next ? `${next.title} · ${fmtDay(next.milestone_date!)}` : "Aucun à venir"}
            note={next ? (lateFor(next).length ? <Warn>{lateFor(next).length} livrable{lateFor(next).length > 1 ? "s" : ""} prévu{lateFor(next).length > 1 ? "s" : ""} après le jalon</Warn> : <Ok>Dans les temps</Ok>) : null} />
          {lastMs && lastMs !== next ? (
            <Card label={lastMs.title} value={fmtDay(lastMs.milestone_date!, true)}
              note={lateFor(lastMs).length ? <Warn>{lateFor(lastMs).length} livrable{lateFor(lastMs).length > 1 ? "s" : ""} en retard</Warn> : <Ok>Dans les temps{lastEnd ? ` · fin estimée le ${fmtDay(lastEnd)}` : ""}</Ok>} />
          ) : (
            <Card label="Fin estimée" value={lastEnd ? fmtDay(lastEnd, true) : "—"} note={<span className="text-stone-500">Dernier livrable planifié</span>} />
          )}
          <Card label="Avancement" value={`${done} livrable${done > 1 ? "s" : ""} sur ${top.length} terminé${done > 1 ? "s" : ""}`}
            note={<span className="mt-1 flex gap-[3px]">{top.map((r) => {
              const s = statusOf(r.item.id);
              return <span key={r.item.id} className="h-1.5 flex-1 rounded-full" style={{ background: s === "done" ? "#7cc79a" : s === "doing" ? "#efc587" : "#e7e5e4" }} />;
            })}</span>} />
        </div>

        <div className="overflow-hidden rounded-[10px] border border-stone-200/80 bg-white">
          <div className="overflow-x-auto">
            <div className="relative" style={{ width: LEFT + ax.width }}>
              <div className="flex border-b border-stone-200/80">
                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-stone-100 bg-white px-5 text-[13px] font-medium" style={{ width: LEFT }}>Livrables</div>
                <AxisHeader ax={ax} milestones={milestones} items={items} plan={plan} />
              </div>
              {visible.map(({ item, depth, hasChildren }) => {
                const span = plan.spans.get(item.id);
                const st = hasChildren ? statusOf(item.id) : item.status;
                const late = isLate(item, plan, items);
                return (
                  <div key={item.id} className={`flex border-b border-stone-100 ${depth ? "h-9" : "h-12"}`}>
                    <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2.5 border-r border-stone-100 bg-white pr-4" style={{ width: LEFT, paddingLeft: depth ? 44 : 16 }}>
                      {depth === 0 && (hasChildren ? (
                        <button aria-label={open.has(item.id) ? "Replier" : "Déplier"} className="flex size-4 items-center justify-center rounded text-stone-500 hover:bg-stone-100 print:hidden"
                          onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}>
                          {open.has(item.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      ) : <span className="size-4" />)}
                      <StatusIcon status={st} size={depth ? 12 : 14} />
                      <span className={`min-w-0 flex-1 truncate ${depth ? "text-[13px] text-stone-600" : "text-[13px] font-medium"}`}>{item.title || "Sans titre"}</span>
                      <span className={`whitespace-nowrap text-xs ${late ? "text-red-700" : "text-stone-500"}`}>
                        {!span ? "À planifier" : st === "done" ? `Terminé le ${fmtDay(span.end)}` : `Fin prévue le ${fmtDay(span.end)}`}
                        {late && <TriangleAlert size={12} className="ml-1 inline -translate-y-px text-red-600" />}
                      </span>
                    </div>
                    <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }}>
                      {span && <Bar plan={plan} items={items} item={item} ax={ax} status={st} tall={!depth} />}
                    </div>
                  </div>
                );
              })}
              <AxisLines ax={ax} milestones={milestones} left={LEFT} items={items} plan={plan} />
              {!top.length && <p className="p-6 text-[13px] text-stone-500">Le plan est encore vide.</p>}
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500">
          {(["done", "doing", "todo"] as Status[]).map((k) => (
            <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-3.5 rounded-[3px]" style={{ background: STATUS[k].bar, boxShadow: `inset 0 0 0 1px ${STATUS[k].border}` }} />{k === "todo" ? "À venir" : k === "doing" ? "En cours" : "Terminé"}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-2 w-3.5 rounded-[3px]" style={{ background: "repeating-linear-gradient(135deg,rgba(220,38,38,.35) 0 2px,#fdecec 2px 5px)" }} />Après son jalon</span>
          <span className="flex items-center gap-1.5"><span className="h-3 border-l border-dashed border-stone-500" />Jalon</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-indigo-500" />Aujourd&apos;hui</span>
          <span className="flex-1" />
          <span>Lecture seule · Cap</span>
        </footer>
      </div>
    </main>
  );
}

function Bar({ plan, items, item, ax, status, tall }: { plan: Plan; items: Item[]; item: Item; ax: ReturnType<typeof axis>; status: Status; tall: boolean }) {
  const span = plan.spans.get(item.id)!;
  const left = ax.x(span.start), width = ax.x(span.end) - left + ax.px;
  const s = STATUS[status];
  // Partie hachurée : au-delà du jalon ciblé par l'Item ou par un de ses descendants.
  const targets = [item, ...items.filter((i) => i.parent_id === item.id)]
    .map((i) => items.find((m) => m.id === i.target_id)?.milestone_date)
    .filter((d): d is string => !!d && d < span.end).sort();
  const ov = targets[0] ? ax.x(targets[0]) + ax.px : 0;
  const h = tall ? 24 : 16;
  return (
    <>
      <div title={`${item.title} · ${fmtDay(span.start)} → ${fmtDay(span.end)}`} className="absolute truncate rounded-md px-2.5 text-xs font-medium"
        style={{ left, width, top: tall ? 12 : 10, height: h, lineHeight: `${h}px`, background: s.bar, color: s.text, boxShadow: `inset 0 0 0 1px ${s.border}` }}>
        {tall && width > 90 ? item.title : ""}
      </div>
      {ov > 0 && ov < left + width && (
        <div className="absolute rounded-r-md" style={{ left: ov, width: left + width - ov, top: tall ? 12 : 10, height: h, background: "repeating-linear-gradient(135deg,rgba(220,38,38,.30) 0 2px,rgba(253,236,236,.95) 2px 5px)", boxShadow: "inset 0 0 0 1px #f0a8a8" }} />
      )}
    </>
  );
}

function Card({ label, value, note }: { label: string; value: string; note: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-stone-200/80 bg-white px-4 py-3.5">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-[17px] font-semibold">{value}</span>
      <span className="text-xs">{note}</span>
    </div>
  );
}
const Warn = ({ children }: { children: React.ReactNode }) => <span className="flex items-center gap-1 text-red-700"><TriangleAlert size={12} />{children}</span>;
const Ok = ({ children }: { children: React.ReactNode }) => <span className="text-green-700">{children}</span>;
