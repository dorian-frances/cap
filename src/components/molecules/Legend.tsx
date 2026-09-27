import type { CSSProperties } from "react";
import { Swatch } from "../atoms/Swatch";

export function Legend({ items }: { items: { label: string; swatch: CSSProperties; line?: boolean }[] }) {
  return (
    <>
      {items.map((i) => <span key={i.label} className="flex items-center gap-1.5 whitespace-nowrap"><Swatch style={i.swatch} line={i.line} />{i.label}</span>)}
    </>
  );
}
