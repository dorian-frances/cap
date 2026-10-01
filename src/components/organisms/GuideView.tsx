"use client";

import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck, CalendarDays, Clock, Diamond as DiamondIcon, GanttChart, LayoutDashboard, Link2, ListTodo, Search, Users } from "lucide-react";
import { Button, Kbd, StatusIcon, Swatch } from "../atoms";
import { ContentPage, Section } from "../templates";
import { HATCH, STATUS } from "../tokens";
import type { View } from "./Sidebar";

/** Guide de prise en main : la mentalité de Cap, les questions auxquelles il répond, où les trouver. */
export default function GuideView({ onView, onShare, onPalette }: { onView: (v: View) => void; onShare: () => void; onPalette: () => void }) {
  const go = (v: View, label: string, icon: ReactNode) => (
    <Button size="sm" onClick={() => onView(v)}>{icon}{label}<ArrowRight size={12} className="text-stone-400" /></Button>
  );

  return (
    <ContentPage title="Guide">
      <section className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-canvas p-5">
        <p className="text-[15px] font-medium leading-snug">Les barres ne se dessinent pas, elles se calculent.</p>
        <p className="text-[13px] text-stone-600">Une date ne convient pas : changer la priorité, les owners, l&apos;allocation ou le périmètre.</p>
      </section>

      <Section title="Principes">
        <div className="grid gap-3 sm:grid-cols-3">
          <Principle icon={<ListTodo size={15} />} title="Tout est un item">Imbricable. Ordre de la liste = priorité.</Principle>
          <Principle icon={<CalendarCheck size={15} />} title="Les faits avant les priorités">Fait et en cours : dates réelles. À faire : temps libre, à partir d&apos;aujourd&apos;hui.</Principle>
          <Principle icon={<Clock size={15} />} title="Fin prévue = engagement">Début + estimation. Au-delà : glissement.</Principle>
        </div>
      </Section>

      <Section title="Où trouver la réponse">
        <div className="flex flex-col divide-y divide-stone-100 rounded-xl border border-stone-200">
          <Question q="Quand est-ce livré, avant ou après le jalon ?" links={<>{go("dashboard", "Dashboard", <LayoutDashboard size={13} />)}{go("jalons", "Jalons", <DiamondIcon size={13} />)}</>}>
            Après son jalon cible : hachures rouges et ⚠.
          </Question>
          <Question q="Qu'est-ce qui est en retard ?" links={go("timeline", "Timeline", <GanttChart size={13} />)}>
            Au-delà de la fin prévue : hachures ambre et « +n j », la suite glisse. Retard anticipé : avenant.
          </Question>
          <Question q="Est-ce que la charge tient ?" links={<>{go("equipe", "Équipe", <Users size={13} />)}{go("absences", "Absences", <CalendarDays size={13} />)}</>}>
            Au-delà de 100 % (tâches + défauts) : surcharge, en rouge.
          </Question>
          <Question q="Qu'est-ce qui n'est pas planifiable ?" links={go("timeline", "Timeline", <GanttChart size={13} />)}>
            Sans owner ou sans estimation : groupe « À planifier », en bas de la timeline.
          </Question>
          <Question q="Ce qui démarre bientôt est-il prêt ?" links={go("dashboard", "Dashboard", <LayoutDashboard size={13} />)}>
            Conceptions métier et technique à cocher avant le démarrage (délais dans les Paramètres), dépendances à lever.
          </Question>
          <Question q="Comment partager l'état ?" links={<Button size="sm" onClick={onShare}><Link2 size={13} />Partager<ArrowRight size={12} className="text-stone-400" /></Button>}>
            Lien en lecture seule, à jour, exportable en PDF.
          </Question>
        </div>
      </Section>

      <Section title="La vie d'une tâche">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Step status="todo" label="À faire" note="par priorité" />
          <ArrowRight size={14} className="text-stone-300" />
          <Step status="doing" label="En cours" note="date de début" />
          <ArrowRight size={14} className="text-stone-300" />
          <Step status="done" label="Terminée" note="date de fin" />
        </div>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-stone-600 marker:text-stone-300">
          <li>Pas terminée = en cours : elle occupe ses owners.</li>
          <li>Allocation : part du temps total, 100 % par défaut, 0 % = pause.</li>
          <li>Défauts : réservés en premier.</li>
          <li>« Pourquoi ces dates » : dans le panneau de l&apos;item.</li>
        </ul>
      </Section>

      <Section title="Lire la timeline">
        <div className="grid gap-x-6 gap-y-2.5 text-[13px] text-stone-600 sm:grid-cols-2">
          <Legend swatch={<Bar status="todo" />}>À faire</Legend>
          <Legend swatch={<Bar status="doing" />}>En cours</Legend>
          <Legend swatch={<Bar status="done" />}>Terminée</Legend>
          <Legend swatch={<Swatch style={{ background: HATCH.overrun }} />}>Au-delà de la fin prévue : retard ou avenant</Legend>
          <Legend swatch={<Swatch style={{ background: HATCH.late }} />}>Après son jalon cible</Legend>
          <Legend swatch={<Swatch style={{ background: HATCH.pause }} />}>En pause (tous les owners à 0 %)</Legend>
          <Legend swatch={<span className="rounded-[4px] bg-amber-100 px-1 text-[11px] font-medium leading-4 text-amber-800">+2 j</span>}>Glissement sur la fin prévue</Legend>
          <Legend swatch={<span className="whitespace-nowrap rounded-[4px] bg-red-50 px-1 text-[11px] font-medium leading-4 text-red-700">120 %</span>}>Un owner en surcharge</Legend>
          <Legend swatch={<Swatch line style={{ borderLeft: "1px dashed var(--color-stone-500)" }} />}>Jalon</Legend>
          <Legend swatch={<Swatch line style={{ borderLeft: "1px solid var(--color-accent-500)" }} />}>Aujourd&apos;hui</Legend>
        </div>
      </Section>

      <Section title="Aller vite">
        <div className="grid gap-x-6 gap-y-2 text-[13px] text-stone-600 sm:grid-cols-2">
          <Shortcut keys={["⌘", "K"]}>Palette de commandes</Shortcut>
          <Shortcut keys={["C"]}>Nouvel item</Shortcut>
          <Shortcut keys={["S"]}>Statut (puis <Kbd>2</Kbd> démarrer, <Kbd>3</Kbd> terminer)</Shortcut>
          <Shortcut keys={["A"]}>Assigner</Shortcut>
          <Shortcut keys={["E"]}>Estimation</Shortcut>
          <Shortcut keys={["M"]}>Jalon cible</Shortcut>
          <Shortcut keys={["↑", "↓"]}>Item précédent / suivant</Shortcut>
          <Shortcut keys={["G"]}>puis <Kbd>D</Kbd> <Kbd>T</Kbd> <Kbd>E</Kbd> <Kbd>J</Kbd> <Kbd>A</Kbd> : Dashboard, Timeline, Équipe, Jalons, Absences</Shortcut>
        </div>
        <div><Button size="sm" onClick={onPalette}><Search size={13} />Ouvrir la palette</Button></div>
      </Section>
    </ContentPage>
  );
}

