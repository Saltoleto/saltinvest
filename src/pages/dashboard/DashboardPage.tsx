import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import Button from "@/ui/primitives/Button";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent } from "@/lib/format";
import { getEquitySummary, getFgcExposure, getTodayInsights, upsertTodayInsights, countInvestmentsThisMonth } from "@/services/analytics";
import { listGoalsEvolution } from "@/services/goals";
import { listInvestments } from "@/services/investments";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useToast } from "@/ui/feedback/Toast";
import { Icon } from "@/ui/layout/icons";

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{subtitle}</div>
    </Card>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-100 font-semibold">{title}</div>
      {right}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl2 border border-white/10 bg-white/5 p-5 text-center">
      <div className="text-slate-100 font-medium">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
    </div>
  );
}

export default function DashboardPage() {
  const toast = useToast();

  const equity = useAsync(() => getEquitySummary(), []);
  const goals = useAsync(() => listGoalsEvolution(), []);
  const fgc = useAsync(() => getFgcExposure(), []);
  const invs = useAsync(() => listInvestments(), []);
  const insights = useAsync(() => getTodayInsights(), []);

  const allocationsByClass = React.useMemo(() => {
    const rows = invs.data ?? [];
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.is_redeemed) continue;
      const key = r.class_name || "Sem classe";
      map.set(key, (map.get(key) ?? 0) + (Number(r.total_value) || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [invs.data]);

  const allocationsByLiquidity = React.useMemo(() => {
    const rows = invs.data ?? [];
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.is_redeemed) continue;
      const key = r.liquidity_type === "diaria" ? "Diária" : r.liquidity_type === "vencimento" ? "No vencimento" : "—";
      map.set(key, (map.get(key) ?? 0) + (Number(r.total_value) || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [invs.data]);

  const totalEquity = Number(equity.data?.total_equity ?? 0);
  const liquidEquity = Number(equity.data?.liquid_equity ?? 0);
  const fgcTotal = Number(equity.data?.fgc_protected_total ?? 0);

  const goalRows = goals.data ?? [];

  async function generateInsights() {
    try {
      const monthlyCount = await countInvestmentsThisMonth();
      const topGoal = [...goalRows].sort((a, b) => b.percent_progress - a.percent_progress)[0];

      const cards: Array<{ type: string; text: string }> = [];

      if (monthlyCount === 0) {
        cards.push({ type: "nudge", text: "Você ainda não registrou investimentos neste mês. Um pequeno aporte agora mantém o plano em movimento." });
      } else {
        cards.push({ type: "streak", text: `Você registrou ${monthlyCount} investimento(s) este mês. Continue mantendo consistência.` });
      }

      if (topGoal) {
        cards.push({ type: "goal", text: `Meta em destaque: “${topGoal.name}” está em ${topGoal.percent_progress.toFixed(1)}%. Pequenos aportes frequentes reduzem o risco de atraso.` });
      }

      const liquidPct = totalEquity > 0 ? (liquidEquity / totalEquity) * 100 : 0;
      if (liquidPct < 10 && totalEquity > 0) {
        cards.push({ type: "risk", text: "Sua liquidez está baixa. Considere reforçar sua reserva para aumentar flexibilidade." });
      }

      await upsertTodayInsights(cards);
      toast.push({ title: "Insights atualizados", tone: "success" });
      insights.reload();
    } catch (e: any) {
      toast.push({ title: "Não foi possível gerar insights", message: e?.message ?? "Erro", tone: "danger" });
    }
  }

  return (
    <div className="grid gap-4 lg:gap-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Patrimônio" value={formatBRL(totalEquity)} subtitle="Soma dos ativos não resgatados" />
        <StatCard title="Liquidez diária" value={formatBRL(liquidEquity)} subtitle="Disponível sem esperar vencimento" />
        <StatCard title="Proteção FGC" value={formatBRL(fgcTotal)} subtitle="Montante marcado como coberto" />
      </div>

      {/* Insights */}
      <Card className="p-4">
        <SectionHeader
          title="Insights do dia"
          right={
            <Button variant="secondary" onClick={() => void generateInsights()}>
              <Icon name="spark" className="h-4 w-4" />
              Gerar
            </Button>
          }
        />
        <div className="mt-3">
          {insights.loading ? (
            <div className="text-sm text-slate-400">Carregando insights...</div>
          ) : (insights.data ?? []).length ? (
            <div className="grid gap-2">
              {(insights.data ?? []).map((it: any, idx: number) => (
                <div key={idx} className="rounded-xl2 border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  {it.text ?? String(it)}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem insights ainda" subtitle="Clique em “Gerar” para criar recomendações rápidas baseadas nos seus dados." />
          )}
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionHeader title="Concentração por classe" />
          <div className="mt-3 h-[260px]">
            {allocationsByClass.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={allocationsByClass} cx="50%" cy="50%" innerRadius={62} outerRadius={100} paddingAngle={3}>
                    {allocationsByClass.map((_, i) => (
                      <Cell key={i} fill={["#22c55e","#60a5fa","#fbbf24","#a78bfa","#f472b6","#fb7185","#34d399","#38bdf8"][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem dados" subtitle="Cadastre investimentos e associe classes para ver a concentração." />
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {allocationsByClass.slice(0, 4).map((x) => (
              <div key={x.name} className="flex items-center justify-between text-sm">
                <div className="text-slate-200">{x.name}</div>
                <div className="text-slate-300">{formatBRL(x.value)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title="Concentração por liquidez" />
          <div className="mt-3 h-[260px]">
            {allocationsByLiquidity.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={allocationsByLiquidity} cx="50%" cy="50%" innerRadius={62} outerRadius={100} paddingAngle={3}>
                    {allocationsByLiquidity.map((_, i) => (
                      <Cell key={i} fill={["#60a5fa","#22c55e","#fbbf24","#a78bfa"][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatBRL(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem dados" subtitle="Cadastre investimentos com tipo de liquidez." />
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {allocationsByLiquidity.map((x) => (
              <div key={x.name} className="flex items-center justify-between text-sm">
                <div className="text-slate-200">{x.name}</div>
                <div className="text-slate-300">{formatBRL(x.value)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Goals */}
      <Card className="p-4">
        <SectionHeader title="Progresso das metas" />
        <div className="mt-3 grid gap-3">
          {goals.loading ? (
            <div className="text-sm text-slate-400">Carregando metas...</div>
          ) : goalRows.length ? (
            goalRows.map((g) => (
              <div key={g.goal_id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-slate-100 font-medium">{g.name}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {formatBRL(g.current_contributed)} de {formatBRL(g.target_value)} • {g.days_remaining} dia(s) restantes
                    </div>
                  </div>
                  <Badge variant={g.percent_progress >= 100 ? "success" : g.is_monthly_plan ? "info" : "neutral"}>
                    {g.percent_progress >= 100 ? "Concluída" : g.is_monthly_plan ? "No plano" : "Fora do plano"}
                  </Badge>
                </div>
                <div className="mt-3">
                  <Progress value={Number(g.percent_progress) || 0} />
                  <div className="mt-2 text-xs text-slate-400">{formatPercent(Number(g.percent_progress) || 0)}</div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Nenhuma meta cadastrada" subtitle="Crie metas para acompanhar evolução e planejar aportes." />
          )}
        </div>
      </Card>

      {/* FGC */}
      <Card className="p-4">
        <SectionHeader title="Exposição ao FGC por instituição" />
        <div className="mt-3 overflow-auto">
          {fgc.loading ? (
            <div className="text-sm text-slate-400">Carregando...</div>
          ) : (fgc.data ?? []).length ? (
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 font-medium">Instituição</th>
                  <th className="text-right py-2 px-2 font-medium">Coberto</th>
                  <th className="text-right py-2 px-2 font-medium">Não coberto</th>
                  <th className="text-right py-2 pl-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(fgc.data ?? []).map((r) => (
                  <tr key={r.institution_name} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-slate-200">{r.institution_name}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{formatBRL(Number(r.covered_amount ?? 0))}</td>
                    <td className="py-2 px-2 text-right text-slate-300">{formatBRL(Number(r.uncovered_amount ?? 0))}</td>
                    <td className="py-2 pl-2 text-right text-slate-100 font-medium">{formatBRL(Number(r.total_in_institution ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Sem investimentos em instituições" subtitle="Vincule investimentos a instituições e marque cobertura FGC quando aplicável." />
          )}
        </div>
      </Card>
    </div>
  );
}
