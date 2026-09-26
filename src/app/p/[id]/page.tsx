"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Timeline, { EndLabel, initials, type CellCtx } from "@/components/Timeline";
import type { Absence, Item, Person, Project } from "@/lib/plan";
import { supabase } from "@/lib/supabase";

type Data = { project: Project; items: Item[]; people: Person[]; absences: Absence[]; members: string[] };

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [me, setMe] = useState("");
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    const [p, i, pe, a, m, u] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("items").select("*").eq("project_id", id),
      supabase.from("people").select("*").eq("project_id", id).order("created_at"),
      supabase.from("absences").select("*").eq("project_id", id).order("start_date"),
      supabase.from("project_members").select("email").eq("project_id", id).order("email"),
      supabase.auth.getUser(),
    ]);
    if (n !== seq.current) return; // une réponse plus récente est déjà en route
    setMe(u.data.user?.email ?? "");
    setData(p.data ? {
      project: p.data, items: i.data ?? [], people: pe.data ?? [], absences: a.data ?? [],
      members: (m.data ?? []).map((x) => x.email),
    } : null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Toute écriture passe par ici : erreur affichée, puis rechargement.
  const run = async (q: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await q;
    if (error) alert(error.message);
    await load();
  };

  if (data === undefined) return null;
  if (data === null) return (
    <main className="p-8">Projet introuvable ou accès refusé. <Link href="/" className="underline">Retour</Link></main>
  );

  const { project, items, people, absences, members } = data;
  const siblings = (parent: string | null) =>
    items.filter((i) => i.parent_id === parent).sort((a, b) => a.position - b.position);
  const nextPos = (parent: string | null) => Math.max(0, ...siblings(parent).map((i) => i.position)) + 1;
  const milestones = items.filter((i) => i.type === "milestone");
  const updateItem = (itemId: string, patch: Partial<Item>) => {
    // Optimiste : deux clics rapides (ex. owners) partent de l'état à jour, pas de l'ancien.
    setData((d) => d && { ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
    return run(supabase.from("items").update(patch).eq("id", itemId));
  };
  const addItem = (type: Item["type"]) => run(supabase.from("items").insert({
    project_id: project.id, type, position: nextPos(null),
    title: type === "milestone" ? "Nouveau jalon" : "Nouvel item",
    milestone_date: type === "milestone" ? project.start_date : null,
  }));

  const move = async (item: Item, dir: -1 | 1) => {
    const sib = siblings(item.parent_id);
    const other = sib[sib.findIndex((s) => s.id === item.id) + dir];
    if (!other) return;
    await supabase.from("items").update({ position: other.position }).eq("id", item.id);
    await run(supabase.from("items").update({ position: item.position }).eq("id", other.id));
  };
  const indent = (item: Item) => {
    const sib = siblings(item.parent_id);
    const prev = sib[sib.findIndex((s) => s.id === item.id) - 1];
    if (prev?.type === "feature") updateItem(item.id, { parent_id: prev.id, position: nextPos(prev.id) });
  };
  const outdent = (item: Item) => {
    const parent = items.find((i) => i.id === item.parent_id);
    // ponytail: position à mi-chemin, peut finir par collisionner après beaucoup de déplacements au même endroit
    if (parent) updateItem(item.id, { parent_id: parent.parent_id, position: parent.position + 0.5 });
  };

  const itemCell = ({ row, span, late, jh }: CellCtx) => {
    const { item, depth, hasChildren } = row;
    const sib = siblings(item.parent_id);
    const idx = sib.findIndex((s) => s.id === item.id);
    const isMs = item.type === "milestone";
    return (
      <div className="flex w-full items-center gap-1 px-1">
        <span className="flex shrink-0 text-xs">
          <button className="icon" title="Monter" disabled={idx === 0} onClick={() => move(item, -1)}>↑</button>
          <button className="icon" title="Descendre" disabled={idx === sib.length - 1} onClick={() => move(item, 1)}>↓</button>
          <button className="icon" title="Sortir du parent" disabled={!item.parent_id} onClick={() => outdent(item)}>←</button>
          <button className="icon" title="Mettre dans l'item au-dessus" disabled={sib[idx - 1]?.type !== "feature"}
            onClick={() => indent(item)}>→</button>
        </span>
        <span style={{ width: depth * 14 }} className="shrink-0" />
        <input key={item.title} defaultValue={item.title} aria-label="Titre"
          className={`cell min-w-0 flex-1 ${hasChildren ? "font-semibold" : ""} ${isMs ? "text-violet-700" : ""}`}
          onBlur={(e) => e.target.value !== item.title && updateItem(item.id, { title: e.target.value })} />
        {isMs ? (
          <input type="date" defaultValue={item.milestone_date ?? ""} key={item.milestone_date} aria-label="Date du jalon"
            className="cell w-[248px] text-xs"
            onChange={(e) => e.target.value && updateItem(item.id, { milestone_date: e.target.value })} />
        ) : (<>
          {hasChildren ? <span className="w-14 text-right text-slate-500">{jh} JH</span> : (
            <span className="flex w-14 items-center">
              <input type="number" min={0} step={0.5} defaultValue={item.estimate_jh} key={item.estimate_jh}
                aria-label="Estimation (JH)" className="cell w-10 text-right"
                onBlur={(e) => Number(e.target.value) !== Number(item.estimate_jh)
                  && updateItem(item.id, { estimate_jh: Math.max(0, Number(e.target.value)) })} />
              <span className="text-xs text-slate-400">JH</span>
            </span>
          )}
          <span className="w-20">{!hasChildren && <OwnersPicker item={item} people={people} onChange={(ids) => updateItem(item.id, { owner_ids: ids })} />}</span>
          <select value={item.status} aria-label="Statut" className="cell w-[72px] text-xs"
            onChange={(e) => updateItem(item.id, { status: e.target.value as Item["status"] })}>
            <option value="todo">À faire</option><option value="doing">En cours</option><option value="done">Fait</option>
          </select>
          <select value={item.target_id ?? ""} aria-label="Jalon cible" className="cell w-[88px] text-xs"
            onChange={(e) => updateItem(item.id, { target_id: e.target.value || null })}>
            <option value="">— jalon</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </>)}
        <span className="w-20 text-right text-xs"><EndLabel span={span} item={item} late={late} /></span>
        <button className="icon" title="Supprimer" aria-label="Supprimer"
          onClick={() => confirm(`Supprimer « ${item.title} »${hasChildren ? " et ses sous-items" : ""} ?`)
            && run(supabase.from("items").delete().eq("id", item.id))}>✕</button>
      </div>
    );
  };

  const personCell = (p: Person) => (
    <div className="flex w-full items-center gap-2">
      <input key={p.name} defaultValue={p.name} aria-label="Nom" className="cell min-w-0 flex-1 font-medium"
        onBlur={(e) => e.target.value && e.target.value !== p.name && run(supabase.from("people").update({ name: e.target.value }).eq("id", p.id))} />
      <input type="number" min={5} max={100} step={5} key={p.capacity} defaultValue={Math.round(p.capacity * 100)}
        aria-label="Disponibilité (%)" className="cell w-14 text-right"
        onBlur={(e) => {
          const c = Math.min(100, Math.max(5, Number(e.target.value))) / 100;
          if (c !== Number(p.capacity)) run(supabase.from("people").update({ capacity: c }).eq("id", p.id));
        }} />
      <span className="text-xs text-slate-400">%</span>
      <button className="icon" title="Supprimer" aria-label="Supprimer la personne"
        onClick={() => confirm(`Retirer ${p.name} de l'équipe ?`) && run(supabase.from("people").delete().eq("id", p.id))}>✕</button>
    </div>
  );

  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/share/${project.share_token}`;

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/" className="text-slate-500 hover:text-slate-900">← Projets</Link>
        <input key={project.name} defaultValue={project.name} aria-label="Nom du projet"
          className="cell text-2xl font-bold"
          onBlur={(e) => e.target.value && e.target.value !== project.name
            && run(supabase.from("projects").update({ name: e.target.value }).eq("id", project.id))} />
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Début
          <input type="date" defaultValue={project.start_date} key={project.start_date} className="input"
            onChange={(e) => e.target.value && run(supabase.from("projects").update({ start_date: e.target.value }).eq("id", project.id))} />
        </label>
        <span className="ml-auto flex gap-2">
          <button className="btn" onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert("Lien de consultation copié :\n" + shareUrl))}>
            Copier le lien de consultation
          </button>
          <a className="btn" href={shareUrl} target="_blank">Voir</a>
        </span>
      </header>

      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => addItem("feature")}>+ Item</button>
        <button className="btn" onClick={() => addItem("milestone")}>+ Jalon</button>
      </div>

      <Timeline project={project} items={items} people={people} absences={absences} left={760}
        itemCell={itemCell} personCell={personCell} />

      <div className="grid gap-6 md:grid-cols-3">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Équipe</h2>
          <p className="text-sm text-slate-500">Disponibilité en % (temps partiel). Modifiable dans la vue Équipe du planning.</p>
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            e.currentTarget.reset();
            run(supabase.from("people").insert({ project_id: project.id, name: String(f.get("name")), capacity: Number(f.get("capacity")) / 100 }));
          }}>
            <input name="name" required placeholder="Nom" className="input flex-1" />
            <input name="capacity" type="number" min={5} max={100} step={5} defaultValue={100} aria-label="Disponibilité (%)" className="input w-20" />
            <button className="btn">Ajouter</button>
          </form>
          <ul className="text-sm">
            {people.map((p) => <li key={p.id}>{p.name} · {Math.round(p.capacity * 100)} %</li>)}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Absences</h2>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const who = String(f.get("person"));
            const [start_date, end_date] = [String(f.get("start")), String(f.get("end"))];
            if (end_date < start_date) return alert("La fin doit être après le début.");
            e.currentTarget.reset();
            run(supabase.from("absences").insert((who ? [who] : people.map((p) => p.id)).map((person_id) => ({
              project_id: project.id, person_id, start_date, end_date, label: String(f.get("label")),
            }))));
          }}>
            <select name="person" className="input" aria-label="Personne">
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="">Toute l&apos;équipe</option>
            </select>
            <input name="start" type="date" required aria-label="Début" className="input" />
            <input name="end" type="date" required aria-label="Fin" className="input" />
            <input name="label" placeholder="Motif (optionnel)" className="input flex-1" />
            <button className="btn" disabled={!people.length}>Ajouter</button>
          </form>
          <ul className="flex flex-col gap-1 text-sm">
            {absences.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span className="flex-1">
                  {people.find((p) => p.id === a.person_id)?.name} · {a.start_date === a.end_date ? a.start_date : `${a.start_date} → ${a.end_date}`}
                  {a.label && <span className="text-slate-500"> · {a.label}</span>}
                </span>
                <button className="icon" aria-label="Supprimer l'absence" onClick={() => run(supabase.from("absences").delete().eq("id", a.id))}>✕</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Éditeurs</h2>
          <p className="text-sm text-slate-500">Peuvent modifier le plan après s&apos;être connectés avec cet email. Tout le monde peut consulter via le lien.</p>
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const email = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
            e.currentTarget.reset();
            run(supabase.from("project_members").insert({ project_id: project.id, email }));
          }}>
            <input name="email" type="email" required placeholder="email@exemple.com" className="input flex-1" />
            <button className="btn">Ajouter</button>
          </form>
          <ul className="flex flex-col gap-1 text-sm">
            {members.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span className="flex-1">{m}{m === me && " (toi)"}</span>
                {m !== me && <button className="icon" aria-label={`Retirer ${m}`}
                  onClick={() => run(supabase.from("project_members").delete().eq("project_id", project.id).eq("email", m))}>✕</button>}
              </li>
            ))}
          </ul>
          <button className="btn self-start" onClick={() => confirm("Le lien actuel ne fonctionnera plus. Continuer ?")
            && run(supabase.from("projects").update({ share_token: crypto.randomUUID() }).eq("id", project.id))}>
            Régénérer le lien de consultation
          </button>
        </section>
      </div>
    </main>
  );
}

function OwnersPicker({ item, people, onChange }: { item: Item; people: Person[]; onChange: (ids: string[]) => void }) {
  const owners = people.filter((p) => item.owner_ids.includes(p.id));
  const id = `owners-${item.id}`;
  // Popover natif : rendu dans le top layer, donc pas coupé par le scroll de la timeline.
  return (<>
    <button popoverTarget={id} style={{ anchorName: `--${id}` } as React.CSSProperties}
      className={`cell w-full truncate text-left text-xs ${owners.length ? "" : "text-amber-600"}`}
      title={owners.map((o) => o.name).join(", ")}>
      {owners.length ? owners.map((o) => initials(o.name)).join(" ") : "owner ?"}
    </button>
    <div id={id} popover="auto" className="m-0 w-48 flex-col gap-1 rounded border border-slate-200 bg-white p-2 shadow-lg open:flex"
      style={{ positionAnchor: `--${id}`, top: "anchor(bottom)", left: "anchor(left)" } as React.CSSProperties}>
      {people.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={item.owner_ids.includes(p.id)}
            onChange={(e) => onChange(e.target.checked ? [...item.owner_ids, p.id] : item.owner_ids.filter((o) => o !== p.id))} />
          {p.name}
        </label>
      ))}
      {!people.length && <span className="text-xs text-slate-500">Ajoute des personnes dans « Équipe ».</span>}
    </div>
  </>);
}
