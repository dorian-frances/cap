"use client";

import { Select as Base } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cx } from "@/lib/cx";
import { fieldCls } from "../atoms/Input";
import { itemCls, popupCls } from "./Menu";

export function Select<T extends string>({ value, onValueChange, options, label, className }: {
  value: T; onValueChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string;
}) {
  return (
    <Base.Root items={options} value={value} onValueChange={(v) => v != null && onValueChange(v as T)}>
      <Base.Trigger aria-label={label} className={cx(fieldCls, "flex items-center justify-between gap-2 pr-2 text-left data-[popup-open]:border-accent-400 data-[popup-open]:ring-[3px] data-[popup-open]:ring-accent-100", className)}>
        <Base.Value className="truncate" />
        <Base.Icon><ChevronsUpDown size={13} className="text-stone-400" /></Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner alignItemWithTrigger={false} align="start" sideOffset={4} className="z-50 outline-none">
          <Base.Popup className={cx(popupCls, "min-w-(--anchor-width)")}>
            <Base.List className="max-h-[min(320px,var(--available-height))] overflow-y-auto">
              {options.map((o) => (
                <Base.Item key={o.value} value={o.value} className={itemCls}>
                  <Base.ItemText className="flex-1 truncate">{o.label}</Base.ItemText>
                  <Base.ItemIndicator><Check size={14} className="text-accent-600" /></Base.ItemIndicator>
                </Base.Item>
              ))}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
