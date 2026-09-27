"use client";

// Vues secondaires d'un projet : Équipe, Jalons, Absences, Paramètres + dialogues associés.
import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Check, ChevronDown, ChevronRight, Copy, ExternalLink, Plus, Trash2, X } from "lucide-react";
import {
  absentSet, lateBy, orderItems, toIso, todayIso, weekLoad,
  type Person, type Plan,
} from "@/lib/plan";
import type { Data, Store } from "@/lib/store";
import { AxisHeader, AxisLines, weekendBg, type Axis } from "./Timeline";
import { Avatar, Diamond, STATUS, StatusIcon, fmtDay } from "./ui";

export const btn = "inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-stone-200 bg-white px-2.5 text-[13px] font-medium hover:bg-stone-50";
export const btnPrimary = "inline-flex h-7 items-center gap-2 rounded-[7px] bg-stone-900 px-2.5 text-[13px] font-medium text-stone-50 hover:bg-stone-700";
const input = "h-8 rounded-[7px] border border-stone-200 bg-white px-2.5 text-[13px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const dialogCls = "fixed left-1/2 top-[18vh] z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-5 shadow-[0_24px_64px_-12px_rgba(28,25,23,.28)] outline-none";
const backdrop = "fixed inset-0 z-40 bg-stone-900/15";

/* ---------- Équipe ---------- */

