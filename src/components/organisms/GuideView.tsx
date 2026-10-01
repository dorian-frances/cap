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
    <ContentPage title="Guide" description="La mentalité de Cap, les questions auxquelles il répond, et où les trouver dans l'app.">
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-canvas p-5">
        <p className="text-[15px] font-medium leading-snug">Ici, on ne dessine pas les barres : on les calcule.</p>
        <p className="text-[13px] leading-relaxed text-stone-600">
          Cap remplace le tableur où l&apos;on tire des barres à la main. Vous décrivez le travail (des items estimés en jours-homme),
          l&apos;équipe (qui est disponible, à quel point) et ce qui s&apos;est réellement passé (démarré le, terminé le).
          Cap en déduit les dates, et les recalcule à chaque changement. Si une date ne vous plaît pas, on ne la déplace pas :
          on change ce qui la produit (priorité, owners, allocation, périmètre).
        </p>
      </section>

      <Section title="Trois principes">
        <div className="grid gap-3 sm:grid-cols-3">
          <Principle icon={<ListTodo size={15} />} title="Tout est un item">
            Une epic, une feature, une sous-tâche : ce sont des items, imbricables sans limite. L&apos;ordre de la liste est la priorité.
          </Principle>
          <Principle icon={<CalendarCheck size={15} />} title="Les faits avant les priorités">
            Ce qui est terminé ou en cours est placé sur ses dates réelles. Les tâches à faire remplissent le temps libre, jamais avant aujourd&apos;hui.
          </Principle>
          <Principle icon={<Clock size={15} />} title="La fin de tâche est un engagement">
            Fin prévue = début + estimation. Finir (ou prévoir de finir) après, c&apos;est glisser : on le voit tout de suite.
          </Principle>
        </div>
      </Section>

      <Section title="Les questions auxquelles Cap répond">
        <div className="flex flex-col divide-y divide-stone-100 rounded-xl border border-stone-200">
          <Question q="Quand chaque item sera-t-il livré, et avant ou après le jalon client ?"
            links={<>{go("timeline", "Timeline", <GanttChart size={13} />)}{go("jalons", "Jalons", <DiamondIcon size={13} />)}</>}>
            Chaque barre est calculée depuis l&apos;estimation, les owners et leur disponibilité. Les jalons sont les lignes en pointillés ;
            un item qui finit après son jalon cible est hachuré en rouge et marqué d&apos;un triangle.
          </Question>
          <Question q="Qu'est-ce qui est en retard aujourd'hui, de combien, et qu'est-ce que ça décale derrière ?"
            links={go("timeline", "Timeline", <GanttChart size={13} />)}>
            Démarrez et terminez les tâches avec leurs vraies dates (<Kbd>S</Kbd> puis <Kbd>2</Kbd> ou <Kbd>3</Kbd>). Une tâche non terminée à sa fin prévue
            se prolonge jusqu&apos;à aujourd&apos;hui : hachures ambre et badge « +n j », et la suite de ses owners glisse. Le filtre « En retard » isole ces tâches.
            Vous voyez venir un retard ? Ajoutez un <b className="font-medium">avenant</b> (+n JH, avec son motif) : la suite se décale dès maintenant.
          </Question>
          <Question q="Avec les congés, les temps partiels et les défauts, qui fait quoi, et est-ce que ça tient ?"
            links={<>{go("equipe", "Équipe", <Users size={13} />)}{go("absences", "Absences", <CalendarDays size={13} />)}</>}>
            La vue Équipe montre la charge de chacun, semaine par semaine. Au-delà de 100 % (tâches déclarées + part défauts), la personne est en surcharge :
            semaines en rouge, badge sur la tâche, et le panneau propose l&apos;allocation qui tient. Dans la fiche d&apos;une personne : disponibilité, temps sur les défauts, absences.
          </Question>
          <Question q="Qu'est-ce qui n'est pas encore planifiable, et pourquoi ?" links={go("timeline", "Timeline", <GanttChart size={13} />)}>
            Les items sans owner ou sans estimation sont regroupés dans « À planifier », en bas de la timeline, avec la raison.
            Ils rejoignent le plan dès qu&apos;ils ont les deux.
          </Question>
          <Question q="Ce qui démarre bientôt est-il prêt ?" links={go("dashboard", "Dashboard", <LayoutDashboard size={13} />)}>
            Le Dashboard liste les tâches qui démarrent dans les prochains jours, avec deux vérifications à cocher : conception métier (+ BPMN)
            et conception technique (+ découpe en tickets), dues un nombre de jours ouvrés avant le démarrage réglé dans les Paramètres.
            Il réunit aussi les dépendances et blocages à lever, les jalons à venir et les dérives (retards, surcharges).
          </Question>
          <Question q="Comment montrer l'état à tous, client compris, sans slide ?"
            links={<Button size="sm" onClick={onShare}><Link2 size={13} />Partager<ArrowRight size={12} className="text-stone-400" /></Button>}>
            Un lien en lecture seule affiche le macro-plan à jour (prochain jalon, avancement, glissements), exportable en PDF. Rien à maintenir à côté.
          </Question>
        </div>
      </Section>

      <Section title="La vie d'une tâche">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Step status="todo" label="À faire" note="enchaînée par priorité" />
          <ArrowRight size={14} className="text-stone-300" />
          <Step status="doing" label="En cours" note="date de début réelle" />
          <ArrowRight size={14} className="text-stone-300" />
          <Step status="done" label="Terminée" note="date de fin, même a posteriori" />
        </div>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-stone-600 marker:text-stone-300">
          <li>Tant qu&apos;une tâche n&apos;est pas terminée, elle est en cours : elle occupe ses owners jusqu&apos;à ce qu&apos;on la termine.</li>
          <li><b className="font-medium text-stone-800">Allocation</b> : chaque owner y consacre une part de son temps total. 100 % par défaut (on vise le one-piece flow), 20 % pour une personne en aide, <b className="font-medium text-stone-800">Pause</b> (0 %) quand on attend quelque chose.</li>
          <li><b className="font-medium text-stone-800">Défauts</b> : la part de temps d&apos;une personne sur les défauts est réservée d&apos;abord ; ses tâches se partagent le reste.</li>
          <li>Chaque date s&apos;explique : ouvrez un item, rubrique « Pourquoi ces dates ».</li>
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
          <Legend swatch={<span className="rounded-[4px] bg-red-50 px-1 text-[11px] font-medium leading-4 text-red-700">120 %</span>}>Un owner en surcharge</Legend>
          <Legend swatch={<Swatch line style={{ borderLeft: "1px dashed var(--color-stone-500)" }} />}>Jalon</Legend>
          <Legend swatch={<Swatch line style={{ borderLeft: "1px solid var(--color-accent-500)" }} />}>Aujourd&apos;hui</Legend>
        </div>
      </Section>

      <Section title="Aller vite">
        <div className="grid gap-x-6 gap-y-2 text-[13px] text-stone-600 sm:grid-cols-2">
          <Shortcut keys={["⌘", "K"]}>Tout faire depuis la palette</Shortcut>
          <Shortcut keys={["C"]}>Nouvel item</Shortcut>
          <Shortcut keys={["S"]}>Statut (puis <Kbd>2</Kbd> démarrer, <Kbd>3</Kbd> terminer)</Shortcut>
          <Shortcut keys={["A"]}>Assigner</Shortcut>
          <Shortcut keys={["E"]}>Estimation</Shortcut>
          <Shortcut keys={["M"]}>Jalon cible</Shortcut>
          <Shortcut keys={["↑", "↓"]}>Item précédent / suivant</Shortcut>
          <Shortcut keys={["G", "T"]}>Aller à la timeline (<Kbd>D</Kbd> dashboard, <Kbd>E</Kbd> équipe, <Kbd>J</Kbd> jalons, <Kbd>A</Kbd> absences)</Shortcut>
        </div>
        <div><Button size="sm" onClick={onPalette}><Search size={13} />Ouvrir la palette</Button></div>
      </Section>
    </ContentPage>
  );
}

const Principle = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5 rounded-xl border border-stone-200 p-4">
    <div className="flex items-center gap-2 text-[13px] font-medium"><span className="text-accent-600">{icon}</span>{title}</div>
    <p className="text-[13px] leading-relaxed text-stone-600">{children}</p>
  </div>
);

const Question = ({ q, links, children }: { q: string; links: ReactNode; children: ReactNode }) => (
  <div className="flex flex-col gap-2 p-4">
    <p className="text-[14px] font-medium leading-snug">« {q} »</p>
    <p className="text-[13px] leading-relaxed text-stone-600">{children}</p>
    <div className="flex flex-wrap gap-1.5">{links}</div>
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

