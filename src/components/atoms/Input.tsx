import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export const fieldCls = cx(
  "h-8 rounded-[7px] border border-stone-200 bg-surface px-2.5 text-[13px] outline-none",
  "transition-[border-color,box-shadow] duration-150 placeholder:text-stone-400 hover:border-stone-300",
  "focus:border-accent-400 focus:ring-[3px] focus:ring-accent-100",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldCls, className)} {...props} />;
}

/** Champ sans bordure qui se révèle au survol : titres et libellés éditables en place. */
export function InlineInput({ className, size = "md", ...props }: Omit<ComponentProps<"input">, "size"> & { size?: "md" | "lg" | "xl" }) {
  return (
    <input className={cx(
      "-mx-1 min-w-0 rounded px-1 outline-none transition-colors duration-150 placeholder:text-stone-300 hover:bg-stone-50 focus:bg-stone-50",
      size === "xl" ? "text-[22px] font-semibold tracking-tight" : size === "lg" ? "text-xl font-semibold" : "py-1 text-[13px] font-medium",
      className,
    )} {...props} />
  );
}

/** Titre éditable sur plusieurs lignes : grandit avec son contenu, Entrée valide (pas de retour à la ligne). */
export function InlineTextarea({ className, onInput, onKeyDown, ...props }: ComponentProps<"textarea">) {
  const fit = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <textarea ref={fit} rows={1} className={cx(
      "-mx-1 min-w-0 resize-none overflow-hidden rounded px-1 text-[22px] font-semibold leading-tight tracking-tight outline-none",
      "transition-colors duration-150 placeholder:text-stone-300 hover:bg-stone-50 focus:bg-stone-50",
      className,
    )} onInput={(e) => { fit(e.currentTarget); onInput?.(e); }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } onKeyDown?.(e); }} {...props} />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea className={cx(
      "-mx-2 resize-y rounded-md px-2 py-1.5 text-[13px] leading-relaxed outline-none transition-colors duration-150",
      "placeholder:text-stone-400 hover:bg-stone-50 focus:bg-stone-50",
      className,
    )} {...props} />
  );
}
