"use client";

import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { Tooltip } from "./Tooltip";

type Props = ComponentProps<"button"> & { label: string; kbd?: string; size?: "sm" | "md"; tooltip?: boolean };

/** Bouton icône carré, libellé accessible + info-bulle. */
export function IconButton({ label, kbd, size = "md", tooltip = true, className, type = "button", ...props }: Props) {
  const btn = (
    <button type={type} aria-label={label} className={cx(
      "flex shrink-0 items-center justify-center rounded-md text-stone-500 transition-colors duration-150",
      "hover:bg-stone-100 hover:text-stone-900 data-[popup-open]:bg-stone-100 disabled:pointer-events-none disabled:opacity-40",
      size === "sm" ? "size-[22px]" : "size-[26px]",
      className,
    )} {...props} />
  );
  return tooltip ? <Tooltip label={label} kbd={kbd}>{btn}</Tooltip> : btn;
}
