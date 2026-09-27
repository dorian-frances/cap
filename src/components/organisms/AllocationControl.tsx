"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { allocationOn, fmtDay, pctLabel, todayIso, type Allocation, type Item } from "@/lib/plan";
import type { Store } from "@/lib/store";
import { DatePicker, IconButton, SectionTitle, SegmentedControl } from "../molecules";

const OPTIONS = [{ value: "1", label: "100 %" }, { value: "0.8", label: "80 %" }, { value: "0.5", label: "50 %" }, { value: "0.2", label: "20 %" }, { value: "0", label: "En attente" }];

/** Retire les entrées qui ne changent rien (même valeur que la précédente, 100 % au départ). */
const normalize = (list: Allocation[]) => {
  let prev = 1;
  return [...list].sort((a, b) => a.from.localeCompare(b.from)).filter((a) => (a.pct === prev ? false : ((prev = a.pct), true)));
};

/** Part du temps des owners consacrée à une tâche en cours, à partir d'une date (aujourd'hui par défaut). */
export default function AllocationControl({ item, ownerNames, store }: { item: Item; ownerNames: string; store: Store }) {
  const [from, setFrom] = useState(todayIso());
  const list = normalize(item.allocations ?? []);
  const set = (pct: number) => store.updateItems([item.id], { allocations: normalize([...list.filter((a) => a.from !== from), { from, pct }]) });
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Allocation</SectionTitle>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <SegmentedControl label="Allocation" value={String(allocationOn(item, from))} onChange={(v) => set(Number(v))} options={OPTIONS} />
        <span className="text-stone-500">à partir du</span>
        <DatePicker variant="ghost" label="Date d'effet de l'allocation" value={from} onChange={(d) => d && setFrom(d)} />
      </div>
      {list.map((a) => (
        <div key={a.from} className="group flex animate-fade-in items-center gap-2 text-[13px] text-stone-700">
          <span className="flex-1">{pctLabel(a.pct)} à partir du {fmtDay(a.from, true)}</span>
          <IconButton size="sm" tooltip={false} label="Retirer ce changement" onClick={() => store.updateItems([item.id], { allocations: list.filter((x) => x.from !== a.from) })}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><X size={13} /></IconButton>
        </div>
      ))}
      <p className="text-xs text-stone-400">Part du temps de {ownerNames || "ses owners"} consacrée à la tâche ; le reste va à leurs autres tâches, en parallèle. Au-delà de 100 % cumulés, les tâches ralentissent et la personne est signalée en surcharge.</p>
    </section>
  );
}
