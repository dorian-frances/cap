"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { CalendarDays, Diamond, GanttChart, Link2, LogOut, Plus, Search, Settings, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Kbd, itemCls, popupCls, personColor } from "./ui";

export type View = "timeline" | "equipe" | "jalons" | "absences" | "settings";
export const VIEWS: { key: View; label: string; icon: React.ReactNode; g: string }[] = [
  { key: "timeline", label: "Timeline", icon: <GanttChart size={16} />, g: "T" },
  { key: "equipe", label: "Équipe", icon: <Users size={16} />, g: "E" },
  { key: "jalons", label: "Jalons", icon: <Diamond size={16} />, g: "J" },
  { key: "absences", label: "Absences", icon: <CalendarDays size={16} />, g: "A" },
];

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md bg-stone-900" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 9.5 6 2.5l4 7" stroke="#fafaf9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function Sidebar({ projectId, projectName, view, onView, onSearch, onShare, email }: {
  projectId: string; projectName: string; view: View; onView: (v: View) => void; onSearch: () => void; onShare: () => void; email: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.from("projects").select("id, name").order("created_at").then(({ data }) => setProjects(data ?? []));
  }, [projectName]);

  const create = async (name: string) => {
    setCreating(false);
    if (!name.trim()) return;
    const { data } = await supabase.rpc("create_project", { p_name: name.trim() });
    if (data) router.push(`/p/${data}`);
  };

  const nav = (active: boolean) => `flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] ${active ? "bg-stone-200/70 font-medium text-stone-900" : "text-stone-600 hover:bg-stone-200/40"}`;

  return (
    <nav aria-label="Navigation" className="flex h-full w-[232px] shrink-0 flex-col gap-4 border-r border-stone-200 bg-[#f4f3f1] px-2.5 py-3">
      <div className="flex items-center gap-2 px-1.5 py-1"><Logo /><span className="font-semibold">Cap</span></div>
      <button onClick={onSearch} className="flex h-[30px] items-center gap-2 rounded-[7px] border border-stone-200 bg-white px-2 text-[13px] text-stone-500 hover:border-stone-300">
        <Search size={14} /><span className="flex-1 text-left">Rechercher</span><Kbd>⌘K</Kbd>
      </button>
      <div className="flex flex-col gap-px">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => onView(v.key)} className={nav(view === v.key)} aria-current={view === v.key ? "page" : undefined}>
            <span className={view === v.key ? "text-stone-900" : "text-stone-500"}>{v.icon}</span>{v.label}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-col gap-px overflow-y-auto">
        <div className="px-2 py-1 text-xs text-stone-400">Projets</div>
        {projects.map((p) => (
          <Link key={p.id} href={`/p/${p.id}`} className={nav(p.id === projectId)}>
            <span className="mx-1 size-2 shrink-0 rounded-[2px]" style={{ background: personColor(p.id)[1] }} />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
        {creating ? (
          <input autoFocus placeholder="Nom du projet" aria-label="Nom du nouveau projet"
            onKeyDown={(e) => { if (e.key === "Enter") create(e.currentTarget.value); if (e.key === "Escape") setCreating(false); }}
            onBlur={(e) => create(e.currentTarget.value)}
            className="h-7 rounded-md border border-indigo-300 bg-white px-2 text-[13px] outline-none ring-2 ring-indigo-100" />
        ) : (
          <button onClick={() => setCreating(true)} className={`${nav(false)} text-stone-400`}><Plus size={16} />Nouveau projet</button>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-px">
        <button onClick={onShare} className={nav(false)}><Link2 size={16} className="text-stone-500" />Partager</button>
        <button onClick={() => onView("settings")} className={nav(view === "settings")}><Settings size={16} className="text-stone-500" />Paramètres</button>
        <Menu.Root>
          <Menu.Trigger className="mt-1.5 flex h-9 items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-stone-600 hover:bg-stone-200/40">
            <span className="flex size-[22px] items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-800">{email.slice(0, 2).toUpperCase()}</span>
            <span className="truncate">{email}</span>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="top" align="start" sideOffset={6} className="z-50">
              <Menu.Popup className={popupCls}>
                <Menu.Item className={itemCls} onClick={() => supabase.auth.signOut().then(() => router.push("/"))}><LogOut size={14} />Se déconnecter</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </nav>
  );
}
