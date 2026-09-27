"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Toast } from "@base-ui/react/toast";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Check, ChevronRight, ListFilter, Link2, Plus, SlidersHorizontal, X } from "lucide-react";
import { orderItems, schedule, type Item, type Row } from "@/lib/plan";
import { useProject } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import Timeline, { LEFT, axis, type PickKind, type Zoom } from "@/components/Timeline";
import ItemPanel from "@/components/ItemPanel";
import CommandPalette, { type Command } from "@/components/CommandPalette";
import { Picker, type PickerState } from "@/components/pickers";
import Sidebar, { VIEWS, type View } from "@/components/Sidebar";
import { AbsenceDialog, AbsencesView, MilestonesView, SettingsView, ShareDialog, TeamView, btn, btnPrimary } from "@/components/views";
import { Avatar, Kbd, StatusIcon, Toaster, itemCls, popupCls, toasts } from "@/components/ui";

export default function Page() {
  return (
    <Toast.Provider toastManager={toasts}>
      <Suspense><ProjectPage /></Suspense>
      <Toaster />
    </Toast.Provider>
  );
}

const CELL: Record<PickKind, string> = { status: "status", owners: "owners", estimate: "estimate", milestone: "title" };
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const store = useProject(id);
  const { data } = store;
  const [me, setMe] = useState<string | null>(null);

  const view = (params.get("view") as View) || "timeline";
  const openId = params.get("item");
  const zoom = (params.get("zoom") as Zoom) || "mois";
  // replaceState est synchrone (pas de course entre deux changements rapides) et resynchronise useSearchParams.
  const setParams = useCallback((patch: Record<string, string | null>) => {
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) if (v === null) p.delete(k); else p.set(k, v);
    window.history.replaceState(null, "", `?${p}`);
  }, []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<PickerState>(null);
  const [palette, setPalette] = useState(false);
  const [share, setShare] = useState(false);
  const [absenceDlg, setAbsenceDlg] = useState(false);
  const [colorBy, setColorBy] = useState<"status" | "owner">("status");
  const [showDone, setShowDone] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<Set<string>>(new Set());
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [ctxId, setCtxId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gPressed = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => {
      if (!s.session) router.replace("/");
      else setMe(s.session.user.email ?? "");
    });
    try { localStorage.setItem("cap:last", id); } catch {}
  }, [id, router]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const plan = useMemo(() => schedule(data?.items ?? [], data?.people ?? [], data?.absences ?? [], data?.project.start_date ?? "2026-01-01"), [data]);
  const allRows = useMemo(() => orderItems(items), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Lignes visibles : parents repliés et filtres.
  const rows = useMemo(() => {
    const keepLeaf = (r: Row) => (showDone || r.item.status !== "done")
      && (!ownerFilter.size || r.item.owner_ids.some((o) => ownerFilter.has(o)));
    const kept = new Set<string>();
    for (const r of allRows) if (!r.hasChildren && keepLeaf(r)) {
      for (let it: Item | undefined = r.item; it; it = it.parent_id ? byId.get(it.parent_id) : undefined) kept.add(it.id);
    }
    const hidden = (it: Item): boolean => !!it.parent_id && (collapsed.has(it.parent_id) || hidden(byId.get(it.parent_id)!));
    return allRows.filter((r) => (r.hasChildren ? kept.has(r.item.id) || (!ownerFilter.size && showDone) : kept.has(r.item.id)) && !hidden(r.item));
  }, [allRows, byId, collapsed, showDone, ownerFilter]);
  const order = useMemo(() => rows.map((r) => r.item.id), [rows]);

  const ax = useMemo(() => axis(zoom, data?.project.start_date ?? "2026-01-01", [
    ...[...plan.spans.values()].flatMap((s) => (s ? [s.start, s.end] : [])),
  ]), [zoom, data?.project.start_date, plan]);

  const scrollToToday = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = (ax.today - ax.from) * ax.px - 160;
  }, [ax]);
  useEffect(() => { scrollToToday(); }, [zoom, view, !!data]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Actions sur les Items ---
  const targets = useCallback(() => (selected.size ? [...selected] : cursor ? [cursor] : []), [selected, cursor]);
  const openItem = (iid: string) => { setCursor(iid); setSelected(new Set([iid])); setParams({ item: iid, view: view === "timeline" || view === "equipe" ? view : "timeline" }); };
  const closePanel = () => setParams({ item: null });
  const siblings = (parent: string | null) => items.filter((i) => i.type === "feature" && i.parent_id === parent).sort((a, b) => a.position - b.position);
  const between = (a?: Item, b?: Item) => (a && b ? (a.position + b.position) / 2 : a ? a.position + 1 : b ? b.position - 1 : 1);

  const newItem = (parentId: string | null, after?: string) => {
    const sib = siblings(parentId);
    const i = after ? sib.findIndex((s) => s.id === after) : sib.length - 1;
    const it = store.addItem({ parent_id: parentId, position: between(sib[i], sib[i + 1]) });
    if (parentId) setCollapsed((c) => { const n = new Set(c); n.delete(parentId); return n; });
    setCursor(it.id); setSelected(new Set([it.id])); setRenaming(it.id);
    return it;
  };
  const newFromCursor = () => {
    const cur = cursor ? byId.get(cursor) : undefined;
    newItem(cur?.parent_id ?? null, cur?.id);
  };
  const moveTo = (iid: string, parentId: string | null, position: number) => store.updateItems([iid], { parent_id: parentId, position });
  const isDescendant = (iid: string, of: string): boolean => { const it = byId.get(iid); return !!it?.parent_id && (it.parent_id === of || isDescendant(it.parent_id, of)); };
  const drop = (dragId: string, targetId: string, where: "before" | "after") => {
    if (dragId === targetId || isDescendant(targetId, dragId)) return;
    const target = byId.get(targetId)!;
    const sib = siblings(target.parent_id).filter((s) => s.id !== dragId);
    const i = sib.findIndex((s) => s.id === targetId);
    moveTo(dragId, target.parent_id, where === "before" ? between(sib[i - 1], sib[i]) : between(sib[i], sib[i + 1]));
  };
  const moveBy = (iid: string, dir: -1 | 1) => {
    const it = byId.get(iid); if (!it) return;
    const sib = siblings(it.parent_id);
    const i = sib.findIndex((s) => s.id === iid);
    const other = sib[i + dir]; if (!other) return;
    store.updateItems([iid], { position: other.position });
    store.updateItems([other.id], { position: it.position });
  };
  const indent = (iid: string) => {
    const it = byId.get(iid); if (!it) return;
    const sib = siblings(it.parent_id);
    const prev = sib[sib.findIndex((s) => s.id === iid) - 1]; if (!prev) return;
    const kids = siblings(prev.id);
    moveTo(iid, prev.id, between(kids.at(-1), undefined));
    setCollapsed((c) => { const n = new Set(c); n.delete(prev.id); return n; });
  };
  const outdent = (iid: string) => {
    const it = byId.get(iid); const parent = it?.parent_id ? byId.get(it.parent_id) : undefined; if (!it || !parent) return;
    const sib = siblings(parent.parent_id);
    const i = sib.findIndex((s) => s.id === parent.id);
    moveTo(iid, parent.parent_id, between(sib[i], sib[i + 1]));
  };
  const remove = (ids: string[]) => {
    if (!ids.length) return;
    const one = byId.get(ids[0]);
    store.deleteItems(ids, ids.length > 1 ? `${ids.length} items supprimés` : `« ${one?.title || "Sans titre"} » supprimé`);
    setSelected(new Set()); if (openId && ids.includes(openId)) closePanel();
  };
  const rename = (iid: string, title: string | null) => {
    setRenaming(null);
    if (title !== null && title !== byId.get(iid)?.title) store.updateItems([iid], { title });
  };
  const pickFor = (kind: PickKind, ids = targets()) => {
    if (!ids.length) return;
    const row = document.querySelector(`[data-row="${ids[0]}"]`);
    const anchor = row?.querySelector(`[data-cell="${CELL[kind]}"]`) ?? row ?? document.body;
    setPicker({ kind, ids, anchor });
  };
  const rowClick = (iid: string, e: React.MouseEvent) => {
    if (e.shiftKey && cursor) {
      const [a, b] = [order.indexOf(cursor), order.indexOf(iid)].sort((x, y) => x - y);
      setSelected(new Set(order.slice(a, b + 1))); closePanel(); return;
    }
    if (e.metaKey || e.ctrlKey) {
      setSelected((s) => { const n = new Set(s); if (n.has(iid)) n.delete(iid); else n.add(iid); return n; });
      setCursor(iid); closePanel(); return;
    }
    openItem(iid);
  };
  const toggle = (iid: string, open?: boolean) => setCollapsed((c) => {
    const n = new Set(c);
    if (open ?? n.has(iid)) n.delete(iid); else n.add(iid);
    return n;
  });

  // --- Clavier ---
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  // Le gestionnaire est remplacé après chaque rendu pour toujours voir l'état courant.
  useEffect(() => { keys.current = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); return; }
    const inPopup = e.target instanceof HTMLElement && e.target.closest("[role=menu],[role=dialog],[role=alertdialog],[role=listbox]");
    if (palette || picker || share || absenceDlg || renaming || typing(e.target) || inPopup) return;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); store.undo(); return; }
    if (mod || e.altKey && !["ArrowUp", "ArrowDown"].includes(e.key)) return;
    const k = e.key;
    if (gPressed.current && Date.now() - gPressed.current < 1200) {
      gPressed.current = 0;
      const v = VIEWS.find((x) => x.g.toLowerCase() === k.toLowerCase());
      if (v) { setParams({ view: v.key, item: null }); return; }
    }
    if (k === "g") { gPressed.current = Date.now(); return; }
    if (k === "1" || k === "2" || k === "3") { setParams({ zoom: (["semaine", "mois", "trimestre"] as Zoom[])[Number(k) - 1] }); return; }
    if (k === "t") { scrollToToday(); return; }
    if (view !== "timeline") { if (k === "Escape") { closePanel(); setOpenPerson(null); } return; }
    const idx = cursor ? order.indexOf(cursor) : -1;
    const go = (i: number) => {
      const nid = order[Math.max(0, Math.min(order.length - 1, i))]; if (!nid) return;
      e.preventDefault();
      if (e.shiftKey) { setSelected((s) => new Set([...s, nid, ...(cursor ? [cursor] : [])])); setCursor(nid); return; }
      if (openId) openItem(nid); else { setCursor(nid); setSelected(new Set([nid])); }
      document.querySelector(`[data-row="${nid}"]`)?.scrollIntoView({ block: "nearest" });
    };
    if (e.altKey && k === "ArrowUp" && cursor) { e.preventDefault(); moveBy(cursor, -1); return; }
    if (e.altKey && k === "ArrowDown" && cursor) { e.preventDefault(); moveBy(cursor, 1); return; }
    if (k === "ArrowDown" || k === "j") return go(idx + 1);
    if (k === "ArrowUp" || k === "k") return go(idx < 0 ? 0 : idx - 1);
    if (k === "Escape") { if (openId) closePanel(); else { setSelected(new Set()); setCursor(null); } return; }
    if (k === "c") { e.preventDefault(); newFromCursor(); return; }
    if (!cursor && !selected.size) return;
    if ((k === "Enter" || k === " ") && cursor) { e.preventDefault(); openItem(cursor); return; }
    if (k === "s") { e.preventDefault(); pickFor("status"); return; }
    if (k === "a") { e.preventDefault(); pickFor("owners"); return; }
    if (k === "e") { e.preventDefault(); pickFor("estimate"); return; }
    if (k === "m") { e.preventDefault(); pickFor("milestone"); return; }
    if (k === "r" && cursor) { e.preventDefault(); setRenaming(cursor); return; }
    if (k === "x" && cursor) { setSelected((s) => { const n = new Set(s); if (n.has(cursor)) n.delete(cursor); else n.add(cursor); return n; }); return; }
    if (k === "Tab" && cursor) { e.preventDefault(); if (e.shiftKey) outdent(cursor); else indent(cursor); return; }
    if (k === "ArrowLeft" && cursor) { toggle(cursor, false); return; }
    if (k === "ArrowRight" && cursor) { toggle(cursor, true); return; }
    if (k === "Backspace" || k === "Delete") { e.preventDefault(); remove(targets()); }
  }; });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (data === undefined || me === null) return <Skeleton />;
  if (data === null) return (
    <main className="flex h-screen items-center justify-center p-8 text-[13px] text-stone-600">
      Projet introuvable ou accès refusé.&nbsp;<Link href="/" className="underline">Retour</Link>
    </main>
  );

  const openItemObj = openId ? byId.get(openId) : undefined;
  const cursorItem = cursor ? byId.get(cursor) : undefined;
  const features = items.filter((i) => i.type === "feature");
  const viewLabel = view === "settings" ? "Paramètres" : VIEWS.find((v) => v.key === view)?.label;

  const commands: Command[] = [
    ...(targets().length ? [
      { id: "s", group: "Sur l'item", label: "Changer le statut…", keys: ["S"], keywords: "etat avancement", run: () => pickFor("status") },
      { id: "a", group: "Sur l'item", label: "Assigner à…", keys: ["A"], keywords: "owner responsable personne", run: () => pickFor("owners") },
      { id: "e", group: "Sur l'item", label: "Définir l'estimation…", keys: ["E"], keywords: "charge jours jh", run: () => pickFor("estimate") },
      { id: "m", group: "Sur l'item", label: "Cibler un jalon…", keys: ["M"], keywords: "milestone date", run: () => pickFor("milestone") },
      ...(cursor ? [{ id: "r", group: "Sur l'item", label: "Renommer", keys: ["R"], run: () => { setParams({ view: "timeline" }); setRenaming(cursor); } }] : []),
      { id: "del", group: "Sur l'item", label: "Supprimer", keys: ["⌫"], run: () => remove(targets()) },
    ] : []),
    { id: "new", group: "Créer", label: "Nouvel item", keys: ["C"], keywords: "ajouter tache feature", run: () => { setParams({ view: "timeline" }); newFromCursor(); } },
    { id: "newms", group: "Créer", label: "Nouveau jalon", keywords: "milestone", run: () => { setParams({ view: "jalons" }); store.addItem({ type: "milestone", title: "Nouveau jalon", milestone_date: data.project.start_date }); } },
    { id: "newp", group: "Créer", label: "Ajouter une personne", keywords: "equipe membre", run: () => { setParams({ view: "equipe" }); setOpenPerson(store.addPerson("Nouvelle personne").id); } },
    { id: "newa", group: "Créer", label: "Ajouter une absence", keywords: "conges ferie vacances", run: () => setAbsenceDlg(true) },
    ...VIEWS.map((v) => ({ id: `go-${v.key}`, group: "Aller à", label: v.label, keys: ["G", v.g], run: () => setParams({ view: v.key, item: null }) })),
    { id: "go-settings", group: "Aller à", label: "Paramètres", keywords: "editeurs lien", run: () => setParams({ view: "settings", item: null }) },
    { id: "share", group: "Aller à", label: "Partager le plan", keywords: "lien client", run: () => setShare(true) },
    { id: "z1", group: "Vue", label: "Zoom semaine", keys: ["1"], run: () => setParams({ zoom: "semaine" }) },
    { id: "z2", group: "Vue", label: "Zoom mois", keys: ["2"], run: () => setParams({ zoom: "mois" }) },
    { id: "z3", group: "Vue", label: "Zoom trimestre", keys: ["3"], run: () => setParams({ zoom: "trimestre" }) },
    { id: "today", group: "Vue", label: "Revenir à aujourd'hui", keys: ["T"], run: scrollToToday },
    ...features.map((f) => ({ id: `item-${f.id}`, group: "Items", label: f.title || "Sans titre", icon: <StatusIcon status={f.status} />, run: () => openItem(f.id) })),
  ];

  const seg = (z: Zoom, label: string) => (
    <button onClick={() => setParams({ zoom: z })} className={`h-[22px] rounded-[5px] px-2.5 text-xs ${zoom === z ? "bg-white font-medium text-stone-900 shadow-[0_1px_2px_rgba(28,25,23,.08)]" : "text-stone-500"}`}>{label}</button>
  );
  const zoomCtl = (
    <>
      <div role="group" aria-label="Zoom" className="flex rounded-[7px] bg-stone-100 p-0.5">{seg("semaine", "Semaine")}{seg("mois", "Mois")}{seg("trimestre", "Trimestre")}</div>
      <button className={`${btn} h-[26px] text-xs font-normal`} onClick={scrollToToday}>Aujourd&apos;hui</button>
    </>
  );

  const timelineToolbar = (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-stone-100 px-5">
      <Menu.Root>
        <Menu.Trigger className={`inline-flex h-[26px] items-center gap-1.5 rounded-md border px-2 text-xs ${ownerFilter.size ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-dashed border-stone-300 text-stone-500 hover:bg-stone-50"}`}>
          <ListFilter size={13} />{ownerFilter.size ? `${ownerFilter.size} owner${ownerFilter.size > 1 ? "s" : ""}` : "Filtrer"}
        </Menu.Trigger>
        <Menu.Portal><Menu.Positioner align="start" sideOffset={6} className="z-50"><Menu.Popup className={popupCls}>
          <div className="px-2.5 pb-1 pt-1 text-xs text-stone-400">Owners</div>
          {data.people.map((p) => (
            <Menu.CheckboxItem key={p.id} closeOnClick={false} className={itemCls} checked={ownerFilter.has(p.id)}
              onCheckedChange={(c) => setOwnerFilter((s) => { const n = new Set(s); if (c) n.add(p.id); else n.delete(p.id); return n; })}>
              <Avatar person={p} /><span className="flex-1">{p.name}</span><Menu.CheckboxItemIndicator><Check size={14} className="text-indigo-600" /></Menu.CheckboxItemIndicator>
            </Menu.CheckboxItem>
          ))}
          {ownerFilter.size > 0 && <Menu.Item className={`${itemCls} text-stone-500`} onClick={() => setOwnerFilter(new Set())}><X size={14} />Effacer le filtre</Menu.Item>}
          {!data.people.length && <div className="px-2.5 py-2 text-stone-500">Aucune personne.</div>}
        </Menu.Popup></Menu.Positioner></Menu.Portal>
      </Menu.Root>
      <Popover.Root>
        <Popover.Trigger className="inline-flex h-[26px] items-center gap-1.5 rounded-md px-2 text-xs text-stone-600 hover:bg-stone-100"><SlidersHorizontal size={13} />Affichage</Popover.Trigger>
        <Popover.Portal><Popover.Positioner align="start" sideOffset={6} className="z-50"><Popover.Popup className={`${popupCls} w-64 p-3 text-[13px]`}>
          <div className="mb-1.5 text-xs text-stone-500">Couleur des barres</div>
          <div className="flex rounded-[7px] bg-stone-100 p-0.5">
            {(["status", "owner"] as const).map((c) => (
              <button key={c} onClick={() => setColorBy(c)} className={`h-[24px] flex-1 rounded-[5px] text-xs ${colorBy === c ? "bg-white font-medium shadow-[0_1px_2px_rgba(28,25,23,.08)]" : "text-stone-500"}`}>{c === "status" ? "Statut" : "Owner"}</button>
            ))}
          </div>
          <label className="mt-3 flex items-center justify-between"><span>Afficher les items faits</span>
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-4 accent-indigo-600" /></label>
        </Popover.Popup></Popover.Positioner></Popover.Portal>
      </Popover.Root>
      <span className="flex-1" />
      {zoomCtl}
      <button className={`${btnPrimary} h-[26px] text-xs`} onClick={newFromCursor}>Nouvel item<Kbd dark>C</Kbd></button>
    </div>
  );

  const ctxItem = ctxId ? byId.get(ctxId) : undefined;
  const ctxAction = (label: string, k: string | null, run: () => void, danger = false) => (
    <ContextMenu.Item className={`${itemCls} ${danger ? "text-red-700" : ""}`} onClick={run}>
      <span className="flex-1">{label}</span>{k && <Kbd>{k}</Kbd>}
    </ContextMenu.Item>
  );
  const ctxTargets = () => (ctxId && selected.has(ctxId) ? [...selected] : ctxId ? [ctxId] : []);

  return (
    <div className="flex h-screen overflow-hidden bg-white text-stone-900">
      <Sidebar projectId={id} projectName={data.project.name} view={view} email={me}
        onView={(v) => setParams({ view: v, item: null })} onSearch={() => setPalette(true)} onShare={() => setShare(true)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-stone-100 px-5 text-[13px]">
          <span className="text-stone-500">{data.project.name}</span>
          <ChevronRight size={12} className="text-stone-300" />
          <span className="font-medium">{viewLabel}</span>
          <span className={`ml-1.5 flex items-center gap-1 text-xs ${store.failed ? "text-red-600" : "text-stone-400"}`} aria-live="polite">
            {store.saving ? "Enregistrement…" : store.failed ? "Non enregistré" : <><Check size={12} />Enregistré</>}
          </span>
          <span className="flex-1" />
          <button className={btn} onClick={() => setShare(true)}><Link2 size={14} />Partager</button>
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          {view === "timeline" && (
            <>
              {timelineToolbar}
              <ContextMenu.Root>
                <ContextMenu.Trigger className="flex min-h-0 flex-1 flex-col">
                  <Timeline items={items} people={data.people} plan={plan} rows={rows} ax={ax}
                    colorBy={colorBy} selected={selected} renaming={renaming} collapsed={collapsed} scrollRef={scrollRef}
                    header={<>
                      <div className="flex items-baseline gap-1.5"><span className="font-medium">Items</span><span className="text-xs text-stone-400">{features.length}</span></div>
                      <div className="flex text-[11px] text-stone-400"><span className="flex-1">Ordre de la liste = priorité</span><span className="w-11 text-right">JH</span><span className="w-14 text-right">Owners</span></div>
                    </>}
                    footer={features.length > 0 && (
                      <div className="flex h-8">
                        <button onClick={() => newItem(null)} className="sticky left-0 flex items-center gap-1.5 border-r border-stone-100 bg-white pl-[62px] text-[13px] text-stone-400 hover:text-stone-700" style={{ width: LEFT }}>
                          <Plus size={14} />Nouvel item
                        </button>
                      </div>
                    )}
                    onRowClick={rowClick} onContext={(iid) => { setCtxId(iid); if (!selected.has(iid)) { setCursor(iid); setSelected(new Set([iid])); } }}
                    onPick={(kind, iid, anchor) => setPicker({ kind, ids: selected.has(iid) && selected.size > 1 ? [...selected] : [iid], anchor })}
                    onRename={rename} onStartRename={setRenaming} onToggle={(iid) => toggle(iid)} onAddChild={(pid) => newItem(pid)} onDrop={drop} />
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                  <ContextMenu.Positioner className="z-50">
                    <ContextMenu.Popup className={`${popupCls} w-[252px]`}>
                      {ctxItem && <>
                        {ctxAction("Ouvrir", "Espace", () => openItem(ctxItem.id))}
                        <ContextMenu.Separator className="mx-1.5 my-1 h-px bg-stone-100" />
                        {ctxAction("Statut…", "S", () => pickFor("status", ctxTargets()))}
                        {ctxAction("Owners…", "A", () => pickFor("owners", ctxTargets()))}
                        {ctxAction("Estimation…", "E", () => pickFor("estimate", ctxTargets()))}
                        {ctxAction("Jalon cible…", "M", () => pickFor("milestone", ctxTargets()))}
                        <ContextMenu.Separator className="mx-1.5 my-1 h-px bg-stone-100" />
                        {ctxAction("Renommer", "R", () => setRenaming(ctxItem.id))}
                        {ctxAction("Ajouter un sous-item", null, () => newItem(ctxItem.id))}
                        {ctxAction("Imbriquer", "Tab", () => indent(ctxItem.id))}
                        {ctxAction("Désimbriquer", "⇧Tab", () => outdent(ctxItem.id))}
                        {ctxAction("Monter en priorité", "⌥↑", () => moveBy(ctxItem.id, -1))}
                        {ctxAction("Descendre en priorité", "⌥↓", () => moveBy(ctxItem.id, 1))}
                        <ContextMenu.Separator className="mx-1.5 my-1 h-px bg-stone-100" />
                        {ctxAction("Copier le lien", null, () => navigator.clipboard.writeText(`${location.origin}/p/${id}?item=${ctxItem.id}`))}
                        {ctxAction("Supprimer", "⌫", () => remove(ctxTargets()), true)}
                      </>}
                    </ContextMenu.Popup>
                  </ContextMenu.Positioner>
                </ContextMenu.Portal>
              </ContextMenu.Root>
              {!features.length && <EmptyState data={data} onPerson={() => { setParams({ view: "equipe" }); setOpenPerson(store.addPerson("Nouvelle personne").id); }}
                onItem={() => newItem(null)} onMilestone={() => { setParams({ view: "jalons" }); store.addItem({ type: "milestone", title: "Nouveau jalon", milestone_date: data.project.start_date }); }}
                onExample={store.seedExample} />}
            </>
          )}
          {view === "equipe" && (
            <TeamView data={data} plan={plan} store={store} ax={ax} scrollRef={scrollRef} openPerson={openPerson} onOpenPerson={setOpenPerson}
              onOpenItem={(iid) => { setOpenPerson(null); openItem(iid); }}
              toolbar={
                <div className="flex h-11 shrink-0 items-center gap-4 border-b border-stone-100 px-5 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px] bg-indigo-100" />Occupé</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px] bg-indigo-50" />Partiellement libre</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px] border border-stone-200" />Libre</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-[3px]" style={{ background: "repeating-linear-gradient(135deg,#d6d3d1 0 2px,#f4f3f1 2px 5px)" }} />Absence</span>
                  <span className="flex-1" />
                  {zoomCtl}
                  <button className={`${btn} h-[26px] text-xs`} onClick={() => setAbsenceDlg(true)}>Ajouter une absence</button>
                  <button className={`${btnPrimary} h-[26px] text-xs`} onClick={() => setOpenPerson(store.addPerson("Nouvelle personne").id)}>Ajouter une personne</button>
                </div>
              } />
          )}
          {view === "jalons" && <MilestonesView data={data} plan={plan} store={store} />}
          {view === "absences" && <AbsencesView data={data} store={store} onAdd={() => setAbsenceDlg(true)} />}
          {view === "settings" && <SettingsView data={data} store={store} me={me} />}

          {openItemObj && openItemObj.type === "feature" && (view === "timeline" || view === "equipe") && (
            <ItemPanel item={openItemObj} data={data} plan={plan} store={store} onClose={closePanel} onOpen={openItem}
              onPick={(kind, anchor) => setPicker({ kind, ids: [openItemObj.id], anchor })} onMoveUp={() => moveBy(openItemObj.id, -1)} />
          )}

          {selected.size > 1 && view === "timeline" && (
            <div role="toolbar" aria-label="Actions groupées" className="absolute bottom-5 left-1/2 z-40 flex h-10 -translate-x-1/2 items-center gap-0.5 rounded-[9px] bg-stone-900 pl-3.5 pr-1.5 text-[13px] text-stone-100 shadow-lg">
              <span className="mr-2 font-medium">{selected.size} sélectionnés</span>
              <span className="h-[18px] w-px bg-stone-700" />
              {([["status", "Statut", "S"], ["owners", "Assigner", "A"], ["estimate", "Estimation", "E"], ["milestone", "Jalon", "M"]] as const).map(([k, l, key]) => (
                <button key={k} onClick={(e) => setPicker({ kind: k, ids: [...selected], anchor: e.currentTarget })} className="flex h-7 items-center gap-1.5 rounded-md px-2.5 hover:bg-stone-800">{l}<Kbd dark>{key}</Kbd></button>
              ))}
              <button onClick={() => remove([...selected])} className="h-7 rounded-md px-2.5 text-red-300 hover:bg-stone-800">Supprimer</button>
              <button aria-label="Désélectionner" onClick={() => setSelected(new Set())} className="flex size-7 items-center justify-center rounded-md hover:bg-stone-800"><X size={14} /></button>
            </div>
          )}
        </div>
      </main>

      <Picker state={picker} data={data} plan={plan} store={store} onClose={() => setPicker(null)}
        onManageTeam={() => { setPicker(null); setParams({ view: "equipe", item: null }); setOpenPerson(store.addPerson("Nouvelle personne").id); }} />
      <CommandPalette open={palette} onOpenChange={setPalette} commands={commands}
        context={targets().length > 1 ? `${targets().length} items` : cursorItem?.title || undefined} />
      <ShareDialog data={data} open={share} onOpenChange={setShare} />
      <AbsenceDialog data={data} store={store} open={absenceDlg} onOpenChange={setAbsenceDlg} />
    </div>
  );
}

