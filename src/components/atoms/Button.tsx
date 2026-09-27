import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Kbd } from "./Kbd";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dashed";
export type ButtonSize = "sm" | "md" | "form" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-stone-900 text-stone-50 shadow-control hover:bg-stone-700",
  secondary: "border border-stone-200 bg-white text-stone-900 shadow-control hover:border-stone-300 hover:bg-stone-50",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900 data-[popup-open]:bg-stone-100",
  danger: "bg-red-600 text-white shadow-control hover:bg-red-700",
  dashed: "border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 hover:bg-stone-50 hover:text-stone-700",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "h-[26px] gap-1.5 rounded-md px-2 text-xs",
  md: "h-7 gap-1.5 rounded-[7px] px-2.5 text-[13px]",
  form: "h-8 gap-1.5 rounded-[7px] px-2.5 text-[13px]", // aligné sur la hauteur des champs
  lg: "h-9 gap-2 rounded-lg px-3.5 text-sm",
};

/** Classes d'un bouton, pour les composants Base UI rendus en bouton (Trigger, Close…). */
export const buttonCls = (variant: ButtonVariant = "secondary", size: ButtonSize = "md") => cx(
  "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
  "transition-[background-color,border-color,color,box-shadow,scale] duration-150 ease-out active:scale-[.98]",
  "disabled:pointer-events-none disabled:opacity-50",
  VARIANT[variant], SIZE[size],
);

type Props = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; kbd?: ReactNode };

export function Button({ variant, size, kbd, className, children, type = "button", ...props }: Props) {
  return (
    <button type={type} className={cx(buttonCls(variant, size), className)} {...props}>
      {children}
      {kbd && <Kbd tone={variant === "primary" ? "dark" : "light"}>{kbd}</Kbd>}
    </button>
  );
}
