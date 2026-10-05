"use client";

// État d'un projet côté client : chargement, écritures optimistes, annulation.
import { useCallback, useEffect, useRef, useState } from "react";
import { isWeekend, toDay, toIso, todayIso, type Absence, type Item, type Person, type Project } from "./plan";
import { supabase } from "./supabase";
import { toasts } from "@/components/molecules/Toast";
import { freeColor } from "@/components/tokens";

export type Data = {
  project: Project & { share_token: string };
  items: Item[];
  people: Person[];
  absences: Absence[];
  members: Member[];
};
/** Éditeur du projet ; `last_sign_in_at` nul = invité·e, jamais connecté·e. */
export type Member = { email: string; last_sign_in_at: string | null };
type Q = PromiseLike<{ error: { message: string } | null }>;

const uid = () => crypto.randomUUID();

export function useProject(id: string) {
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    const [p, i, pe, a, m] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("items").select("*").eq("project_id", id),
      supabase.from("people").select("*").eq("project_id", id).order("created_at"),
      supabase.from("absences").select("*").eq("project_id", id).order("start_date"),
      supabase.rpc("project_editors", { pid: id }),
    ]);
    if (n !== seq.current) return;
    setData(p.data ? {
      project: p.data, items: i.data ?? [], people: pe.data ?? [], absences: a.data ?? [],
      members: m.data ?? [],
    } : null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Écriture serveur ; en cas d'échec on recharge l'état réel.
  const write = async (q: Q) => {
    setPending((n) => n + 1);
    const { error } = await q;
    setPending((n) => n - 1);
    setFailed(!!error);
    if (error) {
      toasts.add({ title: "Modification non enregistrée", description: error.message });
      await load();
    }
  };
  const local = (fn: (d: Data) => Data) => setData((d) => (d ? fn(d) : d));
  const pid = id;

  // Items
  const updateItems = (ids: string[], patch: Partial<Item>) => {
    local((d) => ({ ...d, items: d.items.map((i) => (ids.includes(i.id) ? { ...i, ...patch } : i)) }));
    return write(supabase.from("items").update(patch).in("id", ids));
  };
  const addItem = (fields: Partial<Item>) => {
    const item: Item = {
      id: uid(), parent_id: null, type: "feature", title: "", position: 0, estimate_jh: 0,
      owner_ids: [], status: "todo", milestone_date: null, target_ids: [], description: "", ...fields,
    };
    local((d) => ({ ...d, items: [...d.items, item] }));
    write(supabase.from("items").insert({ ...item, project_id: pid }));
    return item;
  };
  const restoreItems = (rows: Item[]) => {
    local((d) => ({ ...d, items: [...d.items, ...rows] }));
    return write(supabase.from("items").insert(rows.map((r) => ({ ...r, project_id: pid }))));
  };
  const deleteItems = (ids: string[], label: string) => {
    if (!data) return;
    // L'Item, ses descendants, et les cibles qui pointaient sur un jalon supprimé.
    const gone = new Set<string>();
    const add = (i: string) => { gone.add(i); data.items.filter((c) => c.parent_id === i).forEach((c) => add(c.id)); };
    ids.forEach(add);
    const removed = data.items.filter((i) => gone.has(i.id));
    const depth = (i: Item): number => (i.parent_id && gone.has(i.parent_id) ? 1 + depth(removed.find((r) => r.id === i.parent_id)!) : 0);
    removed.sort((a, b) => depth(a) - depth(b));
    const retargeted = data.items.filter((i) => !gone.has(i.id) && i.target_ids.some((t) => gone.has(t)));
    local((d) => ({ ...d, items: d.items.filter((i) => !gone.has(i.id)) }));
    write(supabase.from("items").delete().in("id", ids));
    for (const r of retargeted) updateItems([r.id], { target_ids: r.target_ids.filter((t) => !gone.has(t)) });
    const undo = async () => {
      await restoreItems(removed);
      for (const r of retargeted) await updateItems([r.id], { target_ids: r.target_ids });
    };
    const tid = toasts.add({
      title: label,
      timeout: 8000,
      actionProps: { children: "Annuler", onClick: () => { toasts.close(tid); undo(); } },
    });
    lastUndo.current = () => { toasts.close(tid); undo(); lastUndo.current = null; };
  };
  const lastUndo = useRef<null | (() => void)>(null);
  // Tag posé par erreur ou qui n'a plus lieu d'être : retiré de l'historique (contrairement à « Lever »), annulable.
  const removeTag = (item: Item, tagId: string, label: string) => {
    const prev = item.tag_log ?? [];
    updateItems([item.id], { tag_log: prev.filter((x) => x.id !== tagId) });
    const tid = toasts.add({ title: label, timeout: 8000, actionProps: { children: "Annuler", onClick: () => { toasts.close(tid); updateItems([item.id], { tag_log: prev }); } } });
  };

  // People / absences
  const addPerson = (name: string) => {
    const p: Person = { id: uid(), name, capacity: 1, defect_share: 0, color: freeColor(data?.people ?? []) };
    local((d) => ({ ...d, people: [...d.people, p] }));
    write(supabase.from("people").insert({ ...p, project_id: pid }));
    return p;
  };
  const updatePerson = (pidn: string, patch: Partial<Person>) => {
    local((d) => ({ ...d, people: d.people.map((p) => (p.id === pidn ? { ...p, ...patch } : p)) }));
    return write(supabase.from("people").update(patch).eq("id", pidn));
  };
  const deletePerson = (pidn: string) => {
    local((d) => ({
      ...d,
      people: d.people.filter((p) => p.id !== pidn),
      absences: d.absences.filter((a) => a.person_id !== pidn),
      items: d.items.map((i) => ({ ...i, owner_ids: i.owner_ids.filter((o) => o !== pidn) })),
    }));
    return write(supabase.from("people").delete().eq("id", pidn));
  };
  const addAbsences = (rows: Omit<Absence, "id">[]) => {
    const full = rows.map((r) => ({ ...r, id: uid() }));
    local((d) => ({ ...d, absences: [...d.absences, ...full].sort((a, b) => a.start_date.localeCompare(b.start_date)) }));
    return write(supabase.from("absences").insert(full.map((r) => ({ ...r, project_id: pid }))));
  };
  const deleteAbsence = (aid: string) => {
    local((d) => ({ ...d, absences: d.absences.filter((a) => a.id !== aid) }));
    return write(supabase.from("absences").delete().eq("id", aid));
  };

  // Projet, éditeurs, partage
  const updateProject = (patch: Partial<Data["project"]>) => {
    local((d) => ({ ...d, project: { ...d.project, ...patch } }));
    return write(supabase.from("projects").update(patch).eq("id", pid));
  };
  const addMember = (email: string) => {
    if (data?.members.some((m) => m.email === email)) return;
    local((d) => ({ ...d, members: [...d.members, { email, last_sign_in_at: null }].sort((a, b) => a.email.localeCompare(b.email)) }));
    return write(supabase.from("project_members").insert({ project_id: pid, email }));
  };
  const removeMember = (email: string) => {
    local((d) => ({ ...d, members: d.members.filter((m) => m.email !== email) }));
    return write(supabase.from("project_members").delete().eq("project_id", pid).eq("email", email));
  };

  // Projet exemple pour démarrer vite.
  const seedExample = async () => {
    const [a, b, c] = [["Alice Martin", 1], ["Bob Durand", 0.5], ["Claire Lefèvre", 1]]
      .map(([name, capacity], k) => ({ id: uid(), name: name as string, capacity: capacity as number, color: freeColor(data!.people) + k }));
    local((d) => ({ ...d, people: [...d.people, a, b, c] }));
    await write(supabase.from("people").insert([a, b, c].map((p) => ({ ...p, project_id: pid }))));
    const start = data!.project.start_date;
    const d = (days: number) => new Date(Date.parse(start) + days * 86_400_000).toISOString().slice(0, 10);
    // Dates réelles relatives à aujourd'hui, ramenées au jour ouvré précédent.
    const ago = (days: number) => { let x = toDay(todayIso()) - days; while (isWeekend(x)) x--; return toIso(x); };
    const it = (f: Partial<Item>): Item => ({
      id: uid(), parent_id: null, type: "feature", title: "", position: 0, estimate_jh: 0,
      owner_ids: [], status: "todo", milestone_date: null, target_ids: [], description: "", ...f,
    });
    const demo = it({ type: "milestone", title: "Démo client", milestone_date: d(25) });
    const auth = it({ title: "Authentification", position: 1 });
    const shop = it({ title: "Boutique", position: 2, target_ids: [demo.id] });
    // Une seule insertion, parents avant enfants.
    await restoreItems([
      demo, it({ type: "milestone", title: "V1", milestone_date: d(46) }), auth, shop,
      it({ title: "Connexion SSO", parent_id: auth.id, position: 1, estimate_jh: 5, owner_ids: [a.id], status: "done", started_on: ago(14), done_on: ago(6) }),
      it({ title: "Gestion des rôles", parent_id: auth.id, position: 2, estimate_jh: 5, owner_ids: [c.id], status: "doing", started_on: ago(11) }),
      it({ title: "Catalogue", parent_id: shop.id, position: 1, estimate_jh: 12, owner_ids: [a.id, b.id], status: "doing", started_on: ago(3) }),
      it({ title: "Paiement", parent_id: shop.id, position: 2, estimate_jh: 5, owner_ids: [b.id], target_ids: [demo.id] }),
      it({ title: "Notifications", position: 3, estimate_jh: 3, owner_ids: [c.id] }),
      it({ title: "Back-office", position: 4, estimate_jh: 12, owner_ids: [c.id] }),
    ]);
  };

  return {
    data, reload: load, saving: pending > 0, failed,
    updateItems, addItem, deleteItems, removeTag, undo: () => lastUndo.current?.(),
    addPerson, updatePerson, deletePerson, addAbsences, deleteAbsence,
    updateProject, addMember, removeMember, seedExample,
  };
}

export type Store = ReturnType<typeof useProject>;