export function TeamView({ data, plan, store, ax, scrollRef, toolbar, openPerson, onOpenPerson, onOpenItem }: {
  data: Data; plan: Plan; store: Store; ax: Axis; scrollRef: React.RefObject<HTMLDivElement | null>; toolbar: React.ReactNode;
  openPerson: string | null; onOpenPerson: (id: string | null) => void; onOpenItem: (id: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const LEFT = 380;
  const off = absentSet(data.absences);
  const leaves = orderItems(data.items).filter((r) => !r.hasChildren);
  const milestones = data.items.filter((i) => i.type === "milestone");
  const weeks = Array.from({ length: ax.days / 7 }, (_, w) => ax.from + w * 7);
  const person = data.people.find((p) => p.id === openPerson);

  return (
    <>
      {toolbar}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative min-h-full" style={{ width: LEFT + ax.width }}>
          <div className="sticky top-0 z-20 flex border-b border-stone-200/80 bg-white">
            <div className="sticky left-0 z-30 flex shrink-0 items-center gap-1.5 border-r border-stone-100 bg-white px-5" style={{ width: LEFT }}>
              <span className="font-medium">Personnes</span><span className="text-xs text-stone-400">{data.people.length}</span>
            </div>
            <AxisHeader ax={ax} milestones={milestones} items={data.items} plan={plan} />
          </div>
          {data.people.map((p) => {
            const isOpen = open.has(p.id);
            const mine = leaves.filter((r) => r.item.owner_ids.includes(p.id));
            const free = plan.freeFrom.get(p.id);
            return (
              <div key={p.id}>
                <div className={`group flex h-11 border-b border-stone-100 ${openPerson === p.id ? "bg-indigo-50/60" : "hover:bg-stone-50"}`}>
                  <div className={`sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-stone-100 pl-3 pr-4 ${openPerson === p.id ? "bg-[#f3f3fc]" : "bg-white group-hover:bg-stone-50"}`} style={{ width: LEFT }}>
                    <button aria-label={isOpen ? "Replier" : "Déplier"} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}
                      className="flex size-4 items-center justify-center rounded text-stone-500 hover:bg-stone-200">
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                    <button onClick={() => onOpenPerson(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <Avatar person={p} size={24} />
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-xs text-stone-400">{Math.round(p.capacity * 100)} %</span>
                    </button>
                    <span className="text-xs text-stone-500">{free ? `libre le ${fmtDay(toIso(free))}` : "libre"}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }}>
                    {weeks.map((w) => {
                      const load = weekLoad(plan, p, off, w);
                      const wide = 7 * ax.px >= 44;
                      const base = "absolute top-2.5 h-6 rounded-[5px] text-center text-[11px] font-medium leading-6 tabular-nums";
                      const style = { left: (w - ax.from) * ax.px + 3, width: 7 * ax.px - 6 };
                      if (load === "abs") return <div key={w} className={`${base} text-stone-600`} style={{ ...style, background: "repeating-linear-gradient(135deg,#d6d3d1 0 2px,#f4f3f1 2px 5px)" }}>{wide && "Absent·e"}</div>;
                      if (!load) return null;
                      return <div key={w} title={`${load} % de sa capacité`} className={`${base} ${load >= 95 ? "bg-indigo-100 text-indigo-800" : "bg-indigo-50 text-indigo-600"}`} style={style}>{wide && `${load} %`}</div>;
                    })}
                    {data.absences.filter((a) => a.person_id === p.id).map((a) => (
                      <div key={a.id} title={`${a.label || "Absence"} · ${fmtDay(a.start_date)} → ${fmtDay(a.end_date)}`}
                        className="pointer-events-none absolute inset-y-0 opacity-60"
                        style={{ left: ax.x(a.start_date), width: ax.x(a.end_date) - ax.x(a.start_date) + ax.px, background: "repeating-linear-gradient(135deg,rgba(168,162,158,.5) 0 2px,transparent 2px 5px)" }} />
                    ))}
                  </div>
                </div>
                {isOpen && mine.map(({ item }, i) => {
                  const s = plan.spans.get(item.id);
                  return (
                    <div key={item.id} className="group flex h-8 cursor-pointer hover:bg-stone-50" onClick={() => onOpenItem(item.id)}>
                      <div className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-stone-100 bg-white pl-12 group-hover:bg-stone-50" style={{ width: LEFT }}>
                        <span className="w-4 text-xs tabular-nums text-stone-400">{i + 1}</span><StatusIcon status={item.status} />
                        <span className="truncate text-stone-700">{item.title || "Sans titre"}</span>
                      </div>
                      <div className="relative shrink-0" style={{ width: ax.width, ...weekendBg(ax.px) }}>
                        {s && <div className="absolute top-1.5 h-5 truncate rounded-[5px] px-2 text-xs font-medium leading-5"
                          style={{ left: ax.x(s.start), width: ax.x(s.end) - ax.x(s.start) + ax.px, background: STATUS[item.status].bar, color: STATUS[item.status].text, boxShadow: `inset 0 0 0 1px ${STATUS[item.status].border}` }}>
                          {item.title}</div>}
                      </div>
                    </div>
                  );
                })}
                {isOpen && !mine.length && <div className="sticky left-0 flex h-8 items-center pl-12 text-xs text-stone-400" style={{ width: LEFT }}>Aucun item assigné</div>}
              </div>
            );
          })}
          <div className="flex h-9">
            <button onClick={() => onOpenPerson(store.addPerson("Nouvelle personne").id)}
              className="sticky left-0 flex items-center gap-1.5 border-r border-stone-100 bg-white pl-9 text-stone-400 hover:text-stone-700" style={{ width: LEFT }}>
              <Plus size={14} />Ajouter une personne
            </button>
          </div>
          {!data.people.length && (
            <div className="sticky left-0 max-w-md px-9 py-6 text-[13px] text-stone-500">
              Ajoutez les membres de l&apos;équipe pour voir leur charge, leurs absences et quand ils se libèrent.
            </div>
          )}
          <AxisLines ax={ax} milestones={milestones} left={LEFT} items={data.items} plan={plan} />
        </div>
      </div>
      {person && <PersonPanel person={person} data={data} plan={plan} store={store} onClose={() => onOpenPerson(null)} onOpenItem={onOpenItem} />}
    </>
  );
}

function PersonPanel({ person, data, plan, store, onClose, onOpenItem }: {
  person: Person; data: Data; plan: Plan; store: Store; onClose: () => void; onOpenItem: (id: string) => void;
}) {
  const mine = orderItems(data.items).filter((r) => !r.hasChildren && r.item.owner_ids.includes(person.id));
  const abs = data.absences.filter((a) => a.person_id === person.id);
  const [err, setErr] = useState("");
  return (
    <aside aria-label="Fiche personne" className="absolute bottom-0 right-0 top-0 z-30 flex w-[400px] max-w-full flex-col border-l border-stone-200 bg-white shadow-[-16px_0_40px_-16px_rgba(28,25,23,.22)]">
      <div className="flex h-11 items-center gap-2 pl-5 pr-3 text-xs text-stone-500">
        <span className="flex-1">Personne</span>
        <DeletePerson person={person} count={mine.length} onConfirm={() => { store.deletePerson(person.id); onClose(); }} />
        <button aria-label="Fermer" onClick={onClose} className="flex size-[26px] items-center justify-center rounded-md hover:bg-stone-100"><X size={14} /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
        <div className="flex items-center gap-3">
          <Avatar person={person} size={36} />
          <input key={person.id + person.name} defaultValue={person.name} aria-label="Nom"
            onFocus={(e) => person.name === "Nouvelle personne" && e.currentTarget.select()}
            onBlur={(e) => e.target.value.trim() && e.target.value !== person.name && store.updatePerson(person.id, { name: e.target.value.trim() })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="-mx-1 min-w-0 flex-1 rounded px-1 text-xl font-semibold outline-none focus:bg-stone-50" autoFocus={person.name === "Nouvelle personne"} />
        </div>
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-stone-500">Disponibilité</span>
          <select value={Math.round(person.capacity * 100)} onChange={(e) => store.updatePerson(person.id, { capacity: Number(e.target.value) / 100 })} className={input}>
            {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10].map((v) => <option key={v} value={v}>{v} %{v === 100 ? " (plein temps)" : ""}</option>)}
          </select>
        </label>
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-medium text-stone-500">Items, par ordre de priorité</h3>
          {mine.map(({ item }, i) => {
            const s = plan.spans.get(item.id);
            return (
              <button key={item.id} onClick={() => onOpenItem(item.id)} className="-mx-2 flex h-8 items-center gap-2.5 rounded-md px-2 text-left text-[13px] hover:bg-stone-50">
                <span className="w-4 text-xs tabular-nums text-stone-400">{i + 1}</span><StatusIcon status={item.status} />
                <span className="min-w-0 flex-1 truncate">{item.title || "Sans titre"}</span>
                <span className="text-xs text-stone-400">{s ? `${fmtDay(s.start)} → ${fmtDay(s.end)}` : ""}</span>
              </button>
            );
          })}
          {!mine.length && <p className="text-[13px] text-stone-400">Aucun item assigné.</p>}
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-stone-500">Absences</h3>
          {abs.map((a) => (
            <div key={a.id} className="group flex items-center gap-2 text-[13px]">
              <span className="flex-1">{a.start_date === a.end_date ? fmtDay(a.start_date) : `${fmtDay(a.start_date)} → ${fmtDay(a.end_date)}`}
                {a.label && <span className="text-stone-400"> · {a.label}</span>}</span>
              <button aria-label="Supprimer l'absence" onClick={() => store.deleteAbsence(a.id)} className="rounded p-1 text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus-visible:opacity-100"><Trash2 size={13} /></button>
            </div>
          ))}
          <form className="flex flex-wrap items-center gap-1.5" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const start = String(f.get("start")), end = String(f.get("end") || f.get("start"));
            if (end < start) return setErr("La fin doit être après le début.");
            setErr("");
            store.addAbsences([{ person_id: person.id, start_date: start, end_date: end, label: String(f.get("label")) }]);
            e.currentTarget.reset();
          }}>
            <input name="start" type="date" required aria-label="Début" className={`${input} w-[128px]`} />
            <span className="text-stone-400">→</span>
            <input name="end" type="date" aria-label="Fin" className={`${input} w-[128px]`} />
            <input name="label" placeholder="Motif" aria-label="Motif" className={`${input} min-w-0 flex-1`} />
            <button className={btn}><Plus size={13} />Ajouter</button>
          </form>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </section>
      </div>
    </aside>
  );
}

