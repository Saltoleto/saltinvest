import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import { Icon } from "@/ui/layout/icons";
import Skeleton from "@/ui/primitives/Skeleton";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent } from "@/lib/format";
import { getEquitySummary } from "@/services/analytics";
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
      <div className="text-slate-900 font-semibold">{title}</div>

      {total ? (
        <>
          <div className="mt-3 grid gap-2">
            {a ? (
              <div className="rounded-xl2 border border-slate-200/70 bg-white px-3 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentA}`} />
                  <span className="text-slate-800 text-sm font-medium truncate">{labelA ?? a.name}</span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="text-slate-900 font-semibold">{formatPercent(aPct)}</span>
                  <span className="text-slate-700 text-sm">{formatBRL(a.value)}</span>
                </div>
              </div>
            ) : null}

            {b ? (
              <div className="rounded-xl2 border border-slate-200/70 bg-white px-3 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentB}`} />
                  <span className="text-slate-800 text-sm font-medium truncate">{labelB ?? b.name}</span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="text-slate-900 font-semibold">{formatPercent(bPct)}</span>
                  <span className="text-slate-700 text-sm">{formatBRL(b.value)}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 h-2 rounded-full bg-slate-50 overflow-hidden flex">
            <div className={accentA} style={{ width: `${aPct}%` }} />
            <div className={accentB} style={{ width: `${bPct}%` }} />
            <div className="bg-slate-50" style={{ width: `${restPct}%` }} />
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
      <div className="text-xs text-slate-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-600">{subtitle}</div>
    </Card>
  );
}

function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-900 font-semibold">{title}</div>
      {right}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl2 border border-slate-200/70 bg-white p-5 text-center">
      <div className="text-slate-900 font-medium">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
    </div>
  );
}

export default function DashboardPage() {

  // Default collapsed for faster perceived load + less visual noise.
  const [goalsCollapsed, setGoalsCollapsed] = React.useState(true);

  const equity = useAsync(() => getEquitySummary(), []);
  const goals = useAsync(() => listGoalsEvolution(), []);
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

  const allocationsByInstitution = React.useMemo(() => {
    const rows = invs.data ?? [];
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.is_redeemed) continue;
      const key = r.institution_name || "—";
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
        {equity.loading ? (
          <Card className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-40" />
            <Skeleton className="mt-3 h-4 w-48" />
          </Card>
        ) : (
          <StatCard title="Patrimônio" value={formatBRL(totalEquity)} subtitle="Soma dos ativos não resgatados" />
        )}

        {equity.loading ? (
          <Card className="p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-4 w-52" />
          </Card>
        ) : (
          <StatCard title="Liquidez diária" value={formatBRL(liquidEquity)} subtitle="Disponível sem esperar vencimento" />
        )}

        {equity.loading ? (
          <Card className="p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-4 w-44" />
          </Card>
        ) : (
          <StatCard title="Proteção FGC" value={formatBRL(fgcTotal)} subtitle="Montante marcado como coberto" />
        )}
      </div>

      {/* Concentração (cards premium, sem gráficos pesados) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {invs.loading ? (
          <Card className="p-4">
            <Skeleton className="h-4 w-44" />
            <div className="mt-3 grid gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="mt-3 h-2 w-full" />
          </Card>
        ) : (
          <ConcentrationCard title="Concentração por classe" items={allocationsByClass} accentA="bg-sky-400" accentB="bg-emerald-400" />
        )}

        {invs.loading ? (
          <Card className="p-4">
            <Skeleton className="h-4 w-48" />
            <div className="mt-3 grid gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="mt-3 h-2 w-full" />
          </Card>
        ) : (
          <ConcentrationCard title="Concentração por liquidez" items={allocationsByLiquidity} accentA="bg-sky-400" accentB="bg-amber-400" />
        )}

        {invs.loading ? (
          <Card className="p-4">
            <Skeleton className="h-4 w-52" />
            <div className="mt-3 grid gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="mt-3 h-2 w-full" />
          </Card>
        ) : (
          <ConcentrationCard title="Concentração por instituição" items={allocationsByInstitution} accentA="bg-sky-400" accentB="bg-violet-400" />
        )}
      </div>

      {/* Goals (last) */}
      <Card className="p-4">
        <SectionHeader
          title="Progresso das metas"
          right={
            <button
              type="button"
              onClick={() => setGoalsCollapsed((v) => !v)}
              className="rounded-xl2 border border-slate-200/70 bg-white p-2 text-sky-700 hover:bg-slate-50 transition"
              aria-label={goalsCollapsed ? "Expandir" : "Recolher"}
            >
              {goalsCollapsed ? <Icon name="chevronDown" className="h-5 w-5" /> : <Icon name="chevronUp" className="h-5 w-5" />}
            </button>
          }
        />

        {goalsCollapsed ? null : (
          <div className="mt-3 grid gap-3">
            {goals.loading ? (
              <>
                <div className="rounded-xl2 border border-slate-200/70 bg-white p-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-4 w-64" />
                  <Skeleton className="mt-4 h-2 w-full" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
                <div className="rounded-xl2 border border-slate-200/70 bg-white p-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-2 h-4 w-56" />
                  <Skeleton className="mt-4 h-2 w-full" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
              </>
            ) : goalRows.length ? (
              goalRows.map((g) => (
                <div key={g.goal_id} className="rounded-xl2 border border-slate-200/70 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-slate-900 font-medium">{g.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatBRL(g.current_contributed)} de {formatBRL(g.target_value)} • {g.days_remaining} dia(s) restantes
                      </div>
                    </div>
                    <Badge variant={g.percent_progress >= 100 ? "success" : g.is_monthly_plan ? "info" : "neutral"}>
                      {g.percent_progress >= 100 ? "Concluída" : g.is_monthly_plan ? (
                        <span className="inline-flex items-center" title="No plano" aria-label="No plano">
                          <Icon name="spark" className="h-4 w-4" />
                          <span className="sr-only">No plano</span>
                        </span>
                      ) : "Fora do plano"}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Progress value={Number(g.percent_progress) || 0} />
                    <div className="mt-2 text-xs text-slate-600">{formatPercent(Number(g.percent_progress) || 0)}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Nenhuma meta cadastrada" subtitle="Crie metas para acompanhar evolução e planejar aportes." />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
