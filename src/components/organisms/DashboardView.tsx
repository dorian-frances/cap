"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, Settings, Trash2 } from "lucide-react";
import {
  daysUntil, dueOn, fmtDay, orderItems, overdue, overloaded, prepLeads, slip, toIso, toLift, todayIso, upcomingMilestones, upcomingStarts,
  type Item, type Plan, type PrepKind, type TagEntry,
} from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { cx } from "@/lib/cx";
import { Avatar, Button, Diamond, StatusIcon } from "../atoms";
import { AvatarStack, IconButton, StatCard, TONE_DOT, Tooltip, type CardTone } from "../molecules";
import { ContentPage } from "../templates/ContentPage";
import { PREP, TAGS } from "../tokens";
import type { View } from "./Sidebar";

const KINDS: PrepKind[] = ["business", "tech"];
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
const TONE = { ok: "text-green-700", warn: "text-amber-700", bad: "text-red-700", muted: "text-stone-500" };
type Tone = keyof typeof TONE;
const Note = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={TONE[tone]}>{children}</span>;

/** Case d'une vérification avant démarrage : faite (date, auteur), due (ambre) ou à venir (« dès le … »). */
export function PrepToggle({ item, kind, due, from, store, me }: { item: Item; kind: PrepKind; due: boolean; from?: string; store: Store; me: string }) {
  const done = item.prep?.[kind];
  const toggle = () => store.updateItems([item.id], { prep: { ...item.prep, [kind]: done ? undefined : { on: todayIso(), by: me } } });
  return (
    <Tooltip label={done ? `${PREP[kind].label} faite le ${fmtDay(done.on)}${done.by ? ` par ${done.by.split("@")[0]}` : ""}` : PREP[kind].hint}>
      <button type="button" role="checkbox" aria-checked={!!done} aria-label={PREP[kind].label} onClick={toggle} className={cx(
        "flex h-[26px] items-center gap-1.5 rounded-md border px-2 text-xs tabular-nums transition-colors duration-150",
        done ? "border-stone-200 text-stone-600 hover:bg-stone-50"
          : due ? "border-amber-300 bg-amber-50 font-medium text-amber-800 hover:bg-amber-100"
          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50",
      )}>
        <span className={cx("flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border",
          done ? "border-green-600 bg-green-600 text-white" : due ? "border-amber-600" : "border-stone-300")}>
          {done && <Check size={10} strokeWidth={3} />}
        </span>
        {done ? `Faite le ${fmtDay(done.on)}` : due ? "À vérifier" : from ? `Dès le ${fmtDay(from)}` : "À faire"}
      </button>
    </Tooltip>
  );
}

