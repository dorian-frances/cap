"use client";

import { Check } from "lucide-react";
import type { Data } from "@/lib/store";
import { cx } from "@/lib/cx";
import { Button } from "../atoms";

/** Premier lancement d'un projet : trois étapes guidées ou un projet exemple. */
export default function EmptyState({ data, onPerson, onItem, onMilestone, onExample }: {
  data: Data; onPerson: () => void; onItem: () => void; onMilestone: () => void; onExample: () => void;
}) {
  const steps = [
    { done: data.people.length > 0, label: "Ajouter l'équipe", hint: data.people.length ? `${data.people.length} personne${data.people.length > 1 ? "s" : ""}` : "", action: "Ajouter une personne", run: onPerson },
    { done: false, label: "Créer un premier item", action: "Nouvel item", k: "C", run: onItem },
    { done: data.items.some((i) => i.type === "milestone"), label: "Poser un jalon client", action: "Ajouter un jalon", run: onMilestone },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[140px] z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex w-[440px] max-w-full animate-rise-in flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-card">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Lancez votre plan</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-500">Trois étapes, et les barres se calculent toutes seules à partir de la charge et de la disponibilité de chacun.</p>
        </div>
        <ol className="flex flex-col gap-1">
          {steps.map((s, i) => (
            <li key={s.label} className={cx("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-300", s.done ? "bg-stone-50" : i === next ? "border border-accent-100 bg-accent-50/40" : "")}>
              {s.done ? (
                <span className="flex size-5 animate-fade-in items-center justify-center rounded-full bg-green-600"><Check size={11} strokeWidth={3} className="text-white" /></span>
              ) : (
                <span className={cx("flex size-5 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold", i === next ? "border-accent-600 text-accent-600" : "border-stone-300 text-stone-400")}>{i + 1}</span>
              )}
              <span className={cx("flex-1", s.done ? "text-stone-500 line-through decoration-stone-300" : i === next ? "font-medium" : "text-stone-600")}>{s.label}</span>
              {s.done ? <span className="text-xs text-stone-400">{s.hint}</span> : (
                <Button size="sm" variant={i === next ? "primary" : "secondary"} kbd={s.k} onClick={s.run}>{s.action}</Button>
              )}
            </li>
          ))}
        </ol>
        <button onClick={onExample} className="self-start text-xs text-stone-600 underline decoration-stone-300 underline-offset-[3px] transition-colors hover:text-stone-900">Ou partir d&apos;un projet exemple</button>
      </div>
    </div>
  );
}
