"use client";

import { ArrowRight, CalendarCheck, CalendarDays, Check, ChevronRight, CircleSlash, Clock, Divide, Link2, Play, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import {
  absentSet, allocationOn, itemOverload, isWeekend, pctLabel, toIso, lateBy, overdue, slip, toDay, todayIso, totalJh, unplannedReason, workJh, workingDays, fmtDay,
  type Item, type Plan, type TagEntry,
} from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { cx } from "@/lib/cx";
import type { PickKind } from "./Timeline";
import { Avatar, Button, Chip, Diamond, InlineTextarea, Kbd, StatusIcon, Textarea } from "../atoms";
import { IconButton, SectionTitle, SidePanel, SidePanelBody, toasts } from "../molecules";
import AllocationControl, { withAllocation } from "./AllocationControl";
import { STATUS, TAGS } from "../tokens";

type Props = {
  item: Item;
  data: Data;
  plan: Plan;
  store: Store;
  me: string;
  closing?: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onPick: (kind: PickKind, anchor: Element) => void;
  onMoveUp: () => void;
};

export default function ItemPanel({ item, data, plan, store, me, closing, onClose, onOpen, onPick, onMoveUp }: Props) {
  const { items, people, absences } = data;
  const span = plan.spans.get(item.id);
  const kids = items.filter((i) => i.parent_id === item.id && i.type === "feature").sort((a, b) => a.position - b.position);
  const isParent = kids.length > 0;
  const owners = people.filter((p) => item.owner_ids.includes(p.id));
  const target = items.find((i) => i.id === item.target_id);
  const late = lateBy(item, span, items);
  const behind = !isParent && overdue(item, span);
  const today = todayIso();
  // Surcharge des owners sur la période : ce qui s'additionne, et l'allocation qui la ferait disparaître.
  const surcharge = isParent || item.status === "done" ? [] : [...itemOverload(plan, item)].map(([id, ov]) => {
    const o = owners.find((x) => x.id === id)!;
    const day = toIso(ov.from);
    const mine = allocationOn(item, day, id);
    const defect = Number(o.defect_share ?? 0);
    const others = [...ov.others].map((oid) => items.find((i) => i.id === oid)!).filter(Boolean);
    const room = 1 - defect - others.reduce((sum, x) => sum + allocationOn(x, day, id), 0);
    const fit = [0.8, 0.5, 0.2].find((v) => v <= room + 1e-9 && v < mine);
    return { o, ov, mine, defect, others, fit };
  }).filter((x) => x.o);
  const reduced = (item.allocations ?? []).filter((a) => a.pct < 1 && span && a.from <= span.end).sort((a, b) => a.from.localeCompare(b.from))[0];
  // Historique des tags : actifs d'abord, puis levés ; les plus récents en haut.
  const log = [...(item.tag_log ?? [])].sort((a, b) => Number(!!a.lifted_on) - Number(!!b.lifted_on) || (b.lifted_on ?? b.on).localeCompare(a.lifted_on ?? a.on));
  const setLog = (next: TagEntry[]) => store.updateItems([item.id], { tag_log: next });
  const lift = (e: TagEntry) => setLog((item.tag_log ?? []).map((x) => (x.id === e.id ? { ...x, lifted_on: today, lifted_by: me } : x)));
  const removeEntry = (e: TagEntry) => {
    const prev = item.tag_log ?? [];
    setLog(prev.filter((x) => x.id !== e.id));
    const tid = toasts.add({ title: `Tag « ${TAGS[e.tag].label} » supprimé`, timeout: 8000, actionProps: { children: "Annuler", onClick: () => { toasts.close(tid); setLog(prev); } } });
  };
  const who = (email?: string) => (email ? ` par ${email.split("@")[0]}` : "");
  const crumbs: Item[] = [];
  for (let p = items.find((i) => i.id === item.parent_id); p; p = items.find((i) => i.id === p!.parent_id)) crumbs.unshift(p);

  const why: { icon: React.ReactNode; text: React.ReactNode; muted?: boolean }[] = [];
  if (span) {
    why.push({ icon: <CalendarDays size={14} />, text: `Du ${fmtDay(span.start)} au ${fmtDay(span.end)} · ${workingDays(span.start, span.end)} jours ouvrés` });
    if (isParent) {
      why.push({ icon: <Divide size={14} />, text: `Enveloppe de ${kids.length} sous-item${kids.length > 1 ? "s" : ""} · ${totalJh(items, item.id)} j au total` });
    } else {
      // Démarrage : date réelle, ou calculé (au plus tôt aujourd'hui pour une tâche à faire).
      const prev = items.find((i) => i.id === plan.after.get(item.id));
      if (item.status !== "todo" && item.started_on) {
        why.push({ icon: <Play size={14} />, text: `${item.started_on > todayIso() ? "Démarre" : "Démarrée"} le ${fmtDay(item.started_on)}` });
      } else if (prev) {
        const shared = people.find((p) => prev.owner_ids.includes(p.id) && item.owner_ids.includes(p.id));
        const prevSpan = plan.spans.get(prev.id);
        const who = shared?.name ?? "l'équipe";
        const link = <button onClick={() => onOpen(prev.id)} className="underline decoration-stone-300 underline-offset-2 transition-colors hover:decoration-stone-500">{prev.title || "Sans titre"}</button>;
        const pctPrev = shared ? allocationOn(prev, span.start, shared.id) : 1;
        const parallel = prevSpan && prevSpan.end >= span.start && pctPrev < 1;
        why.push({
          icon: <ArrowRight size={14} />,
          text: parallel
            ? <>Avance en parallèle de {link}, où {who} est à {pctLabel(pctPrev)}</>
            : overdue(prev, prevSpan)
              ? <>Attend que {who} termine {link}, en retard de {slip(prevSpan)} j et toujours en cours</>
            : <>Démarre quand {who} termine {link}{prevSpan && ` (${fmtDay(prevSpan.end)})`}</>,
        });
      } else {
        why.push({ icon: <ArrowRight size={14} />, text: item.status === "todo" ? "Démarre dès que possible, au plus tôt aujourd'hui" : `Démarrée au plus tôt (début du projet le ${fmtDay(data.project.start_date)})` });
      }
      if (item.status === "doing" && (item.allocations ?? []).length)
        why.push({ icon: <Clock size={14} />, text: `Allocation : ${[...(item.allocations ?? [])].sort((a, b) => a.from.localeCompare(b.from))
          .map((a) => `${a.person ? `${people.find((p) => p.id === a.person)?.name ?? "?"} ` : ""}${pctLabel(a.pct)} à partir du ${fmtDay(a.from)}`).join(", ")}` });
      // Débit de départ : capacité de chaque owner × son allocation, dans la limite de ce que lui laissent les défauts.
      const effOf = (o: (typeof owners)[number], pct = allocationOn(item, span.start, o.id)) =>
        Number(o.capacity) * Math.min(pct, 1 - Number(o.defect_share ?? 0));
      const cap = owners.reduce((sum, o) => sum + effOf(o), 0) || owners.reduce((sum, o) => sum + effOf(o, 1), 0);
      const who = owners.map((o) => {
        const eff = effOf(o);
        const cut = Number(o.defect_share) > 0 && eff < Number(o.capacity) * allocationOn(item, span.start, o.id);
        return `${o.name}${eff < 1 ? ` à ${pctLabel(eff)}` : ""}${cut ? ` (${pctLabel(Number(o.defect_share))} sur les défauts)` : ""}`;
      }).join(" + ");
      const extra = Number(item.extra_jh ?? 0);
      why.push({ icon: <Divide size={14} />, text: extra
        ? `(${Number(item.estimate_jh)} j + ${extra} j d'avenant) ÷ ${who} = ${Math.ceil(workJh(item) / cap)} jours de travail · fin prévue le ${fmtDay(span.planned ?? span.end)} sans l'avenant`
        : `${Number(item.estimate_jh)} j ÷ ${who} = ${Math.ceil(Number(item.estimate_jh) / cap)} jours de travail · fin prévue le ${fmtDay(span.planned ?? span.end)}` });
      if (item.status === "done" && item.done_on) {
        const n = slip(span);
        why.push(n
          ? { icon: <CalendarCheck size={14} />, text: `Terminée le ${fmtDay(item.done_on)}, ${n} j ouvré${n > 1 ? "s" : ""} après la fin prévue` }
          : { icon: <CalendarCheck size={14} />, text: `Terminée le ${fmtDay(item.done_on)}${span.planned ? ", avant la fin prévue" : ", dans les temps"}` });
      }
      const off = absentSet(absences);
      const lost = owners.map((o) => {
        let n = 0;
        for (let d = toDay(span.start); d <= toDay(span.end); d++) if (off.has(`${o.id}:${d}`) && !isWeekend(d)) n++;
        return n ? `${o.name} absent·e ${n} j` : "";
      }).filter(Boolean);
      why.push(lost.length
        ? { icon: <CalendarDays size={14} />, text: `${lost.join(", ")} sur la période` }
        : { icon: <CircleSlash size={14} />, text: "Aucune absence sur la période", muted: true });
    }
  }

  return (
    <SidePanel label="Détail de l'item" closing={closing}
      header={<>
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <button onClick={() => onOpen(c.id)} className="max-w-[120px] truncate transition-colors hover:text-stone-900">{c.title || "Sans titre"}</button>
            <ChevronRight size={12} className="text-stone-300" />
          </span>
        ))}
        <span className="truncate text-stone-600">{item.title || "Sans titre"}</span>
        <span className="flex-1" />
        <IconButton label="Copier le lien" onClick={() => navigator.clipboard.writeText(location.href)}><Link2 size={14} /></IconButton>
        <IconButton label="Supprimer" kbd="⌫" onClick={() => { store.deleteItems([item.id], `« ${item.title || "Sans titre"} » supprimé`); onClose(); }}><Trash2 size={14} /></IconButton>
        <IconButton label="Fermer" kbd="Échap" onClick={onClose}><X size={14} /></IconButton>
      </>}
      footer={<>
        <span className="flex-1">{span ? `Fin le ${fmtDay(span.end, true)}` : ""}</span>
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> item suivant</span>
        <span className="flex items-center gap-1"><Kbd>Échap</Kbd> fermer</span>
      </>}>
      <SidePanelBody contentKey={item.id}>
        <div className="flex flex-col gap-3">
          <InlineTextarea key={item.id + item.title} defaultValue={item.title} aria-label="Titre" placeholder="Sans titre"
            onBlur={(e) => { const t = e.target.value.replace(/\s*\n\s*/g, " "); if (t !== item.title) store.updateItems([item.id], { title: t }); }} />
          <div className="flex flex-wrap gap-1.5">
            {!isParent && (
              <Chip onClick={(e) => onPick("status", e.currentTarget)}><StatusIcon status={item.status} size={13} />{STATUS[item.status].label}</Chip>
            )}
            {!isParent && item.status !== "todo" && (
              <Chip className="tabular-nums" onClick={(e) => onPick("start", e.currentTarget)}>
                <Play size={12} className="text-stone-400" />
                {item.started_on ? `Depuis le ${fmtDay(item.started_on)}` : <span className="text-stone-500">Date de début</span>}
              </Chip>
            )}
            {!isParent && item.status === "done" && (
              <Chip className="tabular-nums" onClick={(e) => onPick("done", e.currentTarget)}>
                <CalendarCheck size={12} className="text-stone-400" />
                {item.done_on ? `Terminée le ${fmtDay(item.done_on)}` : <span className="text-stone-500">Date de fin</span>}
              </Chip>
            )}
            {isParent ? <Chip disabled>Σ {totalJh(items, item.id)} j</Chip> : (
              <Chip className="tabular-nums" onClick={(e) => onPick("estimate", e.currentTarget)}>
                {Number(item.estimate_jh) ? `${Number(item.estimate_jh).toLocaleString("fr-FR")} j` : <span className="text-stone-500">Estimer</span>}
              </Chip>
            )}
            {!isParent && item.status !== "done" && (
              <Chip className="tabular-nums" onClick={(e) => onPick("extra", e.currentTarget)}>
                {Number(item.extra_jh) > 0
                  ? <span className="text-amber-700">+{Number(item.extra_jh).toLocaleString("fr-FR")} j d&apos;avenant</span>
                  : <span className="text-stone-500">Avenant</span>}
              </Chip>
            )}
            {!isParent && (
              <Chip className="pl-1" onClick={(e) => onPick("owners", e.currentTarget)}>
                {owners.length ? owners.map((o) => <Avatar key={o.id} person={o} size={18} />) : <span className="pl-1 text-stone-500">Assigner</span>}
                {owners.length === 1 && owners[0].name}
              </Chip>
            )}
            <Chip tone={late ? "danger" : "default"} onClick={(e) => onPick("milestone", e.currentTarget)}>
              {target ? <><Diamond late={late > 0} />{target.title}</> : <span className="text-stone-500">Jalon cible</span>}
            </Chip>
          </div>
        </div>

        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <SectionTitle>Tags</SectionTitle>
            <Button size="sm" variant="ghost" onClick={(e) => onPick("tags", e.currentTarget)}><Plus size={12} />Poser un tag</Button>
          </div>
          {log.length > 0 && (
            <ul className="flex flex-col gap-2">
              {log.map((e) => {
                const { label, Icon, cls } = TAGS[e.tag];
                return (
                  <li key={e.id} className={cx("flex animate-fade-in items-start gap-2.5 text-[13px]", e.lifted_on ? "text-stone-400" : "text-stone-700")}>
                    <span className={cx("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px]", e.lifted_on ? "bg-stone-100 text-stone-400" : cls)}><Icon size={10} strokeWidth={2.5} /></span>
                    <div className="min-w-0 flex-1">
                      <div><span className="font-medium">{label}</span>{e.reason && <> · {e.reason}</>}</div>
                      <div className="text-xs text-stone-400">
                        Posé le {fmtDay(e.on)}{who(e.by)}{e.lifted_on && <> · <Check size={11} className="inline" /> levé le {fmtDay(e.lifted_on)}{who(e.lifted_by)}</>}
                      </div>
                    </div>
                    {!e.lifted_on && <IconButton size="sm" label="Lever le tag" onClick={() => lift(e)}><Check size={14} /></IconButton>}
                    <IconButton size="sm" label="Supprimer (erreur de saisie)" onClick={() => removeEntry(e)}><Trash2 size={13} /></IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {behind && (
          <div className="flex animate-rise-in flex-col gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3.5 py-3 text-[13px]">
            <div className="flex items-center gap-2 font-semibold text-amber-900"><Clock size={14} className="text-amber-600" />
              {span!.planned! < today ? "En retard" : "Glissement prévu"} de {slip(span)} j ouvré{slip(span) > 1 ? "s" : ""} sur la fin prévue ({fmtDay(span!.planned!)})</div>
            <ul className="flex flex-col gap-1 text-[12.5px] text-amber-900/80">
              {surcharge.length > 0 && <li>Surcharge de {surcharge.map((x) => x.o.name).join(", ")} (détail ci-dessous).</li>}
              {Number(item.extra_jh) > 0 && <li>Avenant de +{Number(item.extra_jh).toLocaleString("fr-FR")} JH{item.extra_note ? ` : ${item.extra_note}` : ""}.</li>}
              {reduced && <li>Allocation réduite à {pctLabel(reduced.pct)} à partir du {fmtDay(reduced.from, true)}</li>}
              {span!.planned! < today && <li>Pas terminée à temps : elle garde son allocation jusqu&apos;à ce qu&apos;elle soit terminée, la suite de ses owners glisse.</li>}
            </ul>
            {item.status === "doing" && (
              <div className="flex gap-1.5">
                <Button size="sm" onClick={(e) => onPick("done", e.currentTarget)}>Terminer…</Button>
              </div>
            )}
          </div>
        )}

        {surcharge.map(({ o, ov, mine, defect, others, fit }) => (
          <div key={o.id} className="flex animate-rise-in flex-col gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3.5 py-3 text-[13px]">
            <div className="flex items-center gap-2 font-semibold text-red-800"><TriangleAlert size={14} className="text-red-600" />
              {o.name} en surcharge : {Math.round(ov.peak * 100)} % de son temps</div>
            <div className="text-[12.5px] text-red-800/80">
              {pctLabel(mine)} sur cette tâche
              {defect > 0 && <> + {pctLabel(defect)} sur les défauts</>}
              {others.map((x) => <span key={x.id}> + {pctLabel(allocationOn(x, toIso(ov.from), o.id))} sur{" "}
                <button onClick={() => onOpen(x.id)} className="underline decoration-red-300 underline-offset-2">{x.title || "Sans titre"}</button></span>)}
              , du {fmtDay(toIso(ov.from))} au {fmtDay(toIso(ov.to))} : impossible à tenir, la tâche n&apos;avance qu&apos;avec le temps qui reste et sa durée s&apos;allonge.
            </div>
            {fit !== undefined && (
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => store.updateItems([item.id], { allocations: withAllocation(item, o.id, fit, today, item.status === "doing") })}>
                  Passer {o.name} à {pctLabel(fit)} sur cette tâche
                </Button>
              </div>
            )}
          </div>
        ))}

        {!isParent && item.status !== "done" && owners.length > 0 && <AllocationControl key={item.id} item={item} owners={owners} dated={item.status === "doing"} store={store} />}

        {late > 0 && target && (
          <div className="flex animate-rise-in flex-col gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3.5 py-3 text-[13px]">
            <div className="flex items-center gap-2 font-semibold text-red-800"><TriangleAlert size={14} className="text-red-600" />
              {late} jour{late > 1 ? "s" : ""} ouvré{late > 1 ? "s" : ""} après {target.title}</div>
            <div className="text-[12.5px] text-red-800/80">Fin calculée le {fmtDay(span!.end)}, le jalon est le {fmtDay(target.milestone_date!, true)}</div>
            {!isParent && (
              <div className="flex gap-1.5">
                <Button size="sm" onClick={(e) => onPick("owners", e.currentTarget)}>Ajouter un owner</Button>
                <Button size="sm" onClick={onMoveUp}>Monter en priorité</Button>
              </div>
            )}
          </div>
        )}

        <section className="flex flex-col gap-2">
          <SectionTitle>Pourquoi ces dates</SectionTitle>
          {span ? (
            <ul className="flex flex-col gap-1.5 text-[13px] text-stone-700">
              {why.map((w, i) => (
                <li key={i} className={`flex items-start gap-2.5 ${w.muted ? "text-stone-400" : ""}`}>
                  <span className="mt-0.5 text-stone-400">{w.icon}</span><span>{w.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-amber-700">
              Non planifié : {isParent ? "aucun sous-item planifiable" : unplannedReason(item, people).toLowerCase()}.
              {!isParent && !owners.length && " Assignez quelqu'un pour calculer ses dates."}
            </p>
          )}
        </section>

        {isParent && (
          <section className="flex flex-col gap-1">
            <SectionTitle>Sous-items</SectionTitle>
            {kids.map((k) => {
              const s = plan.spans.get(k.id);
              return (
                <button key={k.id} onClick={() => onOpen(k.id)} className="-mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-stone-50">
                  <StatusIcon status={k.status} /><span className="min-w-0 flex-1 truncate">{k.title || "Sans titre"}</span>
                  <span className="text-xs text-stone-400">{s ? fmtDay(s.end) : "non planifié"}</span>
                </button>
              );
            })}
          </section>
        )}

        <section className="flex flex-col gap-1.5">
          <SectionTitle>Description</SectionTitle>
          <Textarea key={item.id} defaultValue={item.description ?? ""} placeholder="Ajouter une description…" rows={4}
            onBlur={(e) => e.target.value !== (item.description ?? "") && store.updateItems([item.id], { description: e.target.value })} />
        </section>
      </SidePanelBody>
    </SidePanel>
  );
}
