import React from "react";
import { cn } from "../utils/cn";

/**
 * Card base (Material-like): surface + elevation + borda sutil.
 * - Light theme friendly
 * - Hover suave (sem "glow" escuro)
 */
export default function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "relative rounded-xl2 border border-slate-200 bg-white shadow-soft",
        "transition",
        "hover:border-slate-300",
        // subtle sheen
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-xl2",
        "before:bg-gradient-to-br before:from-slate-50 before:to-transparent before:opacity-0 hover:before:opacity-100",
        className
      )}
    />
  );
}
