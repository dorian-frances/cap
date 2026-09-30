"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Check, ChevronRight, Link2, Plus } from "lucide-react";
import { orderItems, overdue, overloaded, schedule, type Item, type Row } from "@/lib/plan";
import { axis, type Zoom } from "@/lib/axis";
import { useProject } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { usePresence } from "@/lib/usePresence";
import { Button, StatusIcon } from "@/components/atoms";
import { ContextMenuContent, MenuItem, MenuSeparator, ToastProvider, Toaster, TooltipProvider, toasts } from "@/components/molecules";
import { AppShell, AppSkeleton } from "@/components/templates";
import Timeline, { type PickKind } from "@/components/organisms/Timeline";
import ItemPanel from "@/components/organisms/ItemPanel";
import CommandPalette, { type Command } from "@/components/organisms/CommandPalette";
import { ItemPicker, type PickerState } from "@/components/organisms/ItemPicker";
import Sidebar, { VIEWS, type View } from "@/components/organisms/Sidebar";
import TeamView from "@/components/organisms/TeamView";
import MilestonesView from "@/components/organisms/MilestonesView";
import AbsencesView from "@/components/organisms/AbsencesView";
import SettingsView from "@/components/organisms/SettingsView";
import GuideView from "@/components/organisms/GuideView";
import { setTheme } from "@/lib/theme";
import { useStored } from "@/lib/useStored";
import ShareDialog from "@/components/organisms/ShareDialog";
import AbsenceDialog from "@/components/organisms/AbsenceDialog";
import EmptyState from "@/components/organisms/EmptyState";
import BulkActionBar from "@/components/organisms/BulkActionBar";
import { TeamToolbar, TimelineToolbar, ZoomControl } from "@/components/organisms/Toolbars";

export default function Page() {
  return (
    <ToastProvider toastManager={toasts}>
      <TooltipProvider>
        <Suspense><ProjectPage /></Suspense>
      </TooltipProvider>
      <Toaster />
    </ToastProvider>
  );
}

