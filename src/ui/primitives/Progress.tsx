import React from "react";
import { cn } from "../utils/cn";

export default function Progress({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={cn("h-2.5 rounded-full bg-slate-50 overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500/90 to-sky-400/90"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
