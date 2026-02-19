import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent } from "@/lib/format";
import { getEquitySummary, getFgcExposure } from "@/services/analytics";
import { listGoalsEvolution } from "@/services/goals";
import { listInvestments } from "@/services/investments";

function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

function ConcentrationCard({
  title,
  items,
  accentA,
  accentB,
  labelA,
  labelB
}: {
  title: string;
  items: { name: string; value: number }[];
  accentA: string;
  accentB: string;
  labelA?: string;
  labelB?: string;
}) {
  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const top = items.slice(0, 2);
  const a = top[0];
  const b = top[1];
  const aPct = pct(a?.value ?? 0, total);
  const bPct = pct(b?.value ?? 0, total);
  const restPct = Math.max(0, 100 - aPct - bPct);

  return (
    <Card className="p-4">
      <div className="text-slate-100 font-semibold">{title}</div>

      {total ? (
        <>
          <div className="mt-3 grid gap-2">
            {a ? (
              <div className="rounded-xl2 border border-white/10 bg-white/5 px-3 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentA}`} />
                  <span className="text-slate-200 text-sm font-medium truncate">{labelA ?? a.name}</span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="text-slate-100 font-semibold">{formatPercent(aPct)}</span>
                  <span className="text-slate-300 text-sm">{formatBRL(a.value)}</span>
                </div>
              </div>
            ) : null}

            {b ? (
              <div className="rounded-xl2 border border-white/10 bg-white/5 px-3 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentB}`} />
                  <span className="text-slate-200 text-sm font-medium truncate">{labelB ?? b.name}</span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="text-slate-100 font-semibold">{formatPercent(bPct)}</span>
                  <span className="text-slate-300 text-sm">{formatBRL(b.value)}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div className={accentA} style={{ width: `${aPct}%` }} />
            <div className={accentB} style={{ width: `${bPct}%` }} />
            <div className="bg-white/10" style={{ width: `${restPct}%` }} />
          </div>
        </>
      ) : (
        <EmptyState title="Sem dados" subtitle="Cadastre investimentos para ver a concentração." />
      )}
    </Card>
  );
}

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

  const [goalsCollapsed, setGoalsCollapsed] = React.useState(false);

  const equity = useAsync(() => getEquitySummary(), []);
  const goals = useAsync(() => listGoalsEvolution(), []);
  const fgc = useAsync(() => getFgcExposure(), []);
  const invs = useAsync(() => listInvestments(), []);

  const allocationsByClass = React.useMemo(() => {
    const rows = invs.data ?? [];
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.is_redeemed) continue;
      const key = r.class_name || "—";
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

  return (
    <div className="grid gap-4 lg:gap-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Patrimônio" value={formatBRL(totalEquity)} subtitle="Soma dos ativos não resgatados" />
        <StatCard title="Liquidez diária" value={formatBRL(liquidEquity)} subtitle="Disponível sem esperar vencimento" />
        <StatCard title="Proteção FGC" value={formatBRL(fgcTotal)} subtitle="Montante marcado como coberto" />
      </div>

      {/* Goals */}
      <Card className="p-4">
        <SectionHeader
          title="Progresso das metas"
          right={
            <button
              type="button"
              onClick={() => setGoalsCollapsed((v) => !v)}
              className="text-sm text-sky-300 hover:text-sky-200"
            >
              {goalsCollapsed ? "Expandir" : "Recolher"}
            </button>
          }
        />

        {goalsCollapsed ? null : (
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
        )}
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

      {/* Concentração (cards premium, sem gráficos pesados) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConcentrationCard
          title="Concentração por classe"
          items={allocationsByClass}
          accentA="bg-sky-400"
          accentB="bg-emerald-400"
        />
        <ConcentrationCard
          title="Concentração por liquidez"
          items={allocationsByLiquidity}
          accentA="bg-sky-400"
          accentB="bg-amber-400"
        />
      </div>
    </div>
  );
}
