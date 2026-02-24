import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../primitives/Card";
import Button from "../primitives/Button";
import { Icon } from "./icons";

type TopBarProps = {
  onOpenCommandPalette?: () => void;
};

const titleByPath: Array<[RegExp, string]> = [
  [/\/app\/dashboard/, "Dashboard"],
  [/\/app\/monthly-plan/, "Plano do mês"],
  [/\/app\/investments/, "Investimentos"],
  [/\/app\/goals/, "Metas"],
  [/\/app\/targets/, "Alvos da carteira"],
  [/\/app\/classes/, "Classes"],
  [/\/app\/institutions/, "Instituições"],
  [/\/app\/settings/, "Config"]
];

const subtitleByPath: Array<[RegExp, string]> = [
  [/\/app\/dashboard/, "Concentre, planeje, evolua."],
  [/\/app\/monthly-plan/, "Concentre, planeje, evolua."],
  [/\/app\/investments/, "Concentre, planeje, evolua."],
  [/\/app\/goals/, "Concentre, planeje, evolua."],
  [/\/app\/targets/, "Concentre, planeje, evolua."],
  [/\/app\/classes/, "Cadastre e organize classes."],
  [/\/app\/institutions/, "Cadastre e organize instituições."],
  [/\/app\/settings/, "Preferências da aplicação."]
];

function pickByPath(pathname: string, list: Array<[RegExp, string]>, fallback: string) {
  for (const [rx, value] of list) {
    if (rx.test(pathname)) return value;
  }
  return fallback;
}

export default function TopBar({ onOpenCommandPalette: _onOpenCommandPalette }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const title = pickByPath(pathname, titleByPath, "SaltInvest");
  const subtitle = pickByPath(pathname, subtitleByPath, "Concentre, planeje, evolua.");

  const canCreateInvestment = /\/app\/investments/.test(pathname);
  const canCreateGoal = /\/app\/goals/.test(pathname);

  const desktopCreate = canCreateInvestment
    ? { label: "Novo investimento", to: "/app/investments?modal=new" }
    : canCreateGoal
      ? { label: "Nova meta", to: "/app/goals?modal=new" }
      : null;

  const mobileCreate = desktopCreate;

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-slate-900 font-semibold">{title}</div>
            <div className="text-slate-600 text-sm">{subtitle}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mantemos apenas ação de cadastro quando aplicável; busca global removida */}
            {desktopCreate ? (
              <Button
                onClick={() => navigate(desktopCreate.to)}
                aria-label={desktopCreate.label}
                title={desktopCreate.label}
                className="hidden sm:inline-flex h-10 w-10 px-0 rounded-full shadow"
              >
                <Icon name="plus" className="h-4 w-4" />
                <span className="sr-only">{desktopCreate.label}</span>
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {mobileCreate ? (
        <Button
          onClick={() => navigate(mobileCreate.to)}
          aria-label={mobileCreate.label}
          title={mobileCreate.label}
          className="sm:hidden fixed right-4 z-30 h-14 w-14 px-0 rounded-full shadow-lg ring-1 ring-white/70 fab-enter"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
        >
          <Icon name="plus" className="h-6 w-6" />
          <span className="sr-only">{mobileCreate.label}</span>
        </Button>
      ) : null}
    </>
  );
}
