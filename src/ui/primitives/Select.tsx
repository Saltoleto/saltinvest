import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

type Opt = { value: string; label: string; disabled?: boolean };

function getOptions(children: React.ReactNode): Opt[] {
  const items = React.Children.toArray(children);
  const out: Opt[] = [];
  for (const it of items) {
    if (!React.isValidElement(it)) continue;
    // Support <option> and fragments
    if ((it.type as any) === React.Fragment) {
      out.push(...getOptions(it.props.children));
      continue;
    }
    if (typeof it.type === "string" && it.type.toLowerCase() === "option") {
      const v = String((it.props as any).value ?? "");
      const lbl = String((it.props as any).children ?? "");
      out.push({ value: v, label: lbl, disabled: Boolean((it.props as any).disabled) });
    }
  }
  return out;
}

function useOnClickOutside(refs: React.RefObject<HTMLElement>[], onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      const inside = refs.some((r) => r.current && r.current.contains(t));
      if (!inside) onOutside();
    }
    document.addEventListener("pointerdown", onDown as any);
    return () => document.removeEventListener("pointerdown", onDown as any);
  }, [refs, onOutside]);
}

type PopPos = { left: number; top: number; width: number };

export default function Select({
  label,
  hint,
  error,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  required,
  ...rest
}: Props) {
  const options = useMemo(() => getOptions(children), [children]);

  // Controlled vs uncontrolled
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(String(defaultValue ?? ""));
  const current = String((isControlled ? value : internal) ?? "");

  const selected = options.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<PopPos | null>(null);

  useOnClickOutside([wrapRef, popRef], () => setOpen(false));

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [options, q]);

  function syncPos() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      left: Math.round(r.left),
      top: Math.round(r.bottom),
      width: Math.round(r.width)
    });
  }

  useEffect(() => {
    if (!open) {
      setQ("");
      setPos(null);
      return;
    }
    syncPos();
    // Focus search when opening
    setTimeout(() => searchRef.current?.focus(), 0);
    const idx = Math.max(0, filtered.findIndex((o) => o.value === current));
    setActive(idx === -1 ? 0 : idx);

    function onScrollOrResize() {
      syncPos();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function emitChange(next: string) {
    if (!isControlled) setInternal(next);
    if (onChange) {
      // minimal synthetic event to satisfy existing handlers
      (onChange as any)({
        target: { value: next, name },
        currentTarget: { value: next, name }
      });
    }
  }

  function pick(opt: Opt) {
    if (opt.disabled) return;
    emitChange(opt.value);
    requestAnimationFrame(() => setOpen(false));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      requestAnimationFrame(() => setOpen(false));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) pick(opt);
    }
  }

  const popover =
    open && pos
      ? createPortal(
          <div
            ref={popRef}
            style={{ left: pos.left, top: pos.top + 8, width: pos.width, position: "fixed" }}
            className={cn(
              "z-[9999] rounded-2xl border border-white/10",
              "bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            )}
            role="listbox"
          >
            <div className="p-2 border-b border-white/10">
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Buscar..."
                className="w-full h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
              />
            </div>

            <div className="max-h-64 overflow-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-400">Nenhum resultado.</div>
              ) : (
                filtered.map((opt, idx) => {
                  const isSel = opt.value === current;
                  const isAct = idx === active;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      disabled={opt.disabled}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3",
                        opt.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/7",
                        isAct ? "bg-white/7" : "",
                        isSel ? "border border-sky-400/20" : "border border-transparent"
                      )}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => pick(opt)}
                    >
                      <span className="truncate text-slate-100">{opt.label}</span>
                      {isSel ? <span className="text-sky-300">✓</span> : <span className="text-transparent">✓</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <label className={cn("block", className)}>
      {label ? <div className="text-sm text-slate-200 mb-2">{label}</div> : null}

      {/* Hidden input to keep native forms happy */}
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}

      <div ref={wrapRef} className="relative" onKeyDown={onKeyDown}>
        <button
          ref={btnRef}
          {...rest}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "w-full h-11 rounded-xl2 bg-white/5 border border-white/10 px-3 text-left text-slate-100",
            "focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/30 transition",
            "flex items-center justify-between gap-3",
            disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white/7",
            error ? "border-red-400/40 focus:ring-red-400/30" : ""
          )}
          onClick={() => !disabled && setOpen((v) => !v)}
        >
          <span className={cn("truncate", !selected?.label ? "text-slate-400" : "")}>{selected?.label || "Selecionar"}</span>
          <span className={cn("text-slate-300 transition", open ? "rotate-180" : "")}>▾</span>
        </button>

        {popover}
      </div>

      {error ? <div className="mt-2 text-sm text-red-300">{error}</div> : hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
    </label>
  );
}
