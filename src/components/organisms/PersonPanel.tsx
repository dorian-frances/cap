"use client";

import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { orderItems, todayIso, fmtDay, type Person, type Plan } from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { Avatar, Button, InlineInput, Input, StatusIcon } from "../atoms";
import { ConfirmDialog, DateRangePicker, Field, IconButton, SectionTitle, Select, SidePanel, SidePanelBody, fmtRange, type Range } from "../molecules";
import { PALETTE, personColor } from "../tokens";

export const CAPACITIES = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((v) => ({ value: String(v), label: `${v} %${v === 100 ? " (plein temps)" : ""}` }));

export default function PersonPanel({ person, data, plan, store, closing, onClose, onOpenItem }: {
  person: Person; data: Data; plan: Plan; store: Store; closing?: boolean; onClose: () => void; onOpenItem: (id: string) => void;
}) {
  const mine = orderItems(data.items).filter((r) => !r.hasChildren && r.item.owner_ids.includes(person.id));
  const abs = data.absences.filter((a) => a.person_id === person.id);
  const [range, setRange] = useState<Range | null>(null);
  const [label, setLabel] = useState("");
  const fresh = person.name === "Nouvelle personne";
  const today = todayIso();
  const doing = mine.filter((r) => r.item.status === "doing" && (!r.item.started_on || r.item.started_on <= today));

  return (
    <SidePanel label="Fiche personne" width={400} closing={closing}
      header={<>
        <span className="flex-1">Personne</span>
        <ConfirmDialog danger title={`Retirer ${person.name} de l'équipe ?`} confirmLabel="Retirer" cancelLabel="Garder"
          description={mine.length ? `${mine.length} item${mine.length > 1 ? "s" : ""} n'auront plus cet owner et ses absences seront supprimées.` : "Ses absences seront supprimées."}
          onConfirm={() => { store.deletePerson(person.id); onClose(); }}
          trigger={<IconButton label="Retirer de l'équipe"><Trash2 size={14} /></IconButton>} />
        <IconButton label="Fermer" kbd="Échap" onClick={onClose}><X size={14} /></IconButton>
      </>}>
      <SidePanelBody contentKey={person.id}>
        <div className="flex items-center gap-3">
          <Avatar person={person} size={36} />
          <InlineInput size="lg" key={person.id + person.name} defaultValue={person.name} aria-label="Nom" autoFocus={fresh}
            onFocus={(e) => fresh && e.currentTarget.select()}
            onBlur={(e) => e.target.value.trim() && e.target.value !== person.name && store.updatePerson(person.id, { name: e.target.value.trim() })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="flex-1" />
        </div>
        <Field label="Couleur">
          <div role="radiogroup" aria-label="Couleur" className="grid grid-cols-12 gap-1.5">
            {PALETTE.map(([bg, fg], i) => {
              const owner = data.people.find((x) => x.id !== person.id && personColor(x) === PALETTE[i]);
              const on = personColor(person) === PALETTE[i];
              return (
                <button key={i} role="radio" aria-checked={on} disabled={!!owner} aria-label={owner ? `Couleur prise par ${owner.name}` : `Couleur ${i + 1}`}
                  title={owner ? `Déjà prise par ${owner.name}` : undefined} onClick={() => store.updatePerson(person.id, { color: i })}
                  className="flex aspect-square w-full items-center justify-center rounded-full transition-[transform,box-shadow] duration-150 enabled:hover:scale-110 disabled:opacity-25"
                  style={{ background: bg, color: fg, boxShadow: on ? `0 0 0 2px var(--color-surface), 0 0 0 3.5px ${fg}` : `inset 0 0 0 1px color-mix(in srgb, ${fg} 20%, transparent)` }}>
                  {on && <Check size={12} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </Field>
        <Field inline label="Disponibilité">
          <Select label="Disponibilité" className="w-44" options={CAPACITIES} value={String(Math.round(person.capacity * 100))}
            onValueChange={(v) => store.updatePerson(person.id, { capacity: Number(v) / 100 })} />
        </Field>
        {doing.length > 0 && (
          <section className="flex flex-col gap-1">
            <SectionTitle>En cours aujourd&apos;hui</SectionTitle>
            {doing.map(({ item }) => (
              <button key={item.id} onClick={() => onOpenItem(item.id)} className="-mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-stone-50">
                <StatusIcon status={item.status} /><span className="min-w-0 flex-1 truncate">{item.title || "Sans titre"}</span>
              </button>
            ))}
          </section>
        )}
        <section className="flex flex-col gap-1">
          <SectionTitle>Items, par ordre de priorité</SectionTitle>
          {mine.map(({ item }, i) => {
            const s = plan.spans.get(item.id);
            return (
              <button key={item.id} onClick={() => onOpenItem(item.id)} className="-mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-stone-50">
                <span className="w-4 text-xs tabular-nums text-stone-400">{i + 1}</span><StatusIcon status={item.status} />
                <span className="min-w-0 flex-1 truncate">{item.title || "Sans titre"}</span>
                <span className="text-xs text-stone-400">{s ? `${fmtDay(s.start)} → ${fmtDay(s.end)}` : ""}</span>
              </button>
            );
          })}
          {!mine.length && <p className="text-[13px] text-stone-400">Aucun item assigné.</p>}
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>Absences</SectionTitle>
          {abs.map((a) => (
            <div key={a.id} className="group flex animate-fade-in items-center gap-2 text-[13px]">
              <span className="flex-1">{fmtRange({ start: a.start_date, end: a.end_date })}{a.label && <span className="text-stone-400"> · {a.label}</span>}</span>
              <IconButton size="sm" label="Supprimer l'absence" tooltip={false} onClick={() => store.deleteAbsence(a.id)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><Trash2 size={13} /></IconButton>
            </div>
          ))}
          <form className="flex flex-col gap-1.5" onSubmit={(e) => {
            e.preventDefault();
            if (!range) return;
            store.addAbsences([{ person_id: person.id, start_date: range.start, end_date: range.end, label }]);
            setRange(null); setLabel("");
          }}>
            <DateRangePicker label="Période d'absence" value={range} onChange={setRange} placeholder="Ajouter une absence…" />
            {range && (
              <div className="flex animate-fade-in gap-1.5">
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Motif (optionnel)" aria-label="Motif" className="min-w-0 flex-1" />
                <Button type="submit" variant="primary" size="form"><Plus size={13} />Ajouter</Button>
              </div>
            )}
          </form>
        </section>
      </SidePanelBody>
    </SidePanel>
  );
}
