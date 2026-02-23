import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../primitives/Card";
import Button from "../primitives/Button";
import { Icon } from "./icons";

const titleByPath: Array<[RegExp, string]> = [
  [/\/app\/dashboard/, "Dashboard"],
  [/\/app\/monthly-plan/, "Plano do mês"],
  [/\/app\/investments/, "Investimentos"],
  [/\/app\/goals/, "Metas"],
  [/\/app\/targets/, "Alvos da carteira"],
  [/\/app\/classes/, "Classes"],
  [/\/app\/institutions/, "Instituições"],
  [/\/app\/settings/, "Configurações"]
];

function getTitle(pathname: string) {
  const found = titleByPath.find(([re]) => re.test(pathname));
  return found?.[1] ?? "SaltInvest";
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
      {children}
    </span>
  );
}

export default function TopBar({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const mobileCreate = pathname === "/app/investments"
    ? { label: "Novo investimento", to: "/app/investments?modal=new" }
    : pathname === "/app/goals"
      ? { label: "Nova meta", to: "/app/goals?modal=new" }
      : null;

  return (
    <>
    <Card className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-slate-900 font-semibold truncate">{getTitle(pathname)}</div>
        <div className="text-xs text-slate-600 truncate">Concentre, planeje, evolua.</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 rounded-xl2 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 transition"
          aria-label="Buscar"
        >
          <Icon name="search" className="h-4 w-4" />
          <span>Buscar</span>
          <span className="ml-2 flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="sm:hidden rounded-xl2 border border-slate-200 bg-slate-50 p-2 text-slate-800 hover:bg-slate-100 transition"
          aria-label="Buscar"
          title="Buscar"
        >
          <Icon name="search" className="h-5 w-5" />
          <span className="sr-only">Buscar</span>
        </button>

        {pathname === "/app/investments" ? (
          <Button
            onClick={() => navigate("/app/investments?modal=new")}
            aria-label="Novo investimento"
            title="Novo investimento"
            className="hidden sm:inline-flex h-10 w-10 px-0 rounded-full shadow"
          >
            <Icon name="plus" className="h-5 w-5" />
            <span className="sr-only">Novo investimento</span>
          </Button>
        ) : null}

        {pathname === "/app/goals" ? (
          <Button
            onClick={() => navigate("/app/goals?modal=new")}
            aria-label="Nova meta"
            title="Nova meta"
            className="hidden sm:inline-flex h-10 w-10 px-0 rounded-full shadow"
          >
            <Icon name="plus" className="h-5 w-5" />
            <span className="sr-only">Nova meta</span>
          </Button>
        ) : null}
      </div>
    </Card>

    {mobileCreate ? (
      <Button
        onClick={() => navigate(mobileCreate.to)}
        aria-label={mobileCreate.label}
        title={mobileCreate.label}
        className="sm:hidden fixed right-4 z-30 h-14 w-14 px-0 rounded-full shadow-lg ring-1 ring-white/70 fab-enter" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
      >
        <Icon name="plus" className="h-6 w-6" />
        <span className="sr-only">{mobileCreate.label}</span>
      </Button>
    ) : null}
    </>
  );
}
