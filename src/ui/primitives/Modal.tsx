import React from "react";
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl2 border border-white/10 bg-slate-950/85 backdrop-blur-md shadow-soft">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="font-semibold text-slate-100">{title}</div>
          <Button variant="ghost" onClick={onClose} className="h-9 px-3">
            Fechar
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className={cn("px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2")}>
          {footer}
        </div>
      </div>
    </div>
  );
}
