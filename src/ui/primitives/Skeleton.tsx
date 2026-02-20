import React from "react";
import { cn } from "@/ui/utils/cn";

/**
 * Premium skeleton with a subtle shimmer.
 * Set width/height via className (e.g. "h-4 w-32").
 */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl2 bg-slate-50",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
    />
  );
}
