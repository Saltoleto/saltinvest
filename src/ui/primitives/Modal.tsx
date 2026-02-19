import React from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import Button from "./Button";

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent background scroll while modal is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[85vh] rounded-xl2 border border-white/10 bg-slate-950/85 backdrop-blur-md shadow-soft overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="font-semibold text-slate-100">{title}</div>
          <Button variant="ghost" onClick={onClose} className="h-9 px-3">
            Fechar
          </Button>
        </div>

        {/* Single scroll surface for a premium feel (avoid nested scrollbars). */}
        <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto">{children}</div>

        <div
          className={cn(
            "px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2 bg-slate-950/40 backdrop-blur-md"
          )}
        >
          {footer}
        </div>
      </div>
    </div>,
    document.body
  );
}
