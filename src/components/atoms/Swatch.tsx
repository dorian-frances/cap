import type { CSSProperties } from "react";

/** Échantillon de couleur pour les légendes. */
export function Swatch({ style, line }: { style: CSSProperties; line?: boolean }) {
  return <span className={line ? "h-3 w-0" : "h-2 w-3.5 rounded-[3px]"} style={style} />;
}
