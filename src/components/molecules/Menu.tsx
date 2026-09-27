"use client";

// Menus déroulants et contextuels : un seul style de popup pour toute l'app.
import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { Kbd } from "../atoms/Kbd";

export const popupCls = cx(
  "min-w-[220px] rounded-[10px] border border-stone-200 bg-surface p-1.5 text-[13px] text-stone-900 shadow-popup outline-none",
  "origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-out-quint",
  "data-[starting-style]:scale-[.97] data-[starting-style]:opacity-0 data-[ending-style]:scale-[.97] data-[ending-style]:opacity-0 data-[ending-style]:duration-100",
);
export const itemCls = "flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 outline-none data-[highlighted]:bg-stone-100";

type Placement = { side?: "top" | "bottom" | "left" | "right"; align?: "start" | "center" | "end"; sideOffset?: number };

export function MenuContent({ anchor, side, align = "start", sideOffset = 6, className, onKeyDown, finalFocus, children }: Placement & {
  anchor?: Element | null; className?: string; onKeyDown?: (e: React.KeyboardEvent) => void; finalFocus?: Menu.Popup.Props["finalFocus"]; children: ReactNode;
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner anchor={anchor} side={side} align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup className={cx(popupCls, className)} onKeyDown={onKeyDown} finalFocus={finalFocus}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function ContextMenuContent({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Positioner className="z-50">
        <ContextMenu.Popup className={cx(popupCls, className)}>{children}</ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  );
}

export function MenuItem({ icon, kbd, danger, children, ...props }: Menu.Item.Props & { icon?: ReactNode; kbd?: string; danger?: boolean }) {
  return (
    <Menu.Item className={cx(itemCls, danger ? "text-red-700" : props.disabled && "text-stone-400")} {...props}>
      {icon && <span className={danger ? "" : "text-stone-500"}>{icon}</span>}
      <span className="flex min-w-0 flex-1 items-center gap-2.5">{children}</span>
      {kbd && <Kbd>{kbd}</Kbd>}
    </Menu.Item>
  );
}

/** Case à cocher en début de ligne ; le menu reste ouvert pour cocher plusieurs choix. */
export function MenuCheckboxItem({ children, trailing, ...props }: Menu.CheckboxItem.Props & { trailing?: ReactNode }) {
  return (
    <Menu.CheckboxItem closeOnClick={false} className={cx("group", itemCls)} {...props}>
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded border border-stone-300 transition-colors duration-100 group-data-[checked]:border-accent-600 group-data-[checked]:bg-accent-600">
        <Menu.CheckboxItemIndicator keepMounted className="transition-[opacity,scale] duration-150 ease-out-quint data-[unchecked]:scale-50 data-[unchecked]:opacity-0">
          <Check size={10} strokeWidth={3} className="text-white" />
        </Menu.CheckboxItemIndicator>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">{children}</span>
      {trailing}
    </Menu.CheckboxItem>
  );
}

export function MenuRadioItem({ children, trailing, kbd, ...props }: Menu.RadioItem.Props & { trailing?: ReactNode; kbd?: string }) {
  return (
    <Menu.RadioItem closeOnClick className={itemCls} {...props}>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">{children}</span>
      {trailing}
      <Menu.RadioItemIndicator><Check size={14} className="text-accent-600" /></Menu.RadioItemIndicator>
      {kbd && <Kbd>{kbd}</Kbd>}
    </Menu.RadioItem>
  );
}

/** En-tête d'un menu d'édition : titre + raccourci qui l'ouvre. */
export function MenuHeader({ label, kbd }: { label: string; kbd?: string }) {
  return (
    <div className="mb-1 flex h-8 items-center gap-2 border-b border-stone-100 px-2.5 text-stone-400">
      {label}<span className="flex-1" />{kbd && <Kbd>{kbd}</Kbd>}
    </div>
  );
}

export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="px-2.5 pb-1 pt-1 text-xs text-stone-400">{children}</div>;
export const MenuSeparator = () => <Menu.Separator className="mx-1.5 my-1 h-px bg-stone-100" />;
export const MenuEmpty = ({ children }: { children: ReactNode }) => <div className="px-2.5 py-2 text-xs text-stone-500">{children}</div>;
