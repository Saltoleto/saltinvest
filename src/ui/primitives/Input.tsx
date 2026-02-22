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

const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className, allowReveal, type, ...props },
  ref
) {
  const isPassword = type === "password";
  const [reveal, setReveal] = React.useState(false);

  const finalType = isPassword ? (reveal ? "text" : "password") : type;
  const showReveal = isPassword && (allowReveal ?? true);

  return (
    <label className={cn("block", className)}>
      {label ? <div className="text-sm text-slate-700 mb-2">{label}</div> : null}

      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={finalType}
          className={cn(
            "w-full h-11 rounded-xl2 bg-white border border-slate-200 px-3 text-slate-900",
            "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/35 focus:border-blue-500/40 transition",
            showReveal ? "pr-11" : "",
            error ? "border-rose-300 focus:ring-rose-400/25 focus:border-rose-400/40" : ""
          )}
        />

        {showReveal ? (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={0}
          >
            {reveal ? <Icon name="eyeOff" className="h-4 w-4" /> : <Icon name="eye" className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2 text-sm text-rose-700">{error}</div>
      ) : hint ? (
        <div className="mt-2 text-sm text-slate-600">{hint}</div>
      ) : null}
    </label>
  );
});

export default Input;
