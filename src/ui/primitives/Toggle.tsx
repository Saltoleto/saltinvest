import React from "react";
import { cn } from "../utils/cn";

export default function Toggle({
  label,
  checked,
  onChange,
  hint
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm text-slate-800">{label}</div>
        {hint ? <div className="mt-1 text-xs text-slate-600">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "h-7 w-12 rounded-full border transition flex items-center px-1",
          checked ? "bg-emerald-400/25 border-emerald-400/35" : "bg-slate-50 border-slate-200/70"
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full transition",
            checked ? "translate-x-5 bg-gradient-to-br from-emerald-500 to-sky-400" : "translate-x-0 bg-white"
          )}
        />
      </button>
    </div>
  );
}
