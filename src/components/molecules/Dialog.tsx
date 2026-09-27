"use client";

import type { ReactElement, ReactNode } from "react";
import { Dialog as Base } from "@base-ui/react/dialog";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { cx } from "@/lib/cx";
import { Button } from "../atoms/Button";

export const backdropCls = "fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0";
export const dialogMotion = cx(
  "transition-[opacity,scale,translate] duration-200 ease-out-quint",
  "data-[starting-style]:translate-y-2 data-[starting-style]:scale-[.97] data-[starting-style]:opacity-0",
  "data-[ending-style]:translate-y-1 data-[ending-style]:scale-[.98] data-[ending-style]:opacity-0 data-[ending-style]:duration-150",
);
const popupCls = cx(
  "fixed left-1/2 top-[18vh] z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-stone-200 bg-surface p-5 shadow-dialog outline-none",
  dialogMotion,
);

export function Dialog({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; children: ReactNode;
}) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      <Base.Portal>
        <Base.Backdrop className={backdropCls} />
        <Base.Popup className={popupCls}>
          <Base.Title className="text-base font-semibold">{title}</Base.Title>
          {description && <Base.Description className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{description}</Base.Description>}
          {children}
        </Base.Popup>
      </Base.Portal>
    </Base.Root>
  );
}

export const DialogFooter = ({ children }: { children: ReactNode }) => <div className="mt-5 flex items-center justify-end gap-2">{children}</div>;
export const DialogClose = ({ children }: { children: ReactNode }) => <Base.Close render={<Button />}>{children}</Base.Close>;

/** Confirmation d'une action destructive ou irréversible. */
export function ConfirmDialog({ trigger, title, description, confirmLabel, cancelLabel = "Annuler", danger, onConfirm }: {
  trigger: ReactElement; title: string; description: ReactNode; confirmLabel: string; cancelLabel?: string; danger?: boolean; onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger render={trigger} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdropCls} />
        <AlertDialog.Popup className={popupCls}>
          <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{description}</AlertDialog.Description>
          <DialogFooter>
            <AlertDialog.Close render={<Button />}>{cancelLabel}</AlertDialog.Close>
            <AlertDialog.Close render={<Button variant={danger ? "danger" : "primary"} />} onClick={onConfirm}>{confirmLabel}</AlertDialog.Close>
          </DialogFooter>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
