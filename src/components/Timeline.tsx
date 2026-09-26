"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  isLate, orderItems, schedule, toDay, toIso, totalJh,
  type Absence, type Item, type Person, type Project, type Row, type Span,
} from "@/lib/plan";

const PX = 16; // largeur d'un jour
const ROW = "h-9";

export const fmt = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
const monday = (d: number) => d - ((new Date(d * 86_400_000).getUTCDay() + 6) % 7);

const BAR: Record<Item["status"], string> = { todo: "bg-sky-500", doing: "bg-amber-500", done: "bg-emerald-500" };

export type CellCtx = { row: Row; span: Span | null | undefined; late: boolean; jh: number };

type Props = {
  project: Project;
  items: Item[];
  people: Person[];
  absences: Absence[];
  left: number; // largeur de la colonne de gauche (px)
  itemCell?: (ctx: CellCtx) => ReactNode;
  personCell?: (p: Person) => ReactNode;
};

export default function Timeline({ project, items, people, absences, left, itemCell, personCell }: Props) {
  const [view, setView] = useState<"items" | "people">("items");
  const rows = useMemo(() => orderItems(items), [items]);
  const spans = useMemo(
    () => schedule(items, people, absences, project.start_date),
    [items, people, absences, project.start_date],
  );

  const today = toDay(new Date().toISOString().slice(0, 10));
  const known = [...spans.values()].filter((s): s is Span => !!s);
  const from = monday(Math.min(toDay(project.start_date), ...known.map((s) => toDay(s.start))));
  const lastEnd = Math.max(from + 56, today, ...known.map((s) => toDay(s.end)));
  const days = monday(lastEnd) + 21 - from;
  const x = (iso: string) => (toDay(iso) - from) * PX;
  const w = (s: Span) => (toDay(s.end) - toDay(s.start) + 1) * PX;
  const milestones = rows.filter((r) => r.item.type === "milestone" && r.item.milestone_date);

  const grid = {
    width: days * PX,
    backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${5 * PX}px, #f1f5f9 ${5 * PX}px ${7 * PX}px),
      repeating-linear-gradient(90deg, #e2e8f0 0 1px, transparent 1px ${7 * PX}px)`,
  };

  const leafRows = rows.filter((r) => r.item.type === "feature" && !r.hasChildren);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex gap-1 border-b border-slate-200 p-2 text-sm">
        {(["items", "people"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`rounded px-3 py-1 ${view === v ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>
            {v === "items" ? "Items" : "Équipe"}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 px-2 text-xs text-slate-500">
          <Legend c="bg-sky-500" t="À faire" /><Legend c="bg-amber-500" t="En cours" />
          <Legend c="bg-emerald-500" t="Fait" /><Legend c="bg-violet-600 rotate-45" t="Jalon" />
        </span>
      </div>

      <div className="relative overflow-x-auto">
        <div className="relative" style={{ width: left + days * PX }}>
          {/* En-tête : semaines */}
          <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white text-xs text-slate-500">
            <div className="sticky left-0 z-30 shrink-0 bg-white" style={{ width: left }} />
            {Array.from({ length: days / 7 }, (_, i) => (
              <div key={i} className="shrink-0 border-l border-slate-200 px-1 py-1" style={{ width: 7 * PX }}>
                {fmt(toIso(from + i * 7))}
              </div>
            ))}
          </div>

          {view === "items" && rows.map((row) => {
            const { item, hasChildren } = row;
            const span = spans.get(item.id);
            const late = isLate(item, span, items);
            const jh = totalJh(items, item.id);
            return (
              <div key={item.id} className={`flex border-b border-slate-100 ${ROW}`}>
                <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-slate-200 bg-white text-sm"
                  style={{ width: left }}>
                  {itemCell ? itemCell({ row, span, late, jh }) : (
                    <ReadOnlyCell row={row} span={span} late={late} jh={jh} people={people} />
                  )}
                </div>
                <div className="relative" style={grid}>
                  {span && item.type === "milestone" && (
                    <div title={`${item.title} — ${fmt(span.start)}`}
                      className="absolute top-2.5 h-4 w-4 rotate-45 bg-violet-600" style={{ left: x(span.start) }} />
                  )}
                  {span && item.type === "feature" && (
                    <div title={`${item.title} — ${fmt(span.start)} → ${fmt(span.end)} · ${jh} JH`}
                      className={`absolute truncate rounded px-1.5 text-xs leading-6 text-white ${
                        hasChildren ? "top-3 h-3 bg-slate-700" : `top-1.5 h-6 ${BAR[item.status]}`
                      } ${late ? "ring-2 ring-red-500 ring-offset-1" : ""}`}
                      style={{ left: x(span.start), width: w(span) }}>
                      {!hasChildren && item.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {view === "people" && people.map((p) => (
            <div key={p.id} className="flex h-11 border-b border-slate-100">
              <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-slate-200 bg-white px-3 text-sm"
                style={{ width: left }}>
                {personCell ? personCell(p) : (
                  <><span className="font-medium">{p.name}</span>
                    <span className="text-slate-500">{Math.round(p.capacity * 100)} %</span></>
                )}
              </div>
              <div className="relative" style={grid}>
                {absences.filter((a) => a.person_id === p.id).map((a) => (
                  <div key={a.id} title={`${a.label || "Absence"} — ${fmt(a.start_date)} → ${fmt(a.end_date)}`}
                    className="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,#cbd5e1_0_2px,transparent_2px_6px)]"
                    style={{ left: x(a.start_date), width: w({ start: a.start_date, end: a.end_date }) }} />
                ))}
                {leafRows.filter((r) => r.item.owner_ids.includes(p.id)).map(({ item }) => {
                  const span = spans.get(item.id);
                  return span && (
                    <div key={item.id} title={`${item.title} — ${fmt(span.start)} → ${fmt(span.end)}`}
                      className={`absolute top-2 h-7 truncate rounded border border-white px-1.5 text-xs leading-6 text-white ${BAR[item.status]}`}
                      style={{ left: x(span.start), width: w(span) }}>
                      {item.title}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {view === "people" && !people.length && (
            <p className="p-4 text-sm text-slate-500">Aucune personne dans l&apos;équipe.</p>
          )}
          {view === "items" && !rows.length && <p className="p-4 text-sm text-slate-500">Aucun item.</p>}

          {/* Repères verticaux : aujourd'hui et jalons */}
          {today >= from && today < from + days && (
            <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-red-400"
              style={{ left: left + (today - from) * PX + PX / 2 }} />
          )}
          {milestones.map(({ item }) => (
            <div key={item.id} className="pointer-events-none absolute bottom-0 top-6 border-l border-dashed border-violet-500"
              style={{ left: left + x(item.milestone_date!) + PX / 2 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="flex items-center gap-1"><span className={`inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{t}</span>;
}

export function EndLabel({ span, item, late }: { span: Span | null | undefined; item: Item; late: boolean }) {
  if (span) return <span className={late ? "font-medium text-red-600" : "text-slate-600"}>{fmt(span.end)}{late && " ⚠"}</span>;
  return <span className="text-amber-600" title={item.type === "milestone" ? "Pas de date" : "Pas d'owner ou pas de capacité"}>
    non planifié</span>;
}

function ReadOnlyCell({ row, span, late, jh, people }: CellCtx & { people: Person[] }) {
  const { item, depth } = row;
  const owners = people.filter((p) => item.owner_ids.includes(p.id));
  return (
    <div className="flex w-full items-center gap-2 px-3">
      <span className={`flex-1 truncate ${row.hasChildren ? "font-semibold" : ""} ${item.type === "milestone" ? "text-violet-700" : ""}`}
        style={{ paddingLeft: depth * 16 }}>
        {item.type === "milestone" && "◆ "}{item.title || "Sans titre"}
      </span>
      {item.type === "feature" && <span className="w-12 text-right text-slate-500">{jh} JH</span>}
      <span className="w-16 truncate text-xs text-slate-500" title={owners.map((o) => o.name).join(", ")}>
        {!row.hasChildren && owners.map((o) => initials(o.name)).join(" ")}
      </span>
      <span className="w-20 text-right text-xs"><EndLabel span={span} item={item} late={late} /></span>
    </div>
  );
}
