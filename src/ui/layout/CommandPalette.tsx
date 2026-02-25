import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Card from "../primitives/Card";
import Input from "../primitives/Input";
import { Icon } from "./icons";
import { cn } from "../utils/cn";

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  icon?: Parameters<typeof Icon>[0]["name"];
  group: "Navegação" | "Ações" | "Cadastros";
  keywords?: string;
  run: (nav: ReturnType<typeof useNavigate>) => void;
};

function kbd(label: string) {
  return (
    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
      {label}
    </span>
  );
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const items: CmdItem[] = React.useMemo(
    () => [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        icon: "grid",
        group: "Navegação",
        keywords: "inicio patrimônio liquidez",
        run: (nav) => nav("/app/dashboard")
      },
      {
        id: "nav-monthly",
        label: "Plano do mês",
        icon: "spark",
        group: "Navegação",
        keywords: "planejamento sugestao aporte",
        run: (nav) => nav("/app/monthly-plan")
      },
      {
        id: "nav-investments",
        label: "Investimentos",
        icon: "wallet",
        group: "Navegação",
        keywords: "ativos aplicações resgate",
        run: (nav) => nav("/app/investments")
      },
      {
        id: "nav-exposure",
        label: "Exposição de investimentos",
        icon: "pie",
        group: "Navegação",
        keywords: "exposição liquidez fgc concentração carteira",
        run: (nav) => nav("/app/exposure")
      },
      {
        id: "nav-plurianual",
        label: "Planejamento plurianual",
        icon: "layers",
        group: "Navegação",
        keywords: "metas anual anos planejamento plurianual consolidado",
        run: (nav) => nav("/app/goals/plurianual")
      },
      {
        id: "nav-goals",
        label: "Metas",
        icon: "target",
        group: "Navegação",
        keywords: "objetivos plano mensal",
        run: (nav) => nav("/app/goals")
      },
      {
        id: "nav-settings",
        label: "Configurações",
        icon: "gear",
        group: "Navegação",
        keywords: "cadastros classes instituições alvos",
        run: (nav) => nav("/app/settings")
      },

      {
        id: "action-new-investment",
        label: "Novo investimento",
        hint: "Abre o formulário",
        icon: "plus",
        group: "Ações",
        keywords: "cadastrar investimento aplicar",
        run: (nav) => nav("/app/investments?modal=new")
      },
      {
        id: "action-new-goal",
        label: "Nova meta",
        hint: "Cria objetivo",
        icon: "plus",
        group: "Ações",
        keywords: "cadastrar meta objetivo",
        run: (nav) => nav("/app/goals?modal=new")
      }
    ],
    []
  );

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    const parts = query.split(/\s+/).filter(Boolean);
    return items
      .map((it) => {
        const hay = `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""}`.toLowerCase();
        let score = 0;
        for (const p of parts) {
          if (hay.includes(p)) score += 1;
          if (it.label.toLowerCase().startsWith(p)) score += 2;
        }
        return { it, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.it);
  }, [items, q]);

  const groups = React.useMemo(() => {
    const map = new Map<string, CmdItem[]>();
    for (const it of filtered) {
      const key = it.group;
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((v) => Math.min(v + 1, Math.max(0, filtered.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((v) => Math.max(0, v - 1));
        return;
      }
      if (e.key === "Enter") {
        const it = filtered[active];
        if (!it) return;
        e.preventDefault();
        onClose();
        it.run(navigate);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, navigate, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-start justify-center px-3 py-6 sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative w-full max-w-2xl"
          >
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-slate-900 font-semibold">Buscar</div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  {kbd("Esc")} {kbd("↑↓")} {kbd("Enter")}
                </div>
              </div>

              <div className="mt-3" data-allow-select="true">
                <Input
                  ref={inputRef}
                  label=""
                  placeholder="Ir para… ou executar ação"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                />
              </div>

              <div className="mt-3 max-h-[55vh] overflow-y-auto pr-1">
                {filtered.length ? (
                  <div className="grid gap-4">
                    {groups.map(([group, list]) => (
                      <div key={group}>
                        <div className="px-2 text-[11px] uppercase tracking-wider text-slate-500">{group}</div>
                        <div className="mt-2 grid gap-1">
                          {list.map((it) => {
                            const idx = filtered.findIndex((x) => x.id === it.id);
                            const isActive = idx === active;
                            return (
                              <button
                                key={it.id}
                                type="button"
                                onMouseEnter={() => setActive(idx)}
                                onClick={() => {
                                  onClose();
                                  it.run(navigate);
                                }}
                                className={cn(
                                  "w-full text-left rounded-xl2 border px-3 py-2.5 flex items-center justify-between gap-3 transition",
                                  isActive
                                    ? "border-slate-300 bg-slate-50"
                                    : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="h-9 w-9 rounded-xl2 border border-slate-200 bg-white flex items-center justify-center text-slate-800 shrink-0">
                                    <Icon name={it.icon ?? "spark"} className="h-5 w-5" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-slate-900 font-medium truncate">{it.label}</div>
                                    {it.hint ? <div className="text-xs text-slate-600 truncate">{it.hint}</div> : null}
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500">↵</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl2 border border-slate-200 bg-white p-6 text-center">
                    <div className="text-slate-900 font-medium">Nada encontrado</div>
                    <div className="mt-1 text-sm text-slate-600">Tente termos como “investimentos”, “metas”, “plano”.</div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
