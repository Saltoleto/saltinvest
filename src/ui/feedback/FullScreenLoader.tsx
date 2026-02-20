import React from "react";

export default function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl2 border border-slate-200/70 bg-white p-6 text-center">
        <div className="mx-auto h-10 w-10 rounded-xl2 bg-gradient-to-br from-emerald-500/90 to-sky-400/90 animate-pulse" />
        <div className="mt-4 text-slate-900 font-medium">{label ?? "Carregando..."}</div>
        <div className="mt-1 text-sm text-slate-600">Preparando uma experiência premium.</div>
      </div>
    </div>
  );
}
