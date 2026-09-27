"use client";

import { ArrowRight, CalendarDays, ChevronRight, CircleSlash, Divide, Link2, Trash2, TriangleAlert, X } from "lucide-react";
import {
  absentSet, isWeekend, lateBy, toDay, totalJh, unplannedReason, workingDays, fmtDay,
  type Item, type Plan,
} from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import type { PickKind } from "./Timeline";
import { Avatar, Button, Chip, Diamond, InlineInput, Kbd, StatusIcon, Textarea } from "../atoms";
import { IconButton, SectionTitle, SidePanel, SidePanelBody } from "../molecules";
import { STATUS } from "../tokens";

type Props = {
  item: Item;
  data: Data;
  plan: Plan;
  store: Store;
  closing?: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onPick: (kind: PickKind, anchor: Element) => void;
  onMoveUp: () => void;
};

export default function ItemPanel({ item, data, plan, store, closing, onClose, onOpen, onPick, onMoveUp }: Props) {
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
            <button onClick={() => onOpen(prev.id)} className="underline decoration-stone-300 underline-offset-2 transition-colors hover:decoration-stone-500">{prev.title || "Sans titre"}</button>
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
          <InlineInput size="xl" key={item.id + item.title} defaultValue={item.title} aria-label="Titre" placeholder="Sans titre"
            onBlur={(e) => e.target.value !== item.title && store.updateItems([item.id], { title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
          <div className="flex flex-wrap gap-1.5">
            {!isParent && (
              <Chip onClick={(e) => onPick("status", e.currentTarget)}><StatusIcon status={item.status} size={13} />{STATUS[item.status].label}</Chip>
            )}
            {isParent ? <Chip disabled>Σ {totalJh(items, item.id)} j</Chip> : (
              <Chip className="tabular-nums" onClick={(e) => onPick("estimate", e.currentTarget)}>
                {Number(item.estimate_jh) ? `${Number(item.estimate_jh).toLocaleString("fr-FR")} j` : <span className="text-stone-500">Estimer</span>}
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

        {late > 0 && target && (
          <div className="flex animate-rise-in flex-col gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3.5 py-3 text-[13px]">
            <div className="flex items-center gap-2 font-semibold text-red-800"><TriangleAlert size={14} className="text-red-600" />
              {late} jour{late > 1 ? "s" : ""} ouvré{late > 1 ? "s" : ""} après {target.title}</div>
            <div className="text-[12.5px] text-red-800/80">Fin calculée le {fmtDay(span!.end)}, le jalon est le {fmtDay(target.milestone_date!)}.</div>
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
