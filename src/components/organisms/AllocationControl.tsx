"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { allocationOn, fmtDay, pctLabel, todayIso, type Allocation, type Item, type Person } from "@/lib/plan";
import type { Store } from "@/lib/store";
import { Avatar } from "../atoms";
import { DatePicker, IconButton, SectionTitle, SegmentedControl } from "../molecules";

// 0 % = en attente (la tâche n'avance plus sans libérer la personne de son engagement).
const OPTIONS = ["1", "0.8", "0.5", "0.2", "0"].map((v) => ({ value: v, label: `${Math.round(Number(v) * 100)} %` }));

/** Retire, personne par personne, les entrées qui ne changent rien (100 % au départ). */
const normalize = (list: Allocation[]) => {
  const prev = new Map<string, number>();
  return [...list].sort((a, b) => a.from.localeCompare(b.from)).filter((a) => {
    const k = a.person ?? "";
    if ((prev.get(k) ?? 1) === a.pct) return false;
    prev.set(k, a.pct);
    return true;
  });
};

/** Allocations de l'item après avoir mis `person` à `pct` (daté : à partir de `from`, sinon dès le démarrage). */
export const withAllocation = (item: Item, person: string, pct: number, from: string, dated: boolean) => {
  const list = normalize(item.allocations ?? []);
  return normalize([...list.filter((a) => (a.person ?? "") !== person || (dated && a.from !== from)), { from, pct, person }]);
};

/**
 * Part du temps de chaque owner consacrée à la tâche (« Alice 100 %, Bob 20 % en aide »).
 * Tâche en cours : changement daté (« à partir du … »). Tâche à faire : vaut dès son démarrage.
 */
export default function AllocationControl({ item, owners, dated, store }: { item: Item; owners: Person[]; dated: boolean; store: Store }) {
  const today = todayIso();
  const list = normalize(item.allocations ?? []);
  // À la réouverture : le dernier changement à venir s'il y en a un, sinon aujourd'hui.
  const [picked, setPicked] = useState(() => [today, ...list.map((a) => a.from)].sort().at(-1)!);
  const from = dated ? picked : today;
  const set = (person: string, pct: number) => store.updateItems([item.id], { allocations: withAllocation(item, person, pct, from, dated) });
  const nameOf = (id?: string) => (id ? owners.find((o) => o.id === id)?.name ?? "Ancien owner" : "Tous les owners");
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SectionTitle>Allocation</SectionTitle>
        <span className="flex-1" />
        {dated && <span className="text-xs text-stone-500">à partir du</span>}
        {dated && <DatePicker variant="ghost" label="Date d'effet de l'allocation" value={picked} onChange={(d) => d && setPicked(d)} />}
      </div>
      {owners.map((o) => (
        <div key={o.id} className="flex items-center gap-2 text-[13px]">
          <Avatar person={o} size={20} />
          <span className="min-w-0 flex-1 truncate">{o.name}</span>
          <SegmentedControl label={`Allocation de ${o.name}`} value={String(allocationOn(item, from, o.id))} onChange={(v) => set(o.id, Number(v))} options={OPTIONS} />
        </div>
      ))}
      {dated && list.map((a) => (
        <div key={`${a.person}-${a.from}`} className="group flex animate-fade-in items-center gap-2 text-xs text-stone-600">
          <span className="flex-1">{nameOf(a.person)} : {pctLabel(a.pct)} à partir du {fmtDay(a.from, true)}</span>
          <IconButton size="sm" tooltip={false} label="Retirer ce changement" onClick={() => store.updateItems([item.id], { allocations: list.filter((x) => x !== a) })}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><X size={13} /></IconButton>
        </div>
      ))}
      <p className="text-xs text-stone-400">
        Part du temps total de chacun consacrée à la tâche (0 % = en attente). Une personne en aide ne retarde pas son démarrage et continue ses autres tâches avec le reste de son temps. Au-delà de 100 % cumulés avec ses autres tâches en cours et sa part défauts, elle est signalée en surcharge.
      </p>
    </section>
  );
}
