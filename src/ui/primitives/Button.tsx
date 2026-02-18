import React from "react";
import { cn } from "../utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export default function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const v =
    variant === "primary"
      ? "bg-gradient-to-r from-emerald-500/90 to-sky-400/90 text-slate-950 hover:from-emerald-400 hover:to-sky-300"
      : variant === "secondary"
        ? "bg-white/8 text-slate-100 hover:bg-white/12 border border-white/10"
        : variant === "danger"
          ? "bg-red-500/90 text-white hover:bg-red-400"
          : "bg-transparent text-slate-200 hover:bg-white/8";

  const s = size === "sm" ? "h-9 px-3 text-sm" : size === "lg" ? "h-12 px-5 text-base" : "h-10 px-4 text-sm";

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl2 font-medium shadow-soft shadow-black/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-60 disabled:pointer-events-none transition",
        v,
        s,
        className
      )}
    />
  );
}
