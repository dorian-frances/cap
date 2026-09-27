import { ChevronRight } from "lucide-react";

/** Chevron de dépliage qui pivote en douceur. */
export function Chevron({ open, size = 13 }: { open: boolean; size?: number }) {
  return <ChevronRight size={size} className={`transition-transform duration-200 ease-out-quint ${open ? "rotate-90" : ""}`} />;
}
