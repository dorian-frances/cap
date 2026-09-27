"use client";

import { ArrowRight, CalendarDays, ChevronRight, Divide, Link2, Trash2, TriangleAlert, X, CircleSlash } from "lucide-react";
import {
  absentSet, isWeekend, lateBy, toDay, totalJh, unplannedReason, workingDays,
  type Item, type Plan,
} from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import type { PickKind } from "./Timeline";
import { Avatar, Diamond, Kbd, STATUS, StatusIcon, fmtDay } from "./ui";

type Props = {
  item: Item;
  data: Data;
  plan: Plan;
  store: Store;
  onClose: () => void;
  onOpen: (id: string) => void;
  onPick: (kind: PickKind, anchor: Element) => void;
  onMoveUp: () => void;
  readOnly?: boolean;
};

const chip = "flex h-[26px] items-center gap-1.5 rounded-md border border-stone-200 bg-white px-2 text-xs hover:bg-stone-50 disabled:hover:bg-white";

export default function ItemPanel({ item, data, plan, store, onClose, onOpen, onPick, onMoveUp, readOnly }: Props) {
  const { items, people, absences } = data;
  const span = plan.spans.get(item.id);
  const kids = items.filter((i) => i.parent_id === item.id && i.type === "feature").sort((a, b) => a.position - b.position);
  const isParent = kids.length > 0;
  const owners = people.filter((p) => item.owner_ids.includes(p.id));
  const target = items.find((i) => i.id === item.target_id);
  const late = lateBy(item, span, items);
  const crumbs: Item[] = [];
  for (let p = items.find((i) => i.id === item.parent_id); p; p = items.find((i) => i.id === p!.parent_id)) crumbs.unshift(p);

  const why: { icon: React.ReactNode; text: React.ReactNode; muted?: boolean }[] = [];
  if (span) {
    why.push({ icon: <CalendarDays size={14} />, text: `Du ${fmtDay(span.start)} au ${fmtDay(span.end)} · ${workingDays(span.start, span.end)} jours ouvrés` });
    if (isParent) {
      why.push({ icon: <Divide size={14} />, text: `Enveloppe de ${kids.length} sous-item${kids.length > 1 ? "s" : ""} · ${totalJh(items, item.id)} j au total` });
    } else {
      const cap = owners.reduce((s, o) => s + Number(o.capacity), 0);
      const who = owners.map((o) => `${o.name}${Number(o.capacity) < 1 ? ` à ${Math.round(o.capacity * 100)} %` : ""}`).join(" + ");
      why.push({ icon: <Divide size={14} />, text: `${Number(item.estimate_jh)} j ÷ ${who} = ${Math.ceil(Number(item.estimate_jh) / cap)} jours de travail` });
      const prev = items.find((i) => i.id === plan.after.get(item.id));
      if (prev) {
        const shared = people.find((p) => prev.owner_ids.includes(p.id) && item.owner_ids.includes(p.id));
        const prevSpan = plan.spans.get(prev.id);
        why.push({
          icon: <ArrowRight size={14} />,
          text: <>Démarre quand {shared?.name ?? "l'équipe"} termine{" "}
            <button onClick={() => onOpen(prev.id)} className="underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500">{prev.title || "Sans titre"}</button>
            {prevSpan && ` (${fmtDay(prevSpan.end)})`}</>,
        });
      } else {
        why.push({ icon: <ArrowRight size={14} />, text: `Démarre dès que possible (début du projet le ${fmtDay(data.project.start_date)})` });
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
    <aside aria-label="Détail de l'item" className="absolute bottom-0 right-0 top-0 z-30 flex w-[440px] max-w-full flex-col border-l border-stone-200 bg-white shadow-[-16px_0_40px_-16px_rgba(28,25,23,.22)]">
      <div className="flex h-11 shrink-0 items-center gap-1.5 pl-5 pr-3 text-xs text-stone-500">
        {crumbs.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <button onClick={() => onOpen(c.id)} className="max-w-[120px] truncate hover:text-stone-900">{c.title || "Sans titre"}</button>
            <ChevronRight size={12} className="text-stone-300" />
          </span>
        ))}
        <span className="truncate text-stone-600">{item.title || "Sans titre"}</span>
        <span className="flex-1" />
        {!readOnly && (
          <>
            <button aria-label="Copier le lien" title="Copier le lien" onClick={() => navigator.clipboard.writeText(location.href)}
              className="flex size-[26px] items-center justify-center rounded-md hover:bg-stone-100"><Link2 size={14} /></button>
            <button aria-label="Supprimer" title="Supprimer" onClick={() => { store.deleteItems([item.id], `« ${item.title || "Sans titre"} » supprimé`); onClose(); }}
              className="flex size-[26px] items-center justify-center rounded-md hover:bg-stone-100"><Trash2 size={14} /></button>
          </>
        )}
        <button aria-label="Fermer" title="Fermer (Échap)" onClick={onClose} className="flex size-[26px] items-center justify-center rounded-md hover:bg-stone-100"><X size={14} /></button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6 pt-2">
        {readOnly ? <h2 className="text-[22px] font-semibold tracking-tight">{item.title || "Sans titre"}</h2> : (
          <input key={item.id + item.title} defaultValue={item.title} aria-label="Titre" placeholder="Sans titre"
            onBlur={(e) => e.target.value !== item.title && store.updateItems([item.id], { title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="-mx-1 rounded px-1 text-[22px] font-semibold tracking-tight outline-none placeholder:text-stone-300 focus:bg-stone-50" />
        )}

        <div className="flex flex-wrap gap-1.5">
          {!isParent && (
            <button disabled={readOnly} className={chip} onClick={(e) => onPick("status", e.currentTarget)}>
              <StatusIcon status={item.status} size={13} />{STATUS[item.status].label}
            </button>
          )}
          {isParent ? <span className={chip}>Σ {totalJh(items, item.id)} j</span> : (
            <button disabled={readOnly} className={`${chip} tabular-nums`} onClick={(e) => onPick("estimate", e.currentTarget)}>
              {Number(item.estimate_jh) ? `${Number(item.estimate_jh).toLocaleString("fr-FR")} j` : "Estimer"}
            </button>
          )}
          {!isParent && (
            <button disabled={readOnly} className={`${chip} pl-1`} onClick={(e) => onPick("owners", e.currentTarget)}>
              {owners.length ? owners.map((o) => <Avatar key={o.id} person={o} size={18} />) : <span className="pl-1 text-stone-500">Assigner</span>}
              {owners.length === 1 && owners[0].name}
            </button>
          )}
          <button disabled={readOnly} onClick={(e) => onPick("milestone", e.currentTarget)}
            className={`${chip} ${late ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-50" : ""}`}>
            {target ? <><Diamond late={late > 0} />{target.title}</> : <span className="text-stone-500">Jalon cible</span>}
          </button>
        </div>

        {late > 0 && target && (
          <div className="flex flex-col gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3.5 py-3">
            <div className="flex items-center gap-2 font-semibold text-red-800"><TriangleAlert size={14} className="text-red-600" />
              {late} jour{late > 1 ? "s" : ""} ouvré{late > 1 ? "s" : ""} après {target.title}</div>
            <div className="text-[12.5px] text-red-800/80">Fin calculée le {fmtDay(span!.end)}, le jalon est le {fmtDay(target.milestone_date!)}.</div>
            {!readOnly && !isParent && (
              <div className="flex gap-1.5">
                <button onClick={(e) => onPick("owners", e.currentTarget)} className="h-6 rounded-md border border-red-200 bg-white px-2 text-xs text-red-900 hover:bg-red-50">Ajouter un owner</button>
                <button onClick={onMoveUp} className="h-6 rounded-md border border-red-200 bg-white px-2 text-xs text-red-900 hover:bg-red-50">Monter en priorité</button>
              </div>
            )}
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-stone-500">Pourquoi ces dates</h3>
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
            <h3 className="text-xs font-medium text-stone-500">Sous-items</h3>
            {kids.map((k) => {
              const s = plan.spans.get(k.id);
              return (
                <button key={k.id} onClick={() => onOpen(k.id)} className="-mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-left hover:bg-stone-50">
                  <StatusIcon status={k.status} /><span className="min-w-0 flex-1 truncate">{k.title || "Sans titre"}</span>
                  <span className="text-xs text-stone-400">{s ? fmtDay(s.end) : "non planifié"}</span>
                </button>
              );
            })}
          </section>
        )}

        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium text-stone-500">Description</h3>
          {readOnly ? <p className="whitespace-pre-wrap text-[13px] text-stone-700">{item.description || "—"}</p> : (
            <textarea key={item.id} defaultValue={item.description ?? ""} placeholder="Ajouter une description…" rows={4}
              onBlur={(e) => e.target.value !== (item.description ?? "") && store.updateItems([item.id], { description: e.target.value })}
              className="-mx-2 resize-y rounded-md px-2 py-1.5 text-[13px] leading-relaxed outline-none placeholder:text-stone-400 hover:bg-stone-50 focus:bg-stone-50" />
          )}
        </section>
      </div>

      <div className="flex h-10 shrink-0 items-center gap-3 border-t border-stone-100 px-5 text-xs text-stone-400">
        <span className="flex-1">{span ? `Fin le ${fmtDay(span.end, true)}` : ""}</span>
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> item suivant</span>
        <span className="flex items-center gap-1"><Kbd>Échap</Kbd> fermer</span>
      </div>
    </aside>
  );
}
