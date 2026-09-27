export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md bg-stone-900" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 9.5 6 2.5l4 7" stroke="#fafaf9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
