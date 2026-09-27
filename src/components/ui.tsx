"use client";

// Petites briques visuelles partagées.
import { Toast } from "@base-ui/react/toast";
import type { Person, Status } from "@/lib/plan";

export const toasts = Toast.createToastManager();

export function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-5 left-1/2 z-50 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col items-center gap-2">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  );
}
function ToastList() {
  const { toasts: list } = Toast.useToastManager();
  return list.map((t) => (
    <Toast.Root key={t.id} toast={t}
      className="flex w-full items-center gap-3 rounded-[9px] bg-stone-900 py-2 pl-3.5 pr-2 text-[13px] text-stone-50 shadow-lg">
      <Toast.Content className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <Toast.Title className="truncate" />
          <Toast.Description className="truncate text-xs text-stone-400" />
        </div>
        <Toast.Action className="rounded-md px-2 py-1 font-medium text-indigo-200 hover:bg-stone-800" />
        <Toast.Close aria-label="Fermer" className="rounded-md px-1.5 py-1 text-stone-400 hover:bg-stone-800">✕</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

export const STATUS: Record<Status, { label: string; bar: string; border: string; text: string; key: string }> = {
  todo: { label: "À faire", bar: "#f0eeeb", border: "#e0dcd7", text: "#57534e", key: "1" },
  doing: { label: "En cours", bar: "#fcebd0", border: "#f4d4a2", text: "#8a4a0b", key: "2" },
  done: { label: "Fait", bar: "#ddf2e3", border: "#bfe3ca", text: "#1f6b3a", key: "3" },
};

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  if (status === "done")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="Fait" role="img">
        <circle cx="7" cy="7" r="6" fill="#16a34a" />
        <path d="m4.3 7.2 1.8 1.8 3.6-3.9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "doing")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="En cours" role="img">
        <circle cx="7" cy="7" r="5.25" stroke="#d97706" strokeWidth="1.5" />
        <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="#d97706" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="À faire" role="img">
      <circle cx="7" cy="7" r="5.25" stroke="#a8a29e" strokeWidth="1.5" />
    </svg>
  );
}

export function Diamond({ late, size = 10 }: { late?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 .8 9.2 5 5 9.2.8 5z" fill={late ? "#dc2626" : "#44403c"} />
    </svg>
  );
}

const PALETTE = [
  ["#d7ede6", "#0f5e4c"], ["#f3e1d1", "#8a4b17"], ["#e4ddf5", "#4c3a8a"], ["#f6dfe6", "#8a2f4f"],
  ["#dde8f6", "#1f4f86"], ["#eef0d5", "#5b6313"], ["#f5e3cf", "#7a4a12"], ["#dff1f4", "#155e6b"],
];
export const initials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
export function personColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ person, size = 20, ring = "#fff" }: { person: Pick<Person, "id" | "name">; size?: number; ring?: string }) {
  const [bg, fg] = personColor(person.id);
  return (
    <span title={person.name} className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.45, boxShadow: `0 0 0 2px ${ring}` }}>
      {initials(person.name)}
    </span>
  );
}

export function Kbd({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <kbd className={`rounded border px-1 font-mono text-[11px] leading-4 ${dark ? "border-stone-700 bg-stone-800 text-stone-400" : "border-stone-200 bg-stone-50 text-stone-400"}`}>
      {children}
    </kbd>
  );
}

// Classes partagées des popups (menus, popovers).
export const popupCls = "min-w-[220px] rounded-[10px] border border-stone-200 bg-white p-1.5 text-[13px] text-stone-900 shadow-[0_12px_32px_-8px_rgba(28,25,23,.18),0_2px_6px_rgba(28,25,23,.06)] outline-none";
export const itemCls = "flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 outline-none data-[highlighted]:bg-stone-100";

export const fmtDay = (iso: string, withYear = false) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", timeZone: "UTC", ...(withYear ? { year: "numeric" } : {}),
  });
