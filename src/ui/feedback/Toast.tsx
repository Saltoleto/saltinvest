import React, { createContext, useContext, useMemo, useState } from "react";
import { cn } from "../utils/cn";

type ToastItem = { id: string; title: string; message?: string; tone?: "info" | "success" | "warning" | "danger" };

const Ctx = createContext<{
  push: (t: Omit<ToastItem, "id">) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const api = useMemo(
    () => ({
      push: (t: Omit<ToastItem, "id">) => {
        const id = crypto.randomUUID?.() ?? String(Date.now());
        const item: ToastItem = { id, ...t };
        setItems((prev) => [item, ...prev].slice(0, 4));
        window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4200);
      }
    }),
    []
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-[360px]">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl2 border bg-slate-900/80 backdrop-blur-md p-4 shadow-soft",
              t.tone === "success"
                ? "border-emerald-400/25"
                : t.tone === "warning"
                  ? "border-amber-400/25"
                  : t.tone === "danger"
                    ? "border-red-400/25"
                    : "border-white/10"
            )}
          >
            <div className="font-medium text-slate-100">{t.title}</div>
            {t.message ? <div className="mt-1 text-sm text-slate-300">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
