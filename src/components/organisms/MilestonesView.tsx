"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { lateAfter, todayIso, type Plan } from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { Button, Diamond, InlineInput } from "../atoms";
import { DatePicker, IconButton } from "../molecules";
import { ContentPage } from "../templates/ContentPage";

export default function MilestonesView({ data, plan, store }: { data: Data; plan: Plan; store: Store }) {
  const ms = data.items.filter((i) => i.type === "milestone").sort((a, b) => (a.milestone_date ?? "9").localeCompare(b.milestone_date ?? "9"));
  const add = () => store.addItem({ type: "milestone", title: "Nouveau jalon", milestone_date: todayIso(), position: ms.length + 1 });
  return (
    <ContentPage title="Jalons" description="Dates clés côté client. Rattachez-y des items (touche M) pour savoir s'ils seront prêts."
      actions={<Button variant="primary" onClick={add}><Plus size={14} />Nouveau jalon</Button>}>
      <div>
        {ms.map((m) => {
          const targeted = data.items.filter((i) => i.target_ids.includes(m.id));
          const late = targeted.filter((i) => m.milestone_date && lateAfter(plan.spans.get(i.id), m.milestone_date) > 0);
          return (
            <div key={m.id} className="group flex h-12 animate-fade-in items-center gap-3 border-b border-stone-100 px-2">
              <Diamond late={late.length > 0} size={12} />
              <InlineInput key={m.id + m.title} defaultValue={m.title} aria-label="Nom du jalon" className="flex-1"
                onBlur={(e) => e.target.value !== m.title && store.updateItems([m.id], { title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
              <DatePicker variant="ghost" label="Date du jalon" value={m.milestone_date} onChange={(d) => d && store.updateItems([m.id], { milestone_date: d })} />
              <span className={`w-44 text-right text-xs ${late.length ? "text-red-700" : "text-stone-500"}`}>
                {!targeted.length ? "Aucun item rattaché" : late.length ? `${late.length} item${late.length > 1 ? "s" : ""} en retard sur ${targeted.length}` : <span className="inline-flex items-center gap-1 text-green-700"><Check size={13} />{targeted.length} item{targeted.length > 1 ? "s" : ""} à l&apos;heure</span>}
              </span>
              <IconButton label="Supprimer le jalon" tooltip={false} onClick={() => store.deleteItems([m.id], `Jalon « ${m.title} » supprimé`)}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><Trash2 size={14} /></IconButton>
            </div>
          );
        })}
        {!ms.length && <p className="text-[13px] text-stone-400">Aucun jalon. Ajoutez la prochaine démo ou mise en production.</p>}
      </div>
    </ContentPage>
  );
}
