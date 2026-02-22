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
        // NOTE: Card is used as a big page wrapper. On mobile, :hover can get "stuck" after taps.
        // The previous sheen overlay could paint ABOVE content in some browsers, making the UI look washed out.
        // Keep the sheen, but force it BEHIND content via stacking context + z-index.
        "relative isolate overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-soft",
        "transition",
        "hover:border-slate-300",
        // subtle sheen (behind content)
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-xl2 before:z-0",
        "before:bg-gradient-to-br before:from-slate-50 before:to-transparent before:opacity-0 hover:before:opacity-100",
        // ensure direct children stay above ::before
        "[&>*]:relative [&>*]:z-10",
        className
      )}
    />
  );
}