const Principle = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5 rounded-xl border border-stone-200 p-4">
    <div className="flex items-center gap-2 text-[13px] font-medium"><span className="text-accent-600">{icon}</span>{title}</div>
    <p className="text-[13px] text-stone-600">{children}</p>
  </div>
);

const Question = ({ q, links, children }: { q: string; links: ReactNode; children: ReactNode }) => (
  <div className="flex items-center gap-4 px-4 py-3">
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-medium">{q}</p>
      <p className="text-[13px] text-stone-500">{children}</p>
    </div>
    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">{links}</div>
  </div>
);

const Step = ({ status, label, note }: { status: "todo" | "doing" | "done"; label: string; note: string }) => (
  <span className="flex items-center gap-2 rounded-lg border border-stone-200 px-2.5 py-1.5">
    <StatusIcon status={status} /><span className="font-medium">{label}</span><span className="text-xs text-stone-500">{note}</span>
  </span>
);

const Bar = ({ status }: { status: "todo" | "doing" | "done" }) => (
  <span className="h-2.5 w-5 rounded-[3px]" style={{ background: STATUS[status].bar, boxShadow: `inset 0 0 0 1px ${STATUS[status].border}` }} />
);

const Legend = ({ swatch, children }: { swatch: ReactNode; children: ReactNode }) => (
  <div className="flex items-center gap-2.5"><span className="flex w-9 shrink-0 justify-center">{swatch}</span>{children}</div>
);

const Shortcut = ({ keys, children }: { keys: string[]; children: ReactNode }) => (
  <div className="flex items-center gap-2.5"><span className="flex w-14 shrink-0 gap-0.5">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span><span>{children}</span></div>
);

