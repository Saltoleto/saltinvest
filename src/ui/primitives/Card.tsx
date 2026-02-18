import React from "react";
import { cn } from "../utils/cn";

export default function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl2 border border-white/10 bg-white/5 backdrop-blur-md shadow-soft shadow-black/10",
        className
      )}
    />
  );
}
