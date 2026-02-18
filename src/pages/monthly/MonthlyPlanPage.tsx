import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import { useAsync } from "@/state/useAsync";
import { getMonthlyPlanSummary, listMonthlyPlanGoals, listMonthlyPlanRanking } from "@/services/monthly";
import { formatBRL, formatPercent, clamp } from "@/lib/format";

type GoalRow = {
  goal_id: string;
  name: string;
  target_value: number;
  months_remaining: number;
  remaining_value: number;
  current_contributed: number;
  suggested_this_month: number;
  contributed_this_month: number;
  remaining_this_month: number;
  priority_rank?: number;
};

function getMonthlyStatus(g: GoalRow): { label: string; variant: "success" | "warning" | "danger" | "info" } {
  const remainingValue = Number(g.remaining_value) || 0;
  if (remainingValue <= 0) return { label: "Concluída", variant: "success" };

  const m = Number(g.months_remaining) || 0;
  if (m <= 1) return { label: "Urgente", variant: "danger" };
  if (m <= 3) return { label: "Atenção", variant: "warning" };
  return { label: "Em dia", variant: "info" };
}

function cardEmphasisClass(variant: "success" | "warning" | "danger" | "info") {
  if (variant === "danger") return "ring-1 ring-red-400/30 bg-red-400/5";
  if (variant === "warning") return "ring-1 ring-amber-400/25 bg-amber-400/5";
  return "";
}

export default function MonthlyPlanPage() {
  const summary = useAsync(() => getMonthlyPlanSummary(), []);
  const goals = useAsync(() => listMonthlyPlanGoals(), []);
  const ranking = useAsync(() => listMonthlyPlanRanking(), []);

  const totals = React.useMemo(() => {
    const s = summary.data;
    return {
      suggested: Number(s?.total_suggested_this_month ?? 0),
      contributed: Number(s?.total_contributed_this_month ?? 0),
      remaining: Number(s?.total_remaining_this_month ?? 0)
    };
  }, [summary.data]);

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-100 font-semibold">Total sugerido</div>
            <div className="mt-1 text-3xl font-semibold">{formatBRL(totals.suggested)}</div>
            <div className="mt-2 text-sm text-slate-400">
              Soma dos aportes recomendados para as metas marcadas como <span className="text-sky-200">Plano do mês</span>.
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl2 border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Aportado no mês</div>
                <div className="mt-1 text-slate-100 font-semibold">{formatBRL(totals.contributed)}</div>
              </div>
              <div className="rounded-xl2 border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Restante do mês</div>
                <div className="mt-1 text-slate-100 font-semibold">{formatBRL(totals.remaining)}</div>
              </div>
              <div className="rounded-xl2 border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">Metas no plano</div>
                <div className="mt-1 text-slate-100 font-semibold">{goals.data?.length ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-100 font-semibold">Prioridades do mês</div>
            <div className="mt-1 text-sm text-slate-400">Ordem sugerida para acelerar as metas, considerando prazo e gap.</div>
          </div>
          <Badge variant="info">{ranking.data?.length ?? 0}</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {ranking.loading ? (
            <div className="text-sm text-slate-400">Carregando...</div>
          ) : (ranking.data?.length ?? 0) ? (
            (ranking.data ?? []).slice(0, 5).map((g: any) => {
              const row: GoalRow = {
                goal_id: g.goal_id,
                name: g.name,
                target_value: Number(g.target_value) || 0,
                months_remaining: Number(g.months_remaining) || 0,
                remaining_value: Number(g.remaining_value) || 0,
                current_contributed: Number(g.current_contributed) || 0,
                suggested_this_month: Number(g.suggested_this_month) || 0,
                contributed_this_month: Number(g.contributed_this_month) || 0,
                remaining_this_month: Number(g.remaining_this_month) || 0,
                priority_rank: Number(g.priority_rank) || 0
              };
              const status = getMonthlyStatus(row);
              const monthlyProgress = row.suggested_this_month > 0 ? (row.contributed_this_month / row.suggested_this_month) * 100 : 0;
              return (
              <div key={g.goal_id} className={"rounded-xl2 border border-white/10 bg-white/5 p-4 " + cardEmphasisClass(status.variant)}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-slate-100 font-medium">
                      <span className="text-slate-400 mr-2">#{g.priority_rank}</span>
                      {g.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Restante: {formatBRL(Number(g.remaining_value))} • {Number(g.months_remaining)} mês(es) • Sugestão: {" "}
                      <span className="text-slate-100 font-medium">{formatBRL(Number(g.suggested_this_month))}</span>/mês
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Mês</span>
                        <span>
                          {formatBRL(row.contributed_this_month)} / {formatBRL(row.suggested_this_month)}
                        </span>
                      </div>
                      <Progress className="mt-2" value={clamp(monthlyProgress, 0, 100)} />
                    </div>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
            );
            })
          ) : (
            <div className="rounded-xl2 border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-slate-100 font-medium">Sem ranking</div>
              <div className="mt-1 text-sm text-slate-400">Ative a flag “Plano do mês” em metas para ver prioridades.</div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-100 font-semibold">Metas no plano</div>
          <Badge variant="info">{goals.data?.length ?? 0}</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {goals.loading ? (
            <div className="text-sm text-slate-400">Carregando...</div>
          ) : (goals.data?.length ?? 0) ? (
            (goals.data ?? []).map((g: any) => {
              const row: GoalRow = {
                goal_id: g.goal_id,
                name: g.name,
                target_value: Number(g.target_value) || 0,
                months_remaining: Number(g.months_remaining) || 0,
                remaining_value: Number(g.remaining_value) || 0,
                current_contributed: Number(g.current_contributed) || 0,
                suggested_this_month: Number(g.suggested_this_month) || 0,
                contributed_this_month: Number(g.contributed_this_month) || 0,
                remaining_this_month: Number(g.remaining_this_month) || 0
              };
              const status = getMonthlyStatus(row);
              const monthlyProgress = row.suggested_this_month > 0 ? (row.contributed_this_month / row.suggested_this_month) * 100 : 0;
              const contributed = Number(g.current_contributed) || 0;
              const percent = g.target_value > 0 ? (contributed / Number(g.target_value)) * 100 : 0;
              return (
                <div key={g.goal_id} className={"rounded-xl2 border border-white/10 bg-white/5 p-4 " + cardEmphasisClass(status.variant)}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-slate-100 font-medium">{g.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Sugestão: <span className="text-slate-100 font-medium">{formatBRL(Number(g.suggested_this_month))}</span>/mês • Aportado no mês: {formatBRL(Number(g.contributed_this_month))} • Restante do mês: {formatBRL(Number(g.remaining_this_month))}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Restante total: {formatBRL(Number(g.remaining_value))} • {Number(g.months_remaining)} mês(es) até a meta</div>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Mês</span>
                      <span>
                        {formatBRL(row.contributed_this_month)} / {formatBRL(row.suggested_this_month)}
                      </span>
                    </div>
                    <Progress className="mt-2" value={clamp(monthlyProgress, 0, 100)} />

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Total</span>
                      <span>{formatPercent(Number(percent) || 0)}</span>
                    </div>
                    <Progress value={clamp(Number(percent) || 0, 0, 100)} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl2 border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-slate-100 font-medium">Nenhuma meta no plano do mês</div>
              <div className="mt-1 text-sm text-slate-400">Ative a flag “Plano do mês” em uma meta para ela entrar no cálculo.</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
