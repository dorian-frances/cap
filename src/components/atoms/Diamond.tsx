/** Symbole d'un jalon. */
export function Diamond({ late, size = 10 }: { late?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <path d="M5 .8 9.2 5 5 9.2.8 5z" fill={late ? "#dc2626" : "#44403c"} />
    </svg>
  );
}