function DeletePerson({ person, count, onConfirm }: { person: Person; count: number; onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger aria-label="Retirer de l'équipe" className="flex size-[26px] items-center justify-center rounded-md hover:bg-stone-100"><Trash2 size={14} /></AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdrop} />
        <AlertDialog.Popup className={dialogCls}>
          <AlertDialog.Title className="text-base font-semibold">Retirer {person.name} de l&apos;équipe ?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-[13px] text-stone-600">
            {count ? `${count} item${count > 1 ? "s" : ""} n'auront plus cet owner et ses absences seront supprimées.` : "Ses absences seront supprimées."}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close className={btn}>Garder</AlertDialog.Close>
            <AlertDialog.Close className="inline-flex h-7 items-center rounded-[7px] bg-red-600 px-2.5 text-[13px] font-medium text-white hover:bg-red-700" onClick={onConfirm}>Retirer</AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ---------- Absences ---------- */

export function AbsenceDialog({ data, store, open, onOpenChange }: { data: Data; store: Store; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [err, setErr] = useState("");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdrop} />
        <Dialog.Popup className={dialogCls}>
          <Dialog.Title className="text-base font-semibold">Ajouter une absence</Dialog.Title>
          <form className="mt-4 flex flex-col gap-3 text-[13px]" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const who = String(f.get("person"));
            const start = String(f.get("start")), end = String(f.get("end") || f.get("start"));
            if (end < start) return setErr("La fin doit être après le début.");
            setErr("");
            store.addAbsences((who ? [who] : data.people.map((p) => p.id)).map((person_id) => ({ person_id, start_date: start, end_date: end, label: String(f.get("label")) })));
            onOpenChange(false);
          }}>
            <label className="flex flex-col gap-1"><span className="text-stone-500">Qui</span>
              <select name="person" className={input} defaultValue={data.people[0]?.id ?? ""}>
                {data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="">Toute l&apos;équipe (jour férié, séminaire…)</option>
              </select>
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1"><span className="text-stone-500">Du</span><input name="start" type="date" required className={input} /></label>
              <label className="flex flex-1 flex-col gap-1"><span className="text-stone-500">Au (inclus)</span><input name="end" type="date" className={input} /></label>
            </div>
            <label className="flex flex-col gap-1"><span className="text-stone-500">Motif (optionnel)</span><input name="label" placeholder="Congés" className={input} /></label>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Dialog.Close className={btn}>Annuler</Dialog.Close>
              <button className={btnPrimary} disabled={!data.people.length}>Ajouter</button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AbsencesView({ data, store, onAdd }: { data: Data; store: Store; onAdd: () => void }) {
  const today = todayIso();
  const upcoming = data.absences.filter((a) => a.end_date >= today);
  const past = data.absences.filter((a) => a.end_date < today);
  const row = (a: Data["absences"][number]) => {
    const p = data.people.find((x) => x.id === a.person_id);
    return (
      <div key={a.id} className="group flex h-10 items-center gap-3 border-b border-stone-100 px-2 text-[13px]">
        {p && <Avatar person={p} />}<span className="w-40 truncate font-medium">{p?.name}</span>
        <span className="w-52 tabular-nums text-stone-600">{a.start_date === a.end_date ? fmtDay(a.start_date, true) : `${fmtDay(a.start_date)} → ${fmtDay(a.end_date, true)}`}</span>
        <span className="flex-1 truncate text-stone-400">{a.label}</span>
        <button aria-label="Supprimer l'absence" onClick={() => store.deleteAbsence(a.id)} className="rounded p-1 text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus-visible:opacity-100"><Trash2 size={14} /></button>
      </div>
    );
  };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex-1"><h1 className="text-xl font-semibold">Absences</h1>
            <p className="text-[13px] text-stone-500">Elles décalent automatiquement les dates. Pour un jour férié, choisissez « Toute l&apos;équipe ».</p></div>
          <button className={btnPrimary} onClick={onAdd}><Plus size={14} />Ajouter une absence</button>
        </div>
        <section>{upcoming.length ? upcoming.map(row) : <p className="text-[13px] text-stone-400">Aucune absence à venir.</p>}</section>
        {past.length > 0 && <section><h2 className="mb-1 text-xs font-medium text-stone-500">Passées</h2><div className="opacity-60">{past.map(row)}</div></section>}
      </div>
    </div>
  );
}

