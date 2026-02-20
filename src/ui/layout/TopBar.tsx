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

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <Card className="px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-slate-100 font-semibold">{getTitle(pathname)}</div>
        <div className="text-xs text-slate-400">Concentre, planeje, evolua.</div>
      </div>

      <div className="flex items-center gap-2">
        {pathname === "/app/investments" ? (
          <Button
            onClick={() => navigate("/app/investments?modal=new")}
            aria-label="Novo investimento"
            title="Novo investimento"
            className="h-10 w-10 px-0 rounded-full"
          >
            <Icon name="plus" className="h-5 w-5" />
            <span className="sr-only">Novo investimento</span>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