const CELL: Record<PickKind, string> = { status: "status", start: "status", done: "status", owners: "owners", estimate: "estimate", extra: "estimate", milestone: "title", tags: "title" };
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
  const [colorBy, setColorBy] = useStored<"status" | "owner">("cap:colorBy", "status");
  const [showDone, setShowDone] = useStored("cap:showDone", true);
  // « start » : vue escalier, items à plat triés par date de début ; la priorité n'y est pas modifiable.
  const [sortBy, setSortBy] = useStored<"priority" | "start">("cap:sortBy", "priority");
  const byStart = sortBy === "start";
  const [ownerFilter, setOwnerFilter] = useState<Set<string>>(new Set());
  const [lateOnly, setLateOnly] = useState(false);
  const [groupOpen, setGroupOpen] = useState(true);
  // Items créés pendant la session : restent à leur place tant qu'ils sont sélectionnés, même non planifiables.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
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
  // Lignes visibles : planifiées (arbre, parents repliables) et groupe « À planifier » (sans owner ou sans estimation).
  const [rows, unplanned] = useMemo(() => {
    const filtered = !showDone || ownerFilter.size > 0 || lateOnly;
    const keepLeaf = (r: Row) => (showDone || r.item.status !== "done")
      && (!ownerFilter.size || r.item.owner_ids.some((o) => ownerFilter.has(o)))
      && (!lateOnly || overdue(r.item, plan.spans.get(r.item.id)));
    const pinned = (id: string) => fresh.has(id) && (id === cursor || id === renaming);
    const toPlan = (r: Row) => !r.hasChildren && plan.spans.get(r.item.id) === null && !pinned(r.item.id);
    const kept = new Set<string>();
    for (const r of allRows) if (!r.hasChildren && !toPlan(r) && keepLeaf(r)) {
      for (let it: Item | undefined = r.item; it; it = it.parent_id ? byId.get(it.parent_id) : undefined) kept.add(it.id);
    }
    const leaves = allRows.filter((r) => toPlan(r) && keepLeaf(r)).map((r) => ({ ...r, depth: 0 }));
    if (byStart) {
      const start = (r: Row) => plan.spans.get(r.item.id)?.start ?? "\uffff";
      return [allRows.filter((r) => !r.hasChildren && kept.has(r.item.id)).map((r) => ({ ...r, depth: 0 })).sort((a, b) => start(a).localeCompare(start(b))), leaves];
    }
    const hidden = (it: Item): boolean => !!it.parent_id && (collapsed.has(it.parent_id) || hidden(byId.get(it.parent_id)!));
    return [
      allRows.filter((r) => (r.hasChildren ? kept.has(r.item.id) || !filtered : kept.has(r.item.id)) && !hidden(r.item)),
      leaves,
    ];
  }, [allRows, byId, collapsed, showDone, ownerFilter, lateOnly, plan, fresh, cursor, renaming, byStart]);
  const order = useMemo(() => [...rows, ...(groupOpen ? unplanned : [])].map((r) => r.item.id), [rows, unplanned, groupOpen]);

  const ax = useMemo(() => axis(zoom, data?.project.start_date ?? "2026-01-01", [
    ...[...plan.spans.values()].flatMap((s) => (s ? [s.start, s.end] : [])),
  ]), [zoom, data?.project.start_date, plan]);

  const scrollToToday = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({ left: (ax.today - ax.from) * ax.px - 160, behavior: smooth ? "smooth" : "instant" });
  }, [ax]);
  useEffect(() => { scrollToToday(false); }, [zoom, view, !!data]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setFresh((f) => new Set(f).add(it.id));
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
    if (byStart) return;
    const it = byId.get(iid); if (!it) return;
    const sib = siblings(it.parent_id);
    const i = sib.findIndex((s) => s.id === iid);
    const other = sib[i + dir]; if (!other) return;
    store.updateItems([iid], { position: other.position });
    store.updateItems([other.id], { position: it.position });
  };
  const indent = (iid: string) => {
    if (byStart) return;
    const it = byId.get(iid); if (!it) return;
    const sib = siblings(it.parent_id);
    const prev = sib[sib.findIndex((s) => s.id === iid) - 1]; if (!prev) return;
    const kids = siblings(prev.id);
    moveTo(iid, prev.id, between(kids.at(-1), undefined));
    setCollapsed((c) => { const n = new Set(c); n.delete(prev.id); return n; });
  };
  const outdent = (iid: string) => {
    if (byStart) return;
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

  // Clic en dehors du panneau latéral : il se ferme. Sauf sur une autre ligne (qui l'ouvre à sa place),
  // dans le panneau, ou dans un menu / une date ouvert(e) depuis lui (rendus hors de l'app, ou sélecteur ouvert).
  const overlay = !!picker || palette || share || absenceDlg;
  const panelOpen = !!openId || !!openPerson;
  useEffect(() => {
    if (!panelOpen || overlay) return;
    const h = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (!t?.closest("[data-app-shell]") || t.closest("[data-side-panel],[data-row],[data-person-row]")) return;
      setParams({ item: null });
      setOpenPerson(null);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [panelOpen, overlay, setParams]);

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

  const openFeature = openId ? byId.get(openId) : undefined;
  const [panelItem, panelClosing] = usePresence(openFeature?.type === "feature" ? openFeature : null);

  if (data === undefined || me === null) return <AppSkeleton />;
  if (data === null) return (
    <main className="flex h-screen items-center justify-center p-8 text-[13px] text-stone-600">
      Projet introuvable ou accès refusé.&nbsp;<Link href="/" className="underline">Retour</Link>
    </main>
  );

  const cursorItem = cursor ? byId.get(cursor) : undefined;
  const features = items.filter((i) => i.type === "feature");
  const viewLabel = view === "settings" ? "Paramètres" : view === "guide" ? "Guide" : VIEWS.find((v) => v.key === view)?.label;

  const commands: Command[] = [
    ...(targets().length ? [
      { id: "s", group: "Sur l'item", label: "Changer le statut…", keys: ["S"], keywords: "etat avancement", run: () => pickFor("status") },
      { id: "start", group: "Sur l'item", label: "Démarrer…", keys: ["S", "2"], keywords: "en cours commencer date debut", run: () => pickFor("start") },
      { id: "done", group: "Sur l'item", label: "Terminer…", keys: ["S", "3"], keywords: "fait fini date fin livrer", run: () => pickFor("done") },
      { id: "a", group: "Sur l'item", label: "Assigner à…", keys: ["A"], keywords: "owner responsable personne", run: () => pickFor("owners") },
      { id: "e", group: "Sur l'item", label: "Définir l'estimation…", keys: ["E"], keywords: "charge jours jh", run: () => pickFor("estimate") },
      { id: "extra", group: "Sur l'item", label: "Ajouter un avenant…", keywords: "retard anticiper glissement jh supplementaire", run: () => pickFor("extra") },
      { id: "tags", group: "Sur l'item", label: "Tags…", keywords: "risque dependance bloque indicateur etiquette", run: () => pickFor("tags") },
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
    { id: "go-guide", group: "Aller à", label: "Guide", keywords: "aide tutoriel comment fonctionne", run: () => setParams({ view: "guide", item: null }) },
    { id: "th-dark", group: "Vue", label: "Thème sombre", keywords: "dark mode nuit", run: () => setTheme("dark") },
    { id: "th-light", group: "Vue", label: "Thème clair", keywords: "light mode jour", run: () => setTheme("light") },
    { id: "th-system", group: "Vue", label: "Thème du système", keywords: "auto", run: () => setTheme("system") },
    { id: "z1", group: "Vue", label: "Zoom semaine", keys: ["1"], run: () => setParams({ zoom: "semaine" }) },
    { id: "z2", group: "Vue", label: "Zoom mois", keys: ["2"], run: () => setParams({ zoom: "mois" }) },
    { id: "z3", group: "Vue", label: "Zoom trimestre", keys: ["3"], run: () => setParams({ zoom: "trimestre" }) },
    { id: "today", group: "Vue", label: "Revenir à aujourd'hui", keys: ["T"], run: scrollToToday },
    ...features.map((f) => ({ id: `item-${f.id}`, group: "Items", label: f.title || "Sans titre", icon: <StatusIcon status={f.status} />, run: () => openItem(f.id) })),
  ];

  const zoomCtl = <ZoomControl zoom={zoom} onZoom={(z) => setParams({ zoom: z })} onToday={scrollToToday} />;
  const ctxItem = ctxId ? byId.get(ctxId) : undefined;
  const ctxTargets = () => (ctxId && selected.has(ctxId) ? [...selected] : ctxId ? [ctxId] : []);

  return (
    <AppShell
      sidebar={<Sidebar projectId={id} projectName={data.project.name} view={view} email={me}
        alerts={(() => { const n = overloaded(plan).size; return n ? { equipe: { count: n, label: `${n} personne${n > 1 ? "s" : ""} en surcharge` } } : {}; })()}
        onView={(v) => setParams({ view: v, item: null })} onSearch={() => setPalette(true)} onShare={() => setShare(true)} />}
      title={<>
        <span className="text-stone-500">{data.project.name}</span>
        <ChevronRight size={12} className="text-stone-300" />
        <span key={view} className="animate-fade-in font-medium">{viewLabel}</span>
      </>}
      status={
        <span className={`ml-1.5 flex items-center gap-1 text-xs transition-colors duration-300 ${store.failed ? "text-red-600" : "text-stone-400"}`} aria-live="polite">
          <span key={store.saving ? "s" : store.failed ? "f" : "ok"} className="flex animate-fade-in items-center gap-1">
            {store.saving ? "Enregistrement…" : store.failed ? "Non enregistré" : <><Check size={12} />Enregistré</>}
          </span>
        </span>
      }
      actions={<Button onClick={() => setShare(true)}><Link2 size={14} />Partager</Button>}>
      <div key={view} className="flex min-h-0 flex-1 animate-fade-in flex-col">
        {view === "timeline" && (
          <>
            <TimelineToolbar people={data.people} ownerFilter={ownerFilter} onOwnerFilter={setOwnerFilter} colorBy={colorBy} onColorBy={setColorBy} sortBy={sortBy} onSortBy={setSortBy}
              showDone={showDone} onShowDone={setShowDone} lateOnly={lateOnly} onLateOnly={setLateOnly} zoom={zoomCtl} onNew={newFromCursor} />
            <ContextMenu.Root>
              <ContextMenu.Trigger className="flex min-h-0 flex-1 flex-col">
                <Timeline items={items} people={data.people} plan={plan} rows={rows} ax={ax}
                  unplanned={unplanned} groupOpen={groupOpen} onToggleGroup={() => setGroupOpen((o) => !o)}
                  colorBy={colorBy} flat={byStart} selected={selected} renaming={renaming} collapsed={collapsed} scrollRef={scrollRef}
                  header={<>
                    <div className="flex items-baseline gap-1.5"><span className="font-medium">Items</span><span className="text-xs tabular-nums text-stone-400">{features.length}</span></div>
                    <div className="flex text-[11px] text-stone-400"><span className="min-w-0 flex-1 truncate" title={byStart ? "Triés par date de début : repasser en vue Priorité pour déplacer ou imbriquer les items" : undefined}>
                        {byStart ? "Par date de début · déplacement désactivé" : "Ordre de la liste = priorité"}
                      </span><span className="w-11 text-right">JH</span><span className="w-14 text-right">Owners</span></div>
                  </>}
                  footer={features.length > 0 && (
                    <div className="flex h-8">
                      <button onClick={() => newItem(null)} className="sticky left-0 flex items-center gap-1.5 border-r border-stone-100 bg-surface pl-[62px] text-[13px] text-stone-400 transition-colors hover:text-stone-700" style={{ width: "var(--left)" }}>
                        <Plus size={14} />Nouvel item
                      </button>
                    </div>
                  )}
                  onRowClick={rowClick} onContext={(iid) => { setCtxId(iid); if (!selected.has(iid)) { setCursor(iid); setSelected(new Set([iid])); } }}
                  onPick={(kind, iid, anchor) => setPicker({ kind, ids: selected.has(iid) && selected.size > 1 ? [...selected] : [iid], anchor })}
                  onRename={rename} onStartRename={setRenaming} onToggle={(iid) => toggle(iid)} onAddChild={(pid) => newItem(pid)} onDrop={drop} />
              </ContextMenu.Trigger>
              <ContextMenuContent className="w-[252px]">
                {ctxItem && <>
                  <MenuItem kbd="Espace" onClick={() => openItem(ctxItem.id)}>Ouvrir</MenuItem>
                  <MenuSeparator />
                  <MenuItem kbd="S" onClick={() => pickFor("status", ctxTargets())}>Statut…</MenuItem>
                  <MenuItem onClick={() => pickFor("start", ctxTargets())}>Démarrer le…</MenuItem>
                  <MenuItem onClick={() => pickFor("done", ctxTargets())}>Terminer le…</MenuItem>
                  <MenuItem kbd="A" onClick={() => pickFor("owners", ctxTargets())}>Owners…</MenuItem>
                  <MenuItem kbd="E" onClick={() => pickFor("estimate", ctxTargets())}>Estimation…</MenuItem>
                  <MenuItem onClick={() => pickFor("extra", ctxTargets())}>Avenant…</MenuItem>
                  <MenuItem kbd="M" onClick={() => pickFor("milestone", ctxTargets())}>Jalon cible…</MenuItem>
                  <MenuItem onClick={() => pickFor("tags", ctxTargets())}>Tags…</MenuItem>
                  <MenuSeparator />
                  <MenuItem kbd="R" onClick={() => setRenaming(ctxItem.id)}>Renommer</MenuItem>
                  <MenuItem onClick={() => newItem(ctxItem.id)}>Ajouter un sous-item</MenuItem>
                  {!byStart && <>
                    <MenuItem kbd="Tab" onClick={() => indent(ctxItem.id)}>Imbriquer</MenuItem>
                    <MenuItem kbd="⇧Tab" onClick={() => outdent(ctxItem.id)}>Désimbriquer</MenuItem>
                    <MenuItem kbd="⌥↑" onClick={() => moveBy(ctxItem.id, -1)}>Monter en priorité</MenuItem>
                    <MenuItem kbd="⌥↓" onClick={() => moveBy(ctxItem.id, 1)}>Descendre en priorité</MenuItem>
                  </>}
                  <MenuSeparator />
                  <MenuItem onClick={() => navigator.clipboard.writeText(`${location.origin}/p/${id}?item=${ctxItem.id}`)}>Copier le lien</MenuItem>
                  <MenuItem danger kbd="⌫" onClick={() => remove(ctxTargets())}>Supprimer</MenuItem>
                </>}
              </ContextMenuContent>
            </ContextMenu.Root>
            {!features.length && <EmptyState data={data} onPerson={() => { setParams({ view: "equipe" }); setOpenPerson(store.addPerson("Nouvelle personne").id); }}
              onItem={() => newItem(null)} onMilestone={() => { setParams({ view: "jalons" }); store.addItem({ type: "milestone", title: "Nouveau jalon", milestone_date: data.project.start_date }); }}
              onExample={store.seedExample} />}
          </>
        )}
        {view === "equipe" && (
          <TeamView data={data} plan={plan} store={store} ax={ax} scrollRef={scrollRef} openPerson={openPerson} onOpenPerson={setOpenPerson}
            onOpenItem={(iid) => { setOpenPerson(null); openItem(iid); }}
            toolbar={<TeamToolbar zoom={zoomCtl} onAbsence={() => setAbsenceDlg(true)} onPerson={() => setOpenPerson(store.addPerson("Nouvelle personne").id)} />} />
        )}
        {view === "jalons" && <MilestonesView data={data} plan={plan} store={store} />}
        {view === "absences" && <AbsencesView data={data} store={store} onAdd={() => setAbsenceDlg(true)} />}
        {view === "settings" && <SettingsView data={data} store={store} me={me} />}
        {view === "guide" && <GuideView onView={(v) => setParams({ view: v, item: null })} onShare={() => setShare(true)} onPalette={() => setPalette(true)} />}
      </div>

      {panelItem && (view === "timeline" || view === "equipe") && (
        <ItemPanel item={panelItem} closing={panelClosing} data={data} plan={plan} store={store} me={me} onClose={closePanel} onOpen={openItem}
          onPick={(kind, anchor) => setPicker({ kind, ids: [panelItem.id], anchor })} onMoveUp={byStart ? undefined : () => moveBy(panelItem.id, -1)} />
      )}

      {view === "timeline" && (
        <BulkActionBar count={selected.size} onPick={(kind, anchor) => setPicker({ kind, ids: [...selected], anchor })}
          onDelete={() => remove([...selected])} onClear={() => setSelected(new Set())} />
      )}

      <ItemPicker state={picker} data={data} plan={plan} store={store} me={me}
        onClose={(k) => setPicker((p) => (p?.kind === k ? null : p))} onStep={(k) => setPicker((p) => p && { ...p, kind: k })}
        onManageTeam={() => { setPicker(null); setParams({ view: "equipe", item: null }); setOpenPerson(store.addPerson("Nouvelle personne").id); }} />
      <CommandPalette open={palette} onOpenChange={setPalette} commands={commands}
        context={targets().length > 1 ? `${targets().length} items` : cursorItem?.title || undefined} />
      <ShareDialog data={data} open={share} onOpenChange={setShare} />
      <AbsenceDialog data={data} store={store} open={absenceDlg} onOpenChange={setAbsenceDlg} />
    </AppShell>
  );
}
