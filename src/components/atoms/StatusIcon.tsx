import type { Status } from "@/lib/plan";

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  if (status === "done")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="Fait" role="img" className="shrink-0">
        <circle cx="7" cy="7" r="6" fill="var(--color-green-600)" />
        <path d="m4.3 7.2 1.8 1.8 3.6-3.9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "dev_done")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="Dev terminé" role="img" className="shrink-0">
        <circle cx="7" cy="7" r="5.25" stroke="var(--st-devdone-text)" strokeWidth="1.5" />
        <path d="m4.6 7.1 1.6 1.6 3.2-3.4" stroke="var(--st-devdone-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "paused")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="En pause" role="img" className="shrink-0">
        <circle cx="7" cy="7" r="5.25" stroke="var(--color-stone-500)" strokeWidth="1.5" />
        <path d="M5.6 4.9v4.2M8.4 4.9v4.2" stroke="var(--color-stone-500)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (status === "doing")
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="En cours" role="img" className="shrink-0">
        <circle cx="7" cy="7" r="5.25" stroke="var(--color-amber-600)" strokeWidth="1.5" />
        <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="var(--color-amber-600)" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-label="À faire" role="img" className="shrink-0">
      <circle cx="7" cy="7" r="5.25" stroke="var(--color-stone-400)" strokeWidth="1.5" />
    </svg>
  );
}
