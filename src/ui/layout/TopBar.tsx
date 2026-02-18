import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../primitives/Card";
import Button from "../primitives/Button";
import { Icon } from "./icons";

type TopBarAction = null | {
  ariaLabel: string;
  title: string;
  onClick: () => void;
};

type TopBarMeta = {
  title: string;
  subtitle: string;
};

const metaByPath: Array<[RegExp, TopBarMeta]> = [
  [/\/app\/dashboard/, { title: "Dashboard", subtitle: "Visão geral da sua carteira." }],
  [/\/app\/monthly-plan/, { title: "Plano do mês", subtitle: "Aportes sugeridos para acelerar suas metas." }],
  [/\/app\/investments/, { title: "Investimentos", subtitle: "Registre ativos e distribua aportes em metas." }],
  [/\/app\/goals/, { title: "Metas", subtitle: "Defina objetivos e acompanhe evolução." }],
  [/\/app\/targets/, { title: "Alvos", subtitle: "Distribuição desejada por classe." }],
  [/\/app\/classes/, { title: "Classes", subtitle: "Organize sua carteira por tipo de ativo." }],
  [/\/app\/institutions/, { title: "Instituições", subtitle: "Bancos e corretoras para análises e FGC." }],
  [/\/app\/settings/, { title: "Config", subtitle: "Preferências, segurança e dados." }]
];

function getMeta(pathname: string): TopBarMeta {
  const found = metaByPath.find(([re]) => re.test(pathname));
  return found?.[1] ?? { title: "SaltInvest", subtitle: "Concentre, planeje, evolua." };
}

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const meta = getMeta(pathname);

  const action: TopBarAction = React.useMemo(() => {
    if (pathname === "/app/investments") {
      return {
        ariaLabel: "Novo investimento",
        title: "Novo investimento",
        onClick: () => navigate("/app/investments/new")
      };
    }
    if (pathname === "/app/goals") {
      return {
        ariaLabel: "Nova meta",
        title: "Nova meta",
        onClick: () => window.dispatchEvent(new CustomEvent("saltinvest:open-goal-modal"))
      };
    }
    if (pathname === "/app/classes") {
      return {
        ariaLabel: "Nova classe",
        title: "Nova classe",
        onClick: () => window.dispatchEvent(new CustomEvent("saltinvest:open-class-modal"))
      };
    }
    if (pathname === "/app/institutions") {
      return {
        ariaLabel: "Nova instituição",
        title: "Nova instituição",
        onClick: () => window.dispatchEvent(new CustomEvent("saltinvest:open-institution-modal"))
      };
    }
    if (pathname === "/app/monthly-plan") {
      return {
        ariaLabel: "Registrar aporte",
        title: "Registrar aporte",
        onClick: () => navigate("/app/investments/new")
      };
    }
    return null;
  }, [pathname, navigate]);

  return (
    <Card className="px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-slate-100 font-semibold">{meta.title}</div>
        <div className="text-xs text-slate-400">{meta.subtitle}</div>
      </div>

      <div className="flex items-center gap-2">
        {action ? (
          <Button onClick={action.onClick} aria-label={action.ariaLabel} title={action.title} className="h-10 w-10 px-0 rounded-full">
            <Icon name="plus" className="h-5 w-5" />
            <span className="sr-only">{action.title}</span>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