/** Pilotage : ce qui demande une action, du plus urgent (démarrages à préparer) au plus diffus (dérives). */
export default function DashboardView({ data, plan, store, me, onOpenItem, onOpenPerson, onView }: {
  data: Data; plan: Plan; store: Store; me: string;
  onOpenItem: (id: string) => void; onOpenPerson: (id: string) => void; onView: (v: View) => void;
}) {
  const { items, people } = data;
  const today = todayIso();
  const leads = prepLeads(data.project);
  const horizon = Math.max(leads.business, leads.tech);
  const starts = upcomingStarts(items, plan, leads, today);
  const dueChecks = starts.reduce((n, r) => n + r.due.length, 0);
  const lift = toLift(items, plan).flatMap((r) => r.tags.map((tag) => ({ ...r, tag })));
  const soon = (start: string | null) => !!start && daysUntil(start, today) <= horizon;
  const liftSoon = lift.filter((r) => soon(r.start)).length;
  const [next, ...following] = upcomingMilestones(items, plan, today).slice(0, 4);
  const late = orderItems(items).filter((r) => !r.hasChildren && overdue(r.item, plan.spans.get(r.item.id)))
    .map(({ item }) => ({ item, span: plan.spans.get(item.id)!, n: slip(plan.spans.get(item.id)) })).sort((a, b) => b.n - a.n);
  const over = [...overloaded(plan, today)].flatMap(([id, o]) => { const p = people.find((x) => x.id === id); return p ? [{ p, ...o }] : []; });

  // État de chaque carte : rouge = problème aujourd'hui, ambre = action à mener, vert = rien à faire.
  const prepTone: CardTone = starts.some((r) => r.due.length && r.days === 0) ? "bad" : dueChecks ? "warn" : "ok";
  const liftTone: CardTone = liftSoon ? "bad" : lift.length ? "warn" : "ok";
  const driftTone: CardTone = over.length || late.some((r) => r.span.planned! < today) ? "bad" : late.length ? "warn" : "ok";

  const ownersOf = (i: Item) => people.filter((p) => i.owner_ids.includes(p.id));
  const parentPath = (i: Item) => {
    const out: string[] = [];
    for (let p = items.find((x) => x.id === i.parent_id); p; p = items.find((x) => x.id === p!.parent_id)) out.unshift(p.title || "Sans titre");
    return out.join(" › ");
  };
  const liftTag = (item: Item, e: TagEntry) =>
    store.updateItems([item.id], { tag_log: (item.tag_log ?? []).map((x) => (x.id === e.id ? { ...x, lifted_on: today, lifted_by: me } : x)) });
  const inDays = (start: string) => (start <= today ? "aujourd'hui" : `dans ${daysUntil(start, today)} j`);
  const title = (i: Item) => (
    <button onClick={() => onOpenItem(i.id)} className="flex min-w-0 flex-col items-start text-left">
      {parentPath(i) && <span className="max-w-full truncate text-[11px] text-stone-400">{parentPath(i)}</span>}
      <span className="max-w-full truncate underline-offset-2 hover:underline">{i.title || "Sans titre"}</span>
    </button>
  );

  return (
    <ContentPage title="Dashboard" width="max-w-5xl">
      <div className="grid gap-3 lg:grid-cols-3">
        <section aria-label="Prochains jalons" className="flex animate-rise-in flex-col gap-4 rounded-[10px] border border-stone-200/80 bg-surface px-5 py-4 lg:col-span-2 lg:row-span-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">Passe-t-on nos prochains jalons ?</span>
            <Button size="sm" variant="ghost" onClick={() => onView("jalons")}>Tous les jalons<ArrowRight size={12} /></Button>
          </div>
          {next ? <>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <Diamond late={next.tone === "late"} size={12} />
                <span className="text-[22px] font-semibold tracking-tight">{next.milestone.title || "Sans titre"}</span>
                <span className="text-[13px] tabular-nums text-stone-500">{fmtDay(next.milestone.milestone_date!)} · {inDays(next.milestone.milestone_date!)}</span>
              </div>
              <Verdict m={next} big />
              {next.late.length > 0 && (
                <ul className="flex flex-col gap-1 pt-1">
                  {next.late.map(({ item, n }) => (
                    <li key={item.id} data-row={item.id} className="flex items-center gap-2 text-[13px]">
                      <StatusIcon status={item.status} />
                      <span className="flex min-w-0 flex-1">{title(item)}</span>
                      <span className="shrink-0 text-xs text-stone-500">finit le {fmtDay(plan.spans.get(item.id)!.end)}</span>
                      <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-red-700">+{n} j</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {following.length > 0 && (
              <div className="mt-auto flex flex-col divide-y divide-stone-100 border-t border-stone-100">
                {following.map((m) => (
                  <div key={m.milestone.id} className="flex items-center gap-3 py-2 text-[13px]">
                    <Diamond late={m.tone === "late"} size={10} />
                    <span className="min-w-0 flex-1 truncate">{m.milestone.title || "Sans titre"}</span>
                    <span className="w-28 shrink-0 text-xs tabular-nums text-stone-500">{fmtDay(m.milestone.milestone_date!)} · {inDays(m.milestone.milestone_date!)}</span>
                    <span className="w-60 shrink-0 text-right"><Verdict m={m} /></span>
                  </div>
                ))}
              </div>
            )}
          </> : <p className="text-[13px] text-stone-500">Aucun jalon à venir.</p>}
        </section>
        <StatCard href="#demarrages" tone={prepTone} label="À vérifier avant démarrage" value={dueChecks ? plural(dueChecks, "vérification") : "Tout est prêt"} />
        <StatCard href="#dependances" tone={liftTone} label="Dépendances et blocages" value={lift.length ? `${lift.length} à lever` : "Rien à lever"}
          note={liftSoon > 0 && <Note tone="bad">{liftSoon} sur un démarrage proche</Note>} />
        <StatCard href="#derives" tone={driftTone} label="Dérives" value={late.length || over.length ? `${plural(late.length, "retard")} · ${plural(over.length, "surcharge")}` : "Aucune"} />
      </div>

      <Block id="demarrages" title="Prochains démarrages" count={starts.length}
        action={<Button size="sm" variant="ghost" onClick={() => onView("settings")}><Settings size={12} />Délais</Button>}>
        {starts.length ? <>
          <div className="grid grid-cols-[96px_minmax(0,1fr)_64px_150px_150px] items-center gap-3 px-4 py-2 text-[11px] text-stone-400">
            <span>Démarre</span><span>Item</span><span>Owners</span>{KINDS.map((k) => <span key={k}>{PREP[k].label}</span>)}
          </div>
          {starts.map(({ item, start, due }) => (
            <div key={item.id} data-row={item.id} className="grid grid-cols-[96px_minmax(0,1fr)_64px_150px_150px] items-center gap-3 px-4 py-2">
              <span className="flex flex-col tabular-nums"><span>{fmtDay(start)}</span><span className="text-[11px] text-stone-400">{inDays(start)}</span></span>
              <span className="flex min-w-0 items-center gap-2"><StatusIcon status={item.status} />{title(item)}</span>
              <AvatarStack people={ownersOf(item)} />
              {KINDS.map((k) => <PrepToggle key={k} item={item} kind={k} due={due.includes(k)} from={dueOn(start, leads[k])} store={store} me={me} />)}
            </div>
          ))}
        </> : <Empty>Aucun démarrage d&apos;ici {horizon} j ouvrés.</Empty>}
      </Block>

      <Block id="dependances" title="Dépendances et blocages à lever" count={lift.length}>
        {lift.length ? lift.map(({ item, start, tag: e }) => {
          const { label, Icon, cls } = TAGS[e.tag];
          const started = !!start && start <= today && item.status !== "todo";
          return (
            <div key={e.id} data-row={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cx("flex size-5 shrink-0 items-center justify-center rounded-[5px]", cls)} title={label}><Icon size={12} strokeWidth={2.5} /></span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate"><span className="font-medium">{label}</span>{e.reason && <> · {e.reason}</>}</span>
                <span className="flex min-w-0 items-center gap-1 text-xs text-stone-500">
                  <button onClick={() => onOpenItem(item.id)} className="truncate underline-offset-2 hover:underline">{item.title || "Sans titre"}</button>
                  <span className="shrink-0">· posé le {fmtDay(e.on)}{e.by && ` par ${e.by.split("@")[0]}`}</span>
                </span>
              </div>
              <span className={cx("w-36 shrink-0 text-right text-xs tabular-nums", start && start <= today ? TONE.bad : soon(start) ? TONE.warn : TONE.muted)}>
                {!start ? "Non planifié" : started ? "En cours" : `Démarre ${start <= today ? "aujourd'hui" : `le ${fmtDay(start)}`}`}
              </span>
              <Button size="sm" onClick={() => liftTag(item, e)}><Check size={12} />Lever</Button>
              <IconButton size="sm" label="Supprimer (n'existe plus ou posé par erreur)"
                onClick={() => store.removeTag(item, e.id, `Tag « ${label} » supprimé de « ${item.title || "Sans titre"} »`)}><Trash2 size={13} /></IconButton>
            </div>
          );
        }) : <Empty>Rien à lever.</Empty>}
      </Block>

      <Block id="derives" title="Dérives" count={late.length + over.length}>
        <div className="grid divide-y divide-stone-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col">
            <h3 className="px-4 pb-1 pt-2.5 text-[11px] text-stone-400">Retards et glissements</h3>
            {late.length ? late.map(({ item, span, n }) => (
              <div key={item.id} data-row={item.id} className="flex items-center gap-2.5 px-4 py-2">
                <StatusIcon status={item.status} />
                <span className="flex min-w-0 flex-1">{title(item)}</span>
                <span className="shrink-0 text-xs text-stone-500">{span.planned! < today ? "En retard" : "Glissement prévu"}</span>
                <span className="shrink-0 rounded-[4px] bg-amber-100 px-1 text-[11px] font-medium leading-4 tabular-nums text-amber-800">+{n} j</span>
              </div>
            )) : <Empty>Aucun retard.</Empty>}
          </div>
          <div className="flex flex-col">
            <h3 className="px-4 pb-1 pt-2.5 text-[11px] text-stone-400">Surcharges</h3>
            {over.length ? over.map(({ p, from, to, peak }) => (
              <button key={p.id} data-person-row onClick={() => onOpenPerson(p.id)} className="flex items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-stone-50">
                <Avatar person={p} size={20} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-stone-500">du {fmtDay(toIso(from))} au {fmtDay(toIso(to))}</span>
                <span className="shrink-0 rounded-[4px] bg-red-50 px-1 text-[11px] font-medium leading-4 tabular-nums text-red-700">{Math.round(peak * 100)} %</span>
              </button>
            )) : <Empty>Aucune surcharge.</Empty>}
          </div>
        </div>
      </Block>
    </ContentPage>
  );
}

/** Verdict d'un jalon, factuel : marge (vert, ambre si ≤ une semaine) ou retard à rattraper (rouge). */
function Verdict({ m, big }: { m: ReturnType<typeof upcomingMilestones>[number]; big?: boolean }) {
  const days = (n: number) => `${n} j ouvré${n > 1 ? "s" : ""}`;
  const unplanned = m.unplanned ? ` · ${m.unplanned} item${m.unplanned > 1 ? "s" : ""} non planifié${m.unplanned > 1 ? "s" : ""}` : "";
  const [tone, text] = {
    ok: ["ok", big ? `Marge de ${days(m.margin)}` : `Marge ${m.margin} j`],
    tight: ["warn", (big ? `Marge de ${days(m.margin)}` : `Marge ${m.margin} j`) + unplanned],
    late: ["bad", big ? `${days(m.worst)} de retard à rattraper` : `+${m.worst} j à rattraper`],
    none: ["muted", "Aucun item rattaché"],
  }[m.tone] as [Tone, string];
  const dot = tone === "muted" ? "bg-stone-300" : TONE_DOT[tone];
  return (
    <span className={cx("inline-flex items-center gap-2", TONE[tone], big ? "text-[15px] font-semibold" : "text-xs font-medium")}>
      <span className={cx("shrink-0 rounded-full", dot, big ? "size-2.5" : "size-2")} />{text}
    </span>
  );
}

const Block = ({ id, title, count, action, children }: { id: string; title: string; count: number; action?: ReactNode; children: ReactNode }) => (
  <section id={id} className="flex scroll-mt-6 flex-col gap-2.5">
    <div className="flex items-center gap-3">
      <h2 className="flex flex-1 items-baseline gap-1.5 text-[15px] font-semibold tracking-tight">{title}<span className="text-xs font-normal tabular-nums text-stone-400">{count}</span></h2>
      {action}
    </div>
    <div className="flex flex-col divide-y divide-stone-100 overflow-hidden rounded-[10px] border border-stone-200/80 bg-surface">{children}</div>
  </section>
);

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="flex items-center gap-2 px-4 py-3.5 text-[13px] text-stone-400"><Check size={14} className="text-green-600" />{children}</p>
);
