import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import Button from "@/ui/primitives/Button";
import { useAsync } from "@/state/useAsync";
import { listGoalsEvolution } from "@/services/goals";
import { formatBRL, formatPercent, clamp } from "@/lib/format";
import { sum } from "@/lib/validate";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/ui/layout/icons";

function monthsFromDays(days: number): number {
  if (!isFinite(days)) return 1;
  if (days <= 0) return 0;
  return Math.max(1, Math.ceil(days / 30));
}

export default function MonthlyPlanPage() {
  const navigate = useNavigate();
  const goals = useAsync(() => listGoalsEvolution(), []);

  const rows = React.useMemo(() => {
    const src = goals.data ?? [];
    return src
      .filter((g) => !!g.is_monthly_plan)
      .map((g) => {
        const remaining = Math.max(0, Number(g.target_value) - Number(g.current_contributed));
        const months = monthsFromDays(Number(g.days_remaining));
        const required = months === 0 ? 0 : remaining / months;
        return {
          ...g,
          remaining,
          monthsRemaining: months,
          requiredPerMonth: required
        };
      })
      .sort((a, b) => b.requiredPerMonth - a.requiredPerMonth);
  }, [goals.data]);

  const totalSuggested = sum(rows.map((r) => r.requiredPerMonth));

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-100 font-semibold">Total sugerido</div>
            <div className="mt-1 text-3xl font-semibold">{formatBRL(totalSuggested)}</div>
            <div className="mt-2 text-sm text-slate-400">
              Soma dos aportes recomendados para as metas marcadas como <span className="text-sky-200">Plano do mês</span>, distribuindo o valor restante pelos meses até a data-alvo.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/app/investments/new")}
              aria-label="Registrar aporte"
              title="Registrar aporte"
              className="h-10 w-10 px-0 rounded-full"
            >
              <Icon name="plus" className="h-5 w-5" />
              <span className="sr-only">Registrar aporte</span>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-100 font-semibold">Metas no plano</div>
          <Badge variant="info">{rows.length}</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {goals.loading ? (
            <div className="text-sm text-slate-400">Carregando...</div>
          ) : rows.length ? (
            rows.map((g) => (
              <div key={g.goal_id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-slate-100 font-medium">{g.name}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      Restante: {formatBRL(g.remaining)} • {g.monthsRemaining} mês(es) • Sugestão:{" "}
                      <span className="text-slate-100 font-medium">{formatBRL(g.requiredPerMonth)}</span>/mês
                    </div>
                  </div>
                  <Badge variant={g.percent_progress >= 100 ? "success" : "info"}>{g.percent_progress >= 100 ? "Concluída" : "Ativa"}</Badge>
                </div>

                <div className="mt-3">
                  <Progress value={clamp(Number(g.percent_progress) || 0, 0, 100)} />
                  <div className="mt-2 text-xs text-slate-400">{formatPercent(Number(g.percent_progress) || 0)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl2 border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-slate-100 font-medium">Nenhuma meta no plano do mês</div>
              <div className="mt-1 text-sm text-slate-400">Ative a flag “Plano do mês” em uma meta para ela entrar no cálculo.</div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-slate-100 font-semibold">Como o cálculo funciona</div>
        <div className="mt-2 text-sm text-slate-400 grid gap-1">
          <div>• Considera apenas metas com <span className="text-slate-200">is_monthly_plan = true</span>.</div>
          <div>• Restante = <span className="text-slate-200">target_value</span> − <span className="text-slate-200">current_contributed</span>.</div>
          <div>• requiredPerMonth = restante / meses restantes (aprox. por dias/30).</div>
          <div className="mt-2 text-xs text-slate-500">Obs.: você pode refinar esse cálculo no backend com uma view/função específica se preferir precisão por mês-calendário.</div>
        </div>
      </Card>
    </div>
  );
}
