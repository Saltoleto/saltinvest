import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import Input from "@/ui/primitives/Input";
import Skeleton from "@/ui/primitives/Skeleton";
import { Icon } from "@/ui/layout/icons";
import { useAsync } from "@/state/useAsync";
import { getMonthlyPlanSummary, listMonthlyPlanGoals } from "@/services/monthly";
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
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = React.useState<string>(defaultMonth);

  const summary = useAsync(() => getMonthlyPlanSummary(month), [month]);
  const goals = useAsync(() => listMonthlyPlanGoals(month), [month]);

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <div className="text-slate-900 font-semibold">Total sugerido</div>
            {summary.loading ? (
              <Skeleton className="mt-2 h-10 w-44" />
            ) : (
              <div className="mt-1 text-3xl font-semibold">{formatBRL(totals.suggested)}</div>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="rounded-xl2 border border-slate-200/70 bg-white p-3">
                <div className="text-xs text-slate-600">Aportado no mês</div>
                {summary.loading ? <Skeleton className="mt-2 h-5 w-24" /> : <div className="mt-1 text-slate-900 font-semibold">{formatBRL(totals.contributed)}</div>}
              </div>
              <div className="rounded-xl2 border border-slate-200/70 bg-white p-3">
                <div className="text-xs text-slate-600">Restante do mês</div>
                {summary.loading ? <Skeleton className="mt-2 h-5 w-24" /> : <div className="mt-1 text-slate-900 font-semibold">{formatBRL(totals.remaining)}</div>}
              </div>
            </div>
          </div>

          <div className="w-full sm:min-w-[220px] sm:w-auto">
            <Input
              label="Filtrar por mês"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-900 font-semibold">Metas no plano</div>
          <Badge variant="info">{goals.data?.length ?? 0}</Badge>
        </div>

        <div className="mt-4 grid gap-3">
          {goals.loading ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl2 border border-slate-200/70 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-2 h-4 w-56" />
                    </div>
                    <Skeleton className="h-7 w-12" />
                  </div>
                  <Skeleton className="mt-4 h-3 w-full" />
                  <Skeleton className="mt-3 h-3 w-full" />
                </div>
              ))}
            </>
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
                <div key={g.goal_id} className={"rounded-xl2 border border-slate-200/70 bg-white p-4 " + cardEmphasisClass(status.variant)}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div>
                      <div className="text-slate-900 font-medium">{g.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Sugestão: <span className="text-slate-900 font-medium">{formatBRL(Number(g.suggested_this_month))}</span>/mês
                      </div>
                    </div>
                    <Badge variant={status.variant} title={status.label} aria-label={status.label}>
                      {status.label === "Em dia" ? (
                        <span className="inline-flex items-center">
                          <Icon name="check" className="h-4 w-4" />
                          <span className="sr-only">Em dia</span>
                        </span>
                      ) : (
                        status.label
                      )}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Mês</span>
                      <span>
                        {formatBRL(row.contributed_this_month)} / {formatBRL(row.suggested_this_month)}
                      </span>
                    </div>
                    <Progress className="mt-2" value={clamp(monthlyProgress, 0, 100)} />

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>Total</span>
                      <span>{formatPercent(Number(percent) || 0)}</span>
                    </div>
                    <Progress value={clamp(Number(percent) || 0, 0, 100)} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl2 border border-slate-200/70 bg-white p-5 text-center">
              <div className="text-slate-900 font-medium">Nenhuma meta no plano do mês</div>
              <div className="mt-1 text-sm text-slate-600">Ative a flag “Plano do mês” em uma meta para ela entrar no cálculo.</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
