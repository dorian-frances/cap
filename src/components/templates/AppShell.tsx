import type { ReactNode } from "react";

/** Squelette de l'app : barre latérale + en-tête (fil d'Ariane, statut, actions) + contenu. */
export function AppShell({ sidebar, title, status, actions, children }: {
  sidebar: ReactNode; title: ReactNode; status?: ReactNode; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div data-app-shell className="flex h-screen overflow-hidden bg-surface text-stone-900">
      {sidebar}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-stone-100 px-5 text-[13px]">
          {title}
          {status}
          <span className="flex-1" />
          {actions}
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col text-[13px]">{children}</div>
      </main>
    </div>
  );
}

/** Même squelette pendant le chargement, avec des lignes qui pulsent. */
export function AppSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-[232px] border-r border-stone-200 bg-sidebar" />
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
