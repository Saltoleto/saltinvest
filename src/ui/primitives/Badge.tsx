import React from "react";
import { cn } from "../utils/cn";

export default function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const v =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : variant === "warning"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : variant === "danger"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : variant === "info"
            ? "bg-sky-50 text-blue-700 border-sky-200"
            : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        v,
        className
      )}
    />
  );
}
