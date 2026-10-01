"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { BookOpen, CalendarDays, Diamond, GanttChart, LayoutDashboard, Link2, LogOut, Monitor, Moon, Plus, Search, Settings, Sun, Users } from "lucide-react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { cx } from "@/lib/cx";
import { Kbd, Logo } from "../atoms";
import { MenuContent, MenuItem, MenuLabel, MenuRadioItem, MenuSeparator } from "../molecules";
import { personColor } from "../tokens";

export type View = "dashboard" | "timeline" | "equipe" | "jalons" | "absences" | "settings" | "guide";
export const VIEWS: { key: View; label: string; icon: ReactNode; g: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} />, g: "D" },
  { key: "timeline", label: "Timeline", icon: <GanttChart size={16} />, g: "T" },
  { key: "equipe", label: "Équipe", icon: <Users size={16} />, g: "E" },
  { key: "jalons", label: "Jalons", icon: <Diamond size={16} />, g: "J" },
  { key: "absences", label: "Absences", icon: <CalendarDays size={16} />, g: "A" },
];

const navCls = (active: boolean) => cx(
  "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors duration-150",
  active ? "bg-stone-200/70 font-medium text-stone-900" : "text-stone-600 hover:bg-stone-200/40 hover:text-stone-900",
);
const NavIcon = ({ active, children }: { active: boolean; children: ReactNode }) => (
  <span className={cx("transition-colors duration-150", active ? "text-stone-900" : "text-stone-500")}>{children}</span>
);

export default function Sidebar({ projectId, projectName, view, onView, onSearch, onShare, email, alerts = {} }: {
  projectId: string; projectName: string; view: View; onView: (v: View) => void; onSearch: () => void; onShare: () => void; email: string;
  alerts?: Partial<Record<View, { count: number; label: string }>>;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    supabase.from("projects").select("id, name").order("created_at").then(({ data }) => setProjects(data ?? []));
  }, [projectName]);

  const create = async (name: string) => {
    setCreating(false);
    if (!name.trim()) return;
    const { data } = await supabase.rpc("create_project", { p_name: name.trim() });
    if (data) router.push(`/p/${data}`);
  };

  return (
    <nav aria-label="Navigation" className="flex h-full w-[232px] shrink-0 flex-col gap-4 border-r border-stone-200 bg-sidebar px-2.5 py-3">
      <div className="flex items-center gap-2 px-1.5 py-1"><Logo /><span className="font-semibold">Cap</span></div>
      <button onClick={onSearch} className="flex h-[30px] items-center gap-2 rounded-[7px] border border-stone-200 bg-surface px-2 text-[13px] text-stone-500 shadow-control transition-colors duration-150 hover:border-stone-300 hover:text-stone-700">
        <Search size={14} /><span className="flex-1 text-left">Rechercher</span><Kbd>⌘K</Kbd>
      </button>
      <div className="flex flex-col gap-px">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => onView(v.key)} className={navCls(view === v.key)} aria-current={view === v.key ? "page" : undefined}>
            <NavIcon active={view === v.key}>{v.icon}</NavIcon><span className="flex-1">{v.label}</span>
            {alerts[v.key] && <span title={alerts[v.key]!.label} className="min-w-[18px] animate-fade-in rounded-full bg-red-100 px-1.5 text-center text-[11px] font-medium leading-[18px] text-red-700">{alerts[v.key]!.count}</span>}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-col gap-px overflow-y-auto">
        <div className="px-2 py-1 text-xs text-stone-400">Projets</div>
        {projects.map((p) => (
          <Link key={p.id} href={`/p/${p.id}`} className={navCls(p.id === projectId)}>
            <span className="mx-1 size-2 shrink-0 rounded-[2px]" style={{ background: personColor(p.id)[1] }} />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
        {creating ? (
          <input autoFocus placeholder="Nom du projet" aria-label="Nom du nouveau projet"
            onKeyDown={(e) => { if (e.key === "Enter") create(e.currentTarget.value); if (e.key === "Escape") setCreating(false); }}
            onBlur={(e) => create(e.currentTarget.value)}
            className="h-7 animate-fade-in rounded-md border border-accent-300 bg-surface px-2 text-[13px] outline-none ring-2 ring-accent-100" />
        ) : (
          <button onClick={() => setCreating(true)} className={cx(navCls(false), "text-stone-400")}><Plus size={16} />Nouveau projet</button>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-px">
        <button onClick={() => onView("guide")} className={navCls(view === "guide")}><NavIcon active={view === "guide"}><BookOpen size={16} /></NavIcon>Guide</button>
        <button onClick={onShare} className={navCls(false)}><NavIcon active={false}><Link2 size={16} /></NavIcon>Partager</button>
        <button onClick={() => onView("settings")} className={navCls(view === "settings")}><NavIcon active={view === "settings"}><Settings size={16} /></NavIcon>Paramètres</button>
        <Menu.Root>
          <Menu.Trigger className="mt-1.5 flex h-9 items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-stone-600 transition-colors duration-150 hover:bg-stone-200/40 data-[popup-open]:bg-stone-200/40">
            <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-800">{email.slice(0, 2).toUpperCase()}</span>
            <span className="truncate">{email}</span>
          </Menu.Trigger>
          <MenuContent side="top">
            <MenuLabel>Thème</MenuLabel>
            <Menu.RadioGroup value={theme} onValueChange={(v: Theme) => { setTheme(v); setThemeState(v); }}>
              <MenuRadioItem value="light"><Sun size={14} className="text-stone-500" />Clair</MenuRadioItem>
              <MenuRadioItem value="dark"><Moon size={14} className="text-stone-500" />Sombre</MenuRadioItem>
              <MenuRadioItem value="system"><Monitor size={14} className="text-stone-500" />Comme le système</MenuRadioItem>
            </Menu.RadioGroup>
            <MenuSeparator />
            <MenuItem icon={<LogOut size={14} />} onClick={() => supabase.auth.signOut().then(() => router.push("/"))}>Se déconnecter</MenuItem>
          </MenuContent>
        </Menu.Root>
      </div>
    </nav>
  );
}
