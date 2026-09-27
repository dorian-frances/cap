"use client";

import { useState } from "react";
import type { Data, Store } from "@/lib/store";
import { Button, Input } from "../atoms";
import { DateRangePicker, Dialog, DialogClose, DialogFooter, Field, Select, type Range } from "../molecules";

const ALL = "__all";

export default function AbsenceDialog({ data, store, open, onOpenChange }: { data: Data; store: Store; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [who, setWho] = useState<string | null>(null);
  const [range, setRange] = useState<Range | null>(null);
  const [label, setLabel] = useState("");
  const person = who ?? data.people[0]?.id ?? ALL;
  const close = (o: boolean) => { onOpenChange(o); if (!o) { setRange(null); setLabel(""); setWho(null); } };

  return (
    <Dialog open={open} onOpenChange={close} title="Ajouter une absence" description="Les dates des items concernés se recalculent aussitôt.">
      <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => {
        e.preventDefault();
        if (!range) return;
        store.addAbsences((person === ALL ? data.people.map((p) => p.id) : [person])
          .map((person_id) => ({ person_id, start_date: range.start, end_date: range.end, label })));
        close(false);
      }}>
        <Field label="Qui">
          <Select label="Qui" value={person} onValueChange={setWho}
            options={[...data.people.map((p) => ({ value: p.id, label: p.name })), { value: ALL, label: "Toute l'équipe (jour férié, séminaire…)" }]} />
        </Field>
        <Field label="Période">
          <DateRangePicker label="Période" value={range} onChange={setRange} />
        </Field>
        <Field label="Motif (optionnel)">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Congés" />
        </Field>
        <DialogFooter>
          <DialogClose>Annuler</DialogClose>
          <Button type="submit" variant="primary" disabled={!data.people.length || !range}>Ajouter</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
