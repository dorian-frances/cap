"use client";

import type { ReactElement, ReactNode } from "react";
import { Tooltip as Base } from "@base-ui/react/tooltip";
import { Kbd } from "../atoms/Kbd";

/** Info-bulle sombre avec raccourci optionnel. L'enfant doit accepter ref et props (bouton). */
export function Tooltip({ label, kbd, side = "bottom", children }: { label: ReactNode; kbd?: string; side?: "top" | "bottom" | "left" | "right"; children: ReactElement }) {
  return (
    <Base.Root>
      <Base.Trigger render={children} delay={450} />
      <Base.Portal>
        <Base.Positioner side={side} sideOffset={6} className="z-[60]">
          <Base.Popup className="flex origin-(--transform-origin) items-center gap-1.5 rounded-md bg-stone-900 px-2 py-1 text-xs text-stone-50 shadow-popup transition-[opacity,scale] duration-150 ease-out-quint data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[instant]:transition-none data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            {label}{kbd && <Kbd tone="dark">{kbd}</Kbd>}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}

export const TooltipProvider = Base.Provider;
