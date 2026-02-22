import React from "react";
import { cn } from "../utils/cn";

export function Icon({
  name,
  className
}: {
  name:
    | "grid"
    | "wallet"
    | "target"
    | "pie"
    | "layers"
    | "bank"
    | "gear"
    | "spark"
    | "logout"
    | "plus"
    | "check"
    | "x"
    | "chevronUp"
    | "chevronDown"
    | "eye"
    | "eyeOff"
    | "droplet"
    | "shield"
    | "search"
    | "bell";
  className?: string;
}) {
  const common = cn("inline-block", className);

  switch (name) {
    case "grid":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
        </svg>
      );
    case "wallet":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 7a3 3 0 0 1 3-3h12a2 2 0 0 1 2 2v2" />
          <path d="M3 7v10a3 3 0 0 0 3 3h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H8" />
          <path d="M17 13h.01" />
        </svg>
      );
    case "droplet":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2s7 7.4 7 12.2A7 7 0 0 1 5 14.2C5 9.4 12 2 12 2z" />
        </svg>
      );
    case "shield":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 20 6v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "target":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" />
        </svg>
      );
    case "pie":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v10h10" />
          <path d="M21.2 13a9 9 0 1 1-10.2-11" />
        </svg>
      );
    case "layers":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2 2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case "bank":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 10h18" />
          <path d="M5 10V20" />
          <path d="M9 10V20" />
          <path d="M15 10V20" />
          <path d="M19 10V20" />
          <path d="M2 20h20" />
          <path d="M12 3 2 8h20L12 3z" />
        </svg>
      );
    case "gear":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
          <path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.6-2-3.4-2.4 1a7.8 7.8 0 0 0-1.7-1L15 3h-6l-.4 2.9a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 0 0 0 2L.5 16.6l2 3.4 2.4-1a7.8 7.8 0 0 0 1.7 1L9 21h6l.4-2.9a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6z" />
        </svg>
      );
    case "spark":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2l1.2 4.2L17 7.4l-3.8 1.2L12 13l-1.2-4.4L7 7.4l3.8-1.2L12 2z" />
          <path d="M5 13l.8 2.8L8 16.5l-2.2.7L5 20l-.8-2.8L2 16.5l2.2-.7L5 13z" />
          <path d="M19 12l.9 3.1L22 16l-2.1.9L19 20l-.9-3.1L16 16l2.1-.9L19 12z" />
        </svg>
      );
    case "logout":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 3v18" />
        </svg>
      );
    case "plus":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "check":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    
    case "chevronUp":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      );

    case "eye":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 1.42-.36" />
          <path d="M9.88 5.09A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a18.28 18.28 0 0 1-3.4 4.2" />
          <path d="M6.1 6.1A18.28 18.28 0 0 0 2 12s3.5 7 10 7a10.43 10.43 0 0 0 2.12-.21" />
          <path d="M2 2l20 20" />
        </svg>
      );

    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "bell":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );

    case "x":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
  }
}
