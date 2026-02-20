import React from "react";
import { cn } from "../utils/cn";

export default function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const v =
    variant === "success"
      ? "bg-emerald-400/15 text-emerald-800 border-emerald-400/25"
      : variant === "warning"
        ? "bg-amber-400/15 text-amber-700 border-amber-400/25"
        : variant === "danger"
          ? "bg-red-400/15 text-red-600 border-red-400/25"
          : variant === "info"
            ? "bg-sky-400/15 text-sky-700 border-sky-400/25"
            : "bg-slate-50 text-slate-800 border-slate-200/70";

  return (
    <span {...props} className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", v, className)} />
  );
}
