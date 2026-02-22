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
      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
      : variant === "secondary"
        ? "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
        : variant === "danger"
          ? "bg-rose-600 text-white hover:bg-rose-500"
          : "bg-transparent text-slate-700 hover:bg-slate-100";

  const s = size === "sm" ? "h-9 px-3 text-sm" : size === "lg" ? "h-12 px-5 text-base" : "h-10 px-4 text-sm";

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl2 font-medium",
        "shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-400/35",
        "disabled:opacity-60 disabled:pointer-events-none transition",
        v,
        s,
        className
      )}
    />
  );
}
