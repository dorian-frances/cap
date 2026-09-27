"use client";

import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { ListFilter, Plus, SlidersHorizontal, X } from "lucide-react";
import type { Person } from "@/lib/plan";
import type { Zoom } from "@/lib/axis";
import { cx } from "@/lib/cx";
import { Avatar, Button, buttonCls, Switch } from "../atoms";
import { Legend, MenuCheckboxItem, MenuContent, MenuEmpty, MenuItem, MenuLabel, PopoverContent, SegmentedControl, Toolbar } from "../molecules";
import { HATCH } from "../tokens";

const ZOOMS: { value: Zoom; label: string }[] = [{ value: "semaine", label: "Semaine" }, { value: "mois", label: "Mois" }, { value: "trimestre", label: "Trimestre" }];

export function ZoomControl({ zoom, onZoom, onToday }: { zoom: Zoom; onZoom: (z: Zoom) => void; onToday: () => void }) {
  return (
    <>
      <SegmentedControl label="Zoom" value={zoom} onChange={onZoom} options={ZOOMS} />
      <Button size="sm" className="font-normal" onClick={onToday}>Aujourd&apos;hui</Button>
    </>
  );
}

export function TimelineToolbar({ people, ownerFilter, onOwnerFilter, colorBy, onColorBy, showDone, onShowDone, zoom, onNew }: {
  people: Person[]; ownerFilter: Set<string>; onOwnerFilter: (s: Set<string>) => void;
  colorBy: "status" | "owner"; onColorBy: (c: "status" | "owner") => void; showDone: boolean; onShowDone: (v: boolean) => void;
  zoom: React.ReactNode; onNew: () => void;
}) {
  const n = ownerFilter.size;
  return (
    <Toolbar>
      <Menu.Root>
        <Menu.Trigger className={cx(buttonCls(n ? "secondary" : "dashed", "sm"), "font-normal", n > 0 && "border-accent-200 bg-accent-50 text-accent-800 hover:bg-accent-50")}>
          <ListFilter size={13} />{n ? `${n} owner${n > 1 ? "s" : ""}` : "Filtrer"}
        </Menu.Trigger>
        <MenuContent>
          <MenuLabel>Owners</MenuLabel>
          {people.map((p) => (
            <MenuCheckboxItem key={p.id} checked={ownerFilter.has(p.id)}
              onCheckedChange={(c) => { const s = new Set(ownerFilter); if (c) s.add(p.id); else s.delete(p.id); onOwnerFilter(s); }}>
              <Avatar person={p} /><span className="truncate">{p.name}</span>
            </MenuCheckboxItem>
          ))}
          {n > 0 && <MenuItem icon={<X size={14} />} onClick={() => onOwnerFilter(new Set())}><span className="text-stone-500">Effacer le filtre</span></MenuItem>}
          {!people.length && <MenuEmpty>Aucune personne.</MenuEmpty>}
        </MenuContent>
      </Menu.Root>
      <Popover.Root>
        <Popover.Trigger className={cx(buttonCls("ghost", "sm"), "font-normal")}><SlidersHorizontal size={13} />Affichage</Popover.Trigger>
        <PopoverContent className="w-64 p-3">
          <div className="mb-1.5 text-xs text-stone-500">Couleur des barres</div>
          <SegmentedControl stretch label="Couleur des barres" value={colorBy} onChange={onColorBy} options={[{ value: "status", label: "Statut" }, { value: "owner", label: "Owner" }]} />
          <label className="mt-3 flex items-center justify-between">
            <span>Afficher les items faits</span>
            <Switch checked={showDone} onCheckedChange={onShowDone} />
          </label>
        </PopoverContent>
      </Popover.Root>
      <span className="flex-1" />
      {zoom}
      <Button size="sm" variant="primary" kbd="C" onClick={onNew}><Plus size={13} />Nouvel item</Button>
    </Toolbar>
  );
}

export function TeamToolbar({ zoom, onAbsence, onPerson }: { zoom: React.ReactNode; onAbsence: () => void; onPerson: () => void }) {
  return (
    <Toolbar>
      <span className="flex gap-4">
        <Legend items={[
          { label: "Occupé", swatch: { background: "var(--color-accent-100)" } },
          { label: "Partiellement libre", swatch: { background: "var(--color-accent-50)" } },
          { label: "Libre", swatch: { boxShadow: "inset 0 0 0 1px var(--color-stone-200)" } },
          { label: "Absence", swatch: { background: HATCH.absence } },
        ]} />
      </span>
      <span className="flex-1" />
      {zoom}
      <Button size="sm" onClick={onAbsence}>Ajouter une absence</Button>
      <Button size="sm" variant="primary" onClick={onPerson}><Plus size={13} />Ajouter une personne</Button>
    </Toolbar>
  );
}
