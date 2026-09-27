"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Clock, Download, TriangleAlert } from "lucide-react";
import {
  isLate, orderItems, overdue, pauses, schedule, todayIso, fmtDay, type Absence, type Item, type Person, type Project, type Status,
} from "@/lib/plan";
import { axis } from "@/lib/axis";
import { supabase } from "@/lib/supabase";
import { Button, Chevron, Logo, StatusIcon } from "@/components/atoms";
import { AxisHeader, AxisLines, GanttBar, Legend, StatCard, weekendBg } from "@/components/molecules";
import { HATCH, STATUS } from "@/components/tokens";

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
  // Première date de jalon dépassée par l'item ou un de ses enfants directs (partie hachurée).
  const lateFrom = (it: Item, end: string) => [it, ...items.filter((i) => i.parent_id === it.id)]
    .map((i) => items.find((m) => m.id === i.target_id)?.milestone_date)
    .filter((d): d is string => !!d && d < end).sort()[0] ?? null;
  const done = top.filter((r) => statusOf(r.item.id) === "done").length;
  const dates = [...plan.spans.values()].flatMap((s) => (s ? [s.start, s.end] : []));
  const ax = axis("mois", data.project.start_date, dates, 1000);
  const lastEnd = rows.map((r) => plan.spans.get(r.item.id)?.end).filter(Boolean).sort().at(-1);

  return (
    <main className="min-h-screen bg-canvas text-stone-900">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-7 px-4 py-8 sm:px-10 sm:py-10">
        <header className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-stone-400"><Logo size={18} />Macro-plan partagé</div>
            <h1 className="text-[28px] font-semibold tracking-tight">{data.project.name}</h1>
            <p className="text-[13px] text-stone-500">Dates calculées à partir de la charge et de la disponibilité de l&apos;équipe · consulté le {fmtDay(today, true)}</p>
          </div>
          <Button size="form" onClick={() => window.print()} className="print:hidden"><Download size={14} />Exporter en PDF</Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Prochain jalon" value={next ? `${next.title} · ${fmtDay(next.milestone_date!)}` : "Aucun à venir"}
            note={next ? (lateFor(next).length ? <Warn>{lateFor(next).length} livrable{lateFor(next).length > 1 ? "s" : ""} prévu{lateFor(next).length > 1 ? "s" : ""} après le jalon</Warn> : <Ok>Dans les temps</Ok>) : null} />
          {lastMs && lastMs !== next ? (
            <StatCard label={lastMs.title} value={fmtDay(lastMs.milestone_date!, true)}
              note={lateFor(lastMs).length ? <Warn>{lateFor(lastMs).length} livrable{lateFor(lastMs).length > 1 ? "s" : ""} en retard</Warn> : <Ok>Dans les temps{lastEnd ? ` · fin estimée le ${fmtDay(lastEnd)}` : ""}</Ok>} />
          ) : (
            <StatCard label="Fin estimée" value={lastEnd ? fmtDay(lastEnd, true) : "—"} note={<span className="text-stone-500">Dernier livrable planifié</span>} />
          )}
          <StatCard label="Avancement" value={`${done} livrable${done > 1 ? "s" : ""} sur ${top.length} terminé${done > 1 ? "s" : ""}`}
            note={<span className="mt-1 flex gap-[3px]">{top.map((r) => {
              const s = statusOf(r.item.id);
              return <span key={r.item.id} className="h-1.5 flex-1 rounded-full" style={{ background: s === "done" ? "var(--color-green-600)" : s === "doing" ? "var(--color-amber-600)" : "var(--color-stone-200)" }} />;
            })}</span>} />
        </div>

        <div className="animate-rise-in overflow-hidden rounded-[10px] border border-stone-200/80 bg-surface">
          <div className="overflow-x-auto">
            <div className="relative" style={{ width: LEFT + ax.width }}>
              <div className="flex border-b border-stone-200/80">
                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-stone-100 bg-surface px-5 text-[13px] font-medium" style={{ width: LEFT }}>Livrables</div>
                <AxisHeader ax={ax} milestones={milestones} items={items} plan={plan} />
              </div>
              {visible.map(({ item, depth, hasChildren }) => {
                const span = plan.spans.get(item.id);
                const st = hasChildren ? statusOf(item.id) : item.status;
                const late = isLate(item, plan, items);
                const behind = (hasChildren ? leavesOf(item.id) : [item]).some((l) => overdue(l, plan.spans.get(l.id)));
                return (
                  <div key={item.id} className={`flex border-b border-stone-100 ${depth ? "h-9 animate-fade-in" : "h-12"}`}>
                    <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2.5 border-r border-stone-100 bg-surface pr-4" style={{ width: LEFT, paddingLeft: depth ? 44 : 16 }}>
                      {depth === 0 && (hasChildren ? (
                        <button aria-label={open.has(item.id) ? "Replier" : "Déplier"} className="flex size-4 items-center justify-center rounded text-stone-500 transition-colors hover:bg-stone-100 print:hidden"
                          onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}>
                          <Chevron open={open.has(item.id)} />
                        </button>
                      ) : <span className="size-4" />)}
                      <StatusIcon status={st} size={depth ? 12 : 14} />
                      <span className={`min-w-0 flex-1 truncate ${depth ? "text-[13px] text-stone-600" : "text-[13px] font-medium"}`}>{item.title || "Sans titre"}</span>
                      <span className={`whitespace-nowrap text-xs ${late ? "text-red-700" : behind ? "text-amber-700" : "text-stone-500"}`}
                        title={behind ? "Finit ou finira après sa fin prévue" : undefined}>
                        {!span ? "À planifier" : st === "done" ? `Terminé le ${fmtDay(span.end)}` : behind ? "Glisse sur sa fin prévue" : `Fin prévue le ${fmtDay(span.end)}`}
                        {late ? <TriangleAlert size={12} className="ml-1 inline -translate-y-px text-red-600" />
                          : behind && <Clock size={12} className="ml-1 inline -translate-y-px text-amber-600" />}
                      </span>
                    </div>
                    <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }}>
                      {span && <GanttBar ax={ax} span={span} label={item.title} tone={STATUS[st]} top={depth ? 10 : 12} height={depth ? 16 : 24}
                        labelMode="inside" pauses={hasChildren ? [] : pauses(item, span)} title={`${item.title} · ${fmtDay(span.start)} → ${fmtDay(span.end)}`} lateFrom={lateFrom(item, span.end)} />}
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
          <Legend items={[
            ...(["done", "doing", "todo"] as Status[]).map((k) => ({ label: k === "todo" ? "À venir" : k === "doing" ? "En cours" : "Terminé", swatch: { background: STATUS[k].bar, boxShadow: `inset 0 0 0 1px ${STATUS[k].border}` } })),
            { label: "Retard sur l'estimation", swatch: { background: HATCH.overrun } },
            { label: "Après son jalon", swatch: { background: HATCH.late } },
            { label: "En pause", swatch: { background: HATCH.pause } },
            { label: "Jalon", swatch: { borderLeft: "1px dashed var(--color-stone-500)" }, line: true },
            { label: "Aujourd'hui", swatch: { borderLeft: "1px solid var(--color-accent-500)" }, line: true },
          ]} />
          <span className="flex-1" />
          <span>Lecture seule · Cap</span>
        </footer>
      </div>
    </main>
  );
}

const Warn = ({ children }: { children: React.ReactNode }) => <span className="flex items-center gap-1 text-red-700"><TriangleAlert size={12} />{children}</span>;
const Ok = ({ children }: { children: React.ReactNode }) => <span className="text-green-700">{children}</span>;