function EmptyState({ data, onPerson, onItem, onMilestone, onExample }: {
  data: NonNullable<ReturnType<typeof useProject>["data"]>; onPerson: () => void; onItem: () => void; onMilestone: () => void; onExample: () => void;
}) {
  const steps = [
    { done: data.people.length > 0, label: "Ajouter l'équipe", hint: data.people.length ? `${data.people.length} personne${data.people.length > 1 ? "s" : ""}` : "", action: "Ajouter une personne", run: onPerson },
    { done: false, label: "Créer un premier item", action: "Nouvel item", k: "C", run: onItem },
    { done: data.items.some((i) => i.type === "milestone"), label: "Poser un jalon client", action: "Ajouter un jalon", run: onMilestone },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[140px] z-20 flex justify-center px-4">
      <div className="pointer-events-auto flex w-[440px] max-w-full flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-[0_16px_40px_-12px_rgba(28,25,23,.18)]">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Lancez votre plan</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-500">Trois étapes, et les barres se calculent toutes seules à partir de la charge et de la disponibilité de chacun.</p>
        </div>
        <ol className="flex flex-col gap-1">
          {steps.map((s, i) => (
            <li key={s.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] ${s.done ? "bg-stone-50" : i === next ? "border border-indigo-100 bg-indigo-50/40" : ""}`}>
              {s.done ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-green-600"><Check size={11} strokeWidth={3} className="text-white" /></span>
              ) : (
                <span className={`flex size-5 items-center justify-center rounded-full border-[1.5px] text-[11px] font-semibold ${i === next ? "border-indigo-600 text-indigo-600" : "border-stone-300 text-stone-400"}`}>{i + 1}</span>
              )}
              <span className={`flex-1 ${s.done ? "text-stone-500 line-through decoration-stone-300" : i === next ? "font-medium" : "text-stone-600"}`}>{s.label}</span>
              {s.done ? <span className="text-xs text-stone-400">{s.hint}</span> : (
                <button onClick={s.run} className={i === next ? `${btnPrimary} h-[26px] text-xs` : `${btn} h-[26px] text-xs font-normal`}>{s.action}{s.k && <Kbd dark={i === next}>{s.k}</Kbd>}</button>
              )}
            </li>
          ))}
        </ol>
        <button onClick={onExample} className="self-start text-xs text-stone-600 underline decoration-stone-300 underline-offset-[3px] hover:text-stone-900">Ou partir d&apos;un projet exemple</button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-[232px] border-r border-stone-200 bg-[#f4f3f1]" />
      <div className="flex flex-1 flex-col gap-3 p-6 pt-[120px]">
        {[180, 120, 220, 150, 90].map((w, i) => (
          <div key={i} className="flex items-center gap-6">
            <div className="h-2.5 animate-pulse rounded bg-stone-100" style={{ width: w }} />
            <div className="h-4 animate-pulse rounded bg-stone-100" style={{ width: w * 0.8, marginLeft: 200 - w + i * 40 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
