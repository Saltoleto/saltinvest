import React from "react";
import { cn } from "../utils/cn";

export default function Input({
  label,
  hint,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <label className={cn("block", className)}>
      {label ? <div className="text-sm text-slate-200 mb-2">{label}</div> : null}
      <input
        {...props}
        className={cn(
          "w-full h-11 rounded-xl2 bg-white/5 border border-white/10 px-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/30 transition",
          error ? "border-red-400/40 focus:ring-red-400/30" : ""
        )}
      />
      {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
    </label>
  );
}