/* ---------- Jalons ---------- */

export function MilestonesView({ data, plan, store }: { data: Data; plan: Plan; store: Store }) {
  const ms = data.items.filter((i) => i.type === "milestone").sort((a, b) => (a.milestone_date ?? "9").localeCompare(b.milestone_date ?? "9"));
  const add = () => store.addItem({ type: "milestone", title: "Nouveau jalon", milestone_date: todayIso(), position: ms.length + 1 });
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex-1"><h1 className="text-xl font-semibold">Jalons</h1>
            <p className="text-[13px] text-stone-500">Dates clés côté client. Rattachez-y des items (touche M) pour savoir s&apos;ils seront prêts.</p></div>
          <button className={btnPrimary} onClick={add}><Plus size={14} />Nouveau jalon</button>
        </div>
        <div>
          {ms.map((m) => {
            const targeted = data.items.filter((i) => i.target_id === m.id);
            const late = targeted.filter((i) => lateBy(i, plan.spans.get(i.id), data.items) > 0);
            return (
              <div key={m.id} className="group flex h-12 items-center gap-3 border-b border-stone-100 px-2">
                <Diamond late={late.length > 0} size={12} />
                <input key={m.id + m.title} defaultValue={m.title} aria-label="Nom du jalon"
                  onBlur={(e) => e.target.value !== m.title && store.updateItems([m.id], { title: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="-mx-1 min-w-0 flex-1 rounded px-1 py-1 text-[13px] font-medium outline-none hover:bg-stone-50 focus:bg-stone-50" />
                <input type="date" value={m.milestone_date ?? ""} aria-label="Date"
                  onChange={(e) => e.target.value && store.updateItems([m.id], { milestone_date: e.target.value })} className={input} />
                <span className={`w-44 text-right text-xs ${late.length ? "text-red-700" : "text-stone-500"}`}>
                  {!targeted.length ? "Aucun item rattaché" : late.length ? `${late.length} item${late.length > 1 ? "s" : ""} en retard sur ${targeted.length}` : <span className="inline-flex items-center gap-1 text-green-700"><Check size={13} />{targeted.length} item{targeted.length > 1 ? "s" : ""} à l&apos;heure</span>}
                </span>
                <button aria-label="Supprimer le jalon" onClick={() => store.deleteItems([m.id], `Jalon « ${m.title} » supprimé`)}
                  className="rounded p-1 text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus-visible:opacity-100"><Trash2 size={14} /></button>
              </div>
            );
          })}
          {!ms.length && <p className="text-[13px] text-stone-400">Aucun jalon. Ajoutez la prochaine démo ou mise en production.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Paramètres + partage ---------- */

export const shareUrl = (token: string) => (typeof window === "undefined" ? "" : `${window.location.origin}/share/${token}`);

export function ShareDialog({ data, open, onOpenChange }: { data: Data; open: boolean; onOpenChange: (o: boolean) => void }) {
  const url = shareUrl(data.project.share_token);
  const [copied, setCopied] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdrop} />
        <Dialog.Popup className={dialogCls}>
          <Dialog.Title className="text-base font-semibold">Partager le plan</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-[13px] text-stone-600">
            Toute personne avec ce lien voit le plan à jour, sans compte et sans pouvoir le modifier. Les estimations et les motifs d&apos;absence ne sont pas affichés.
          </Dialog.Description>
          <div className="mt-4 flex gap-2">
            <input readOnly value={url} aria-label="Lien de consultation" onFocus={(e) => e.currentTarget.select()} className={`${input} min-w-0 flex-1 text-stone-600`} />
            <button className={btnPrimary} onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
              {copied ? <><Check size={14} />Copié</> : <><Copy size={14} />Copier</>}
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-[13px] text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"><ExternalLink size={13} />Voir comme le client</a>
            <Dialog.Close className={btn}>Fermer</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SettingsView({ data, store, me }: { data: Data; store: Store; me: string }) {
  const [email, setEmail] = useState("");
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-8 text-[13px]">
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium text-stone-500">Projet</h2>
          <label className="flex items-center justify-between gap-4"><span>Nom</span>
            <input key={data.project.name} defaultValue={data.project.name} className={`${input} w-72`}
              onBlur={(e) => e.target.value.trim() && e.target.value !== data.project.name && store.updateProject({ name: e.target.value.trim() })} />
          </label>
          <label className="flex items-center justify-between gap-4"><span>Début du planning<span className="block text-xs text-stone-400">Les items s&apos;enchaînent à partir de cette date.</span></span>
            <input type="date" value={data.project.start_date} className={input} onChange={(e) => e.target.value && store.updateProject({ start_date: e.target.value })} />
          </label>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-stone-500">Éditeurs</h2>
          <p className="text-stone-500">Ils se connectent avec leur compte Google et peuvent modifier le plan.</p>
          {data.members.map((m) => (
            <div key={m} className="group flex h-8 items-center gap-2">
              <span className="flex-1">{m}{m === me && <span className="text-stone-400"> (vous)</span>}</span>
              {m !== me && <button aria-label={`Retirer ${m}`} onClick={() => store.removeMember(m)} className="rounded p-1 text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus-visible:opacity-100"><X size={14} /></button>}
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = email.trim().toLowerCase(); if (v) store.addMember(v); setEmail(""); }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.com" className={`${input} flex-1`} />
            <button className={btn}><Plus size={13} />Ajouter</button>
          </form>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-stone-500">Lien de consultation</h2>
          <p className="text-stone-500">Pour les devs, le manager et le client. Régénérer le lien coupe l&apos;accès à l&apos;ancien.</p>
          <div className="flex gap-2">
            <input readOnly value={shareUrl(data.project.share_token)} className={`${input} min-w-0 flex-1 text-stone-600`} onFocus={(e) => e.currentTarget.select()} aria-label="Lien de consultation" />
            <button className={btn} onClick={() => navigator.clipboard.writeText(shareUrl(data.project.share_token))}><Copy size={13} />Copier</button>
          </div>
          <AlertDialog.Root>
            <AlertDialog.Trigger className={`${btn} self-start`}>Régénérer le lien</AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Backdrop className={backdrop} />
              <AlertDialog.Popup className={dialogCls}>
                <AlertDialog.Title className="text-base font-semibold">Régénérer le lien de consultation ?</AlertDialog.Title>
                <AlertDialog.Description className="mt-1.5 text-[13px] text-stone-600">L&apos;ancien lien ne fonctionnera plus. Il faudra renvoyer le nouveau à vos lecteurs.</AlertDialog.Description>
                <div className="mt-5 flex justify-end gap-2">
                  <AlertDialog.Close className={btn}>Annuler</AlertDialog.Close>
                  <AlertDialog.Close className={btnPrimary} onClick={() => store.updateProject({ share_token: crypto.randomUUID() })}>Régénérer</AlertDialog.Close>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </section>
      </div>
    </div>
  );
}
