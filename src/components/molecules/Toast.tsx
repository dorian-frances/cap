"use client";

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

export const toasts = Toast.createToastManager();
export const ToastProvider = Toast.Provider;

export function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-5 left-1/2 z-50 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col items-center gap-2">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  );
}

function ToastList() {
  const { toasts: list } = Toast.useToastManager();
  return list.map((t) => (
    <Toast.Root key={t.id} toast={t}
      className="flex w-full items-center gap-3 rounded-[9px] bg-stone-900 py-2 pl-3.5 pr-2 text-[13px] text-stone-50 shadow-dialog transition-[opacity,translate,scale] duration-300 ease-out-quint data-[ending-style]:translate-y-2 data-[ending-style]:scale-[.97] data-[ending-style]:opacity-0 data-[ending-style]:duration-200 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0">
      <Toast.Content className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <Toast.Title className="truncate" />
          <Toast.Description className="truncate text-xs text-stone-400" />
        </div>
        <Toast.Action className="rounded-md px-2 py-1 font-medium text-accent-200 transition-colors hover:bg-stone-800" />
        <Toast.Close aria-label="Fermer" className="flex size-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"><X size={14} /></Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
