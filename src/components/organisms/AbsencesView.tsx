"use client";

import { Plus, Trash2 } from "lucide-react";
import { todayIso } from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { Avatar, Button } from "../atoms";
import { IconButton, fmtRange } from "../molecules";
import { ContentPage, Section } from "../templates/ContentPage";

export default function AbsencesView({ data, store, onAdd }: { data: Data; store: Store; onAdd: () => void }) {
  const today = todayIso();
  const upcoming = data.absences.filter((a) => a.end_date >= today);
  const past = data.absences.filter((a) => a.end_date < today);
  const row = (a: Data["absences"][number]) => {
    const p = data.people.find((x) => x.id === a.person_id);
    return (
      <div key={a.id} className="group flex h-10 animate-fade-in items-center gap-3 border-b border-stone-100 px-2 text-[13px]">
        {p && <Avatar person={p} />}<span className="w-40 truncate font-medium">{p?.name}</span>
        <span className="w-52 tabular-nums text-stone-600">{fmtRange({ start: a.start_date, end: a.end_date })}</span>
        <span className="flex-1 truncate text-stone-400">{a.label}</span>
        <IconButton label="Supprimer l'absence" tooltip={false} onClick={() => store.deleteAbsence(a.id)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><Trash2 size={14} /></IconButton>
      </div>
    );
  };
  return (
    <ContentPage title="Absences" description="Elles décalent automatiquement les dates. Pour un jour férié, choisissez « Toute l'équipe »."
      actions={<Button variant="primary" onClick={onAdd}><Plus size={14} />Ajouter une absence</Button>}>
      <section>{upcoming.length ? upcoming.map(row) : <p className="text-[13px] text-stone-400">Aucune absence à venir.</p>}</section>
      {past.length > 0 && <Section title="Passées"><div className="opacity-60">{past.map(row)}</div></Section>}
    </ContentPage>
  );
}
