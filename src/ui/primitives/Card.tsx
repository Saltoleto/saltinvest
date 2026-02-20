import React from "react";
import { cn } from "../utils/cn";

export default function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl2 border border-slate-200/70 bg-white shadow-soft shadow-slate-900/5",
        className
      )}
    />
  );
}
