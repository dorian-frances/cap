import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

/** Pastille de propriété cliquable (statut, estimation, owners…). */
export function Chip({ tone = "default", className, type = "button", ...props }: ComponentProps<"button"> & { tone?: "default" | "danger" }) {
  return (
    <button type={type} className={cx(
      "flex h-[26px] items-center gap-1.5 rounded-md border px-2 text-xs transition-[background-color,border-color] duration-150",
      tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-stone-200 bg-surface hover:border-stone-300 hover:bg-stone-50",
      "disabled:pointer-events-none data-[popup-open]:border-stone-300 data-[popup-open]:bg-stone-50",
      className,
    )} {...props} />
  );
}
