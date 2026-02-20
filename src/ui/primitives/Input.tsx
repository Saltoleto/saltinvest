import React from "react";
import { cn } from "../utils/cn";
import { Icon } from "@/ui/layout/icons";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  /**
   * Para inputs do tipo password, mostra o botão de revelar/ocultar.
   * Default: true
   */
  allowReveal?: boolean;
};

export default function Input({
  label,
  hint,
  error,
  className,
  allowReveal,
  type,
  ...props
}: Props) {
  const isPassword = type === "password";
  const [reveal, setReveal] = React.useState(false);

  const finalType = isPassword ? (reveal ? "text" : "password") : type;
  const showReveal = isPassword && (allowReveal ?? true);

  return (
    <label className={cn("block", className)}>
      {label ? <div className="text-sm text-slate-200 mb-2">{label}</div> : null}

      <div className={cn("relative", showReveal ? "" : "")}> 
        <input
          {...props}
          type={finalType}
          className={cn(
            "w-full h-11 rounded-xl2 bg-white/5 border border-white/10 px-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400/30 transition",
            showReveal ? "pr-11" : "",
            error ? "border-red-400/40 focus:ring-red-400/30" : ""
          )}
        />

        {showReveal ? (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-300 hover:text-white hover:bg-white/5 transition"
            aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={0}
          >
            {reveal ? <Icon name="eyeOff" className="h-4 w-4" /> : <Icon name="eye" className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2 text-sm text-red-300">{error}</div>
      ) : hint ? (
        <div className="mt-2 text-sm text-slate-400">{hint}</div>
      ) : null}
    </label>
  );
}
