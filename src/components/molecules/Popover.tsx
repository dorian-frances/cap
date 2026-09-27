"use client";

import type { ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { cx } from "@/lib/cx";
import { popupCls } from "./Menu";

export function PopoverContent({ anchor, side, align = "start", sideOffset = 6, initialFocus, className, children }: {
  anchor?: Element | null; side?: "top" | "bottom"; align?: "start" | "center" | "end"; sideOffset?: number;
  initialFocus?: Popover.Popup.Props["initialFocus"]; className?: string; children: ReactNode;
}) {
  return (
    <Popover.Portal>
      <Popover.Positioner anchor={anchor} side={side} align={align} sideOffset={sideOffset} className="z-50">
        <Popover.Popup initialFocus={initialFocus} className={cx(popupCls, className)}>{children}</Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}
