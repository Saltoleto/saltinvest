import React from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

/**
 * BottomSheet (mobile-first)
 * - Mobile: painel ancorado no rodapé, com cantos superiores arredondados
 * - Desktop: comportamento similar a um modal centralizado
 */
export default function BottomSheet({
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

  // Prevent background scroll while open
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
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center md:justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative w-full md:max-w-4xl max-h-[85vh] rounded-t-2xl md:rounded-xl2 border border-slate-200 bg-white shadow-soft overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="font-semibold text-slate-900 truncate pr-3">{title}</div>
          <Button variant="ghost" onClick={onClose} className="h-9 px-3 shrink-0">
            Fechar
          </Button>
        </div>

        <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto">{children}</div>

        {footer ? (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
