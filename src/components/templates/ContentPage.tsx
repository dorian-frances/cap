import type { ReactNode } from "react";

/** Page de contenu centrée (Jalons, Absences, Paramètres) : titre, description, action principale. */
export function ContentPage({ title, description, actions, width = "max-w-3xl", children }: {
  title: string; description?: ReactNode; actions?: ReactNode; width?: string; children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={`mx-auto flex animate-rise-in flex-col gap-7 px-6 py-8 ${width}`}>
        <header className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-0.5 text-[13px] text-stone-500">{description}</p>}
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}

export const Section = ({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-2.5">
    <div>
      <h2 className="text-xs font-medium text-stone-500">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-stone-500">{description}</p>}
    </div>
    {children}
  </section>
);
