import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import { Icon } from "@/ui/layout/icons";
import Skeleton from "@/ui/primitives/Skeleton";
import Progress from "@/ui/primitives/Progress";
import BottomSheet from "@/ui/primitives/BottomSheet";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent, formatDateBR } from "@/lib/format";
import { getEquitySummary } from "@/services/analytics";
import { listInvestments } from "@/services/investments";
import { getMonthlyPlanSummary, listMonthlyPlanGoals } from "@/services/monthly";
import { listYearGoalProjections } from "@/services/yearly";

function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}


function addMonths(base: Date, months: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + months, 1);
}

function monthIsoStart(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function monthLabelShort(d: Date): string {
  const labels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${labels[d.getMonth()]}`
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
  // Collapsed by default for a cleaner premium dashboard.
  const [collapsed, setCollapsed] = React.useState(true);
  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const top = items.slice(0, 2);
  const a = top[0];
  const b = top[1];
  const aPct = pct(a?.value ?? 0, total);
  const bPct = pct(b?.value ?? 0, total);
  const restPct = Math.max(0, 100 - aPct - bPct);

  return (
    <Card className="p-4">
      {/* Header: título clicável + ícone sempre bem alinhado (web/mobile). */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="min-w-0 text-left"
          aria-label={collapsed ? `Expandir ${title}` : `Recolher ${title}`}
        >
          <span className="block text-slate-900 font-semibold leading-snug break-words pr-1">
            {title}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-xl2 border border-slate-200 bg-white p-2 text-blue-600 hover:bg-slate-100 transition"
          aria-label={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <Icon name="chevronDown" className="h-5 w-5" /> : <Icon name="chevronUp" className="h-5 w-5" />}
        </button>
      </div>

      {collapsed ? null : total ? (
        <>
          <div className="mt-3 grid gap-2">
            {a ? (
              <div className="rounded-xl2 border border-slate-200 bg-white px-3 py-3 flex items-center justify-between gap-3">
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
              <div className="rounded-xl2 border border-slate-200 bg-white px-3 py-3 flex items-center justify-between gap-3">
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

          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden flex">
            <div className={accentA} style={{ width: `${aPct}%` }} />
            <div className={accentB} style={{ width: `${bPct}%` }} />
            <div className="bg-slate-100" style={{ width: `${restPct}%` }} />
          </div>
        </>
      ) : (
        <div className="mt-3">
          <div className="rounded-xl2 border border-slate-200 bg-white p-5 text-center">
            <div className="text-slate-900 font-medium">Sem dados</div>
            <div className="mt-1 text-sm text-slate-600">Cadastre investimentos para ver a concentração.</div>
            <div className="mt-3 flex justify-center">
              <a href="/app/investments?modal=new" className="rounded-xl2 border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-100 transition">Cadastrar investimento</a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function StatCard({ title, value, subtitle, badge }: { title: string; value: string; subtitle: string; badge?: string }) {
  const tone =
    title === "Patrimônio"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : title === "Liquidez diária"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-violet-50 text-violet-700 border-violet-200";

  return (
    <Card className="p-4 relative overflow-hidden">
      {/* subtle top accent for premium hierarchy */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-400/40 via-emerald-400/30 to-violet-400/30" />

      <div className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0 sm:flex-1">
          <div className="text-xs text-slate-600">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
        </div>
        <div className={"shrink-0 rounded-xl2 border p-2 " + tone}>
          {/* icon is inferred from title (keeps callsites unchanged) */}
          {title === "Patrimônio" ? (
            <Icon name="wallet" className="h-5 w-5" />
          ) : title === "Liquidez diária" ? (
            <Icon name="droplet" className="h-5 w-5" />
          ) : (
            <Icon name="shield" className="h-5 w-5" />
          )}
        </div>
      </div>

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
    <div className="rounded-xl2 border border-slate-200 bg-white p-5 text-center">
      <div className="text-slate-900 font-medium">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
    </div>
  );
}


function MiniStatPill({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl2 border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] text-slate-600">{title}</div>
      <div className="mt-0.5 text-slate-900 font-semibold">{value}</div>
    </div>
  );
}

function MonthlySummaryCard({
  summary,
  loading,
  onContribute,
  onOpenPlan,
  lastUpdatedLabel,
  badge
}: {
  summary: { total_suggested_this_month: number; total_contributed_this_month: number; total_remaining_this_month: number } | null;
  loading: boolean;
  onContribute: () => void;
  onOpenPlan: () => void;
  lastUpdatedLabel?: string;
  badge?: string;
}) {
  const suggested = Number(summary?.total_suggested_this_month ?? 0);
  const contributed = Number(summary?.total_contributed_this_month ?? 0);
  const remaining = Number(summary?.total_remaining_this_month ?? Math.max(0, suggested - contributed));

  
  const monthSummaryTitle = React.useMemo(() => {
    // Ex.: "Resumo fev" (sempre 3 letras do mês atual)
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const m = new Date().getMonth();
    return `Resumo ${months[m] ?? ""}`;
  }, []);

return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400/30 via-sky-400/35 to-violet-400/25" />
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-slate-900 font-semibold">{monthSummaryTitle}</div>
            {badge ? (
              <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {badge}
              </span>
            ) : null}
          </div>
          <div className="mt-1 hidden sm:block text-sm text-slate-600">
            {lastUpdatedLabel ? `Atualizado ${lastUpdatedLabel}` : " "}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-2 w-full sm:w-auto">
          <Button onClick={onContribute} size="sm" className="w-full justify-center sm:w-auto">
            Aportar agora
          </Button>
          <button
            type="button"
            onClick={onOpenPlan}
            className="w-full sm:w-auto rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 transition text-center"
          >
            Ver plano
          </button>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (
          <>
            <MiniStatPill title="Sugerido do mês" value={formatBRL(suggested)} />
            <MiniStatPill title="Aportado no mês" value={formatBRL(contributed)} />
            <MiniStatPill title="Restante do mês" value={formatBRL(remaining)} />
          </>
        )}
      </div>
    </Card>
  );
}

function YearGoalsProjectionCard({
  rows,
  loading,
  year,
  onYearChange
}: {
  rows: {
    goal_id: string;
    name: string;
    target_value: number;
    target_date?: string;
    ytd: number;
    proj_add: number;
    projected: number;
    ytd_pct: number;
    projected_pct: number;
  }[];
  loading: boolean;
  year: number;
  onYearChange?: (year: number) => void;
}) {
  const navigate = useNavigate();

  // Defensive: in some integrations the service may return an object before normalization.
  const safeRows = React.useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  const totals = React.useMemo(() => {
    const ytd = safeRows.reduce((s, r) => s + (Number(r.ytd) || 0), 0);
    const projAdd = safeRows.reduce((s, r) => s + (Number(r.proj_add) || 0), 0);
    return { ytd, projAdd, projected: ytd + projAdd };
  }, [safeRows]);

  // "Ritmo" aqui é o quanto do realizado representa dentro do total projetado do plano anual (realizado + restante até Dez).
  const yearPct = React.useMemo(() => {
    const denom = Math.max(1, totals.projected);
    return Math.min(100, (totals.ytd / denom) * 100);
  }, [totals.ytd, totals.projected]);

  return (
    <Card className="p-4">
      {loading ? (
        <div className="grid gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : safeRows.length ? (
        <div className="rounded-xl2 border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="min-w-0">
              <div className="text-slate-900 font-semibold">Resumo {year}</div>
            </div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Planejado {year}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl2 border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-600">Realizado no ano</div>
              <div className="mt-1 text-slate-900 font-semibold">{formatBRL(totals.ytd)}</div>
            </div>
            <div className="rounded-xl2 border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-600">Falta até Dez (plano)</div>
              <div className="mt-1 text-slate-900 font-semibold">{formatBRL(totals.projAdd)}</div>
            </div>
            <div className="rounded-xl2 border border-slate-200 bg-white p-3">
              <div className="text-[11px] text-slate-600">Ritmo</div>
              <div className="mt-1 inline-flex items-center gap-2">
                <span
                  className={
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                    (totals.projAdd > 0 ? "border-slate-200 bg-white text-slate-800" : "border-emerald-200 bg-emerald-50 text-emerald-900")
                  }
                >
                  {totals.projAdd > 0 ? "Plano aberto" : "Sem pendências"}
                </span>
                <span className="text-sm text-slate-700">{formatPercent(yearPct)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={yearPct} />
            <div className="mt-1 text-xs text-slate-500">Progresso do realizado dentro do plano anual.</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-600">Nenhuma meta encontrada para o resumo anual.</div>
      )}
    </Card>
  );
}

function daysUntil(dateISO: string): number {
  const d = new Date(dateISO);
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const t1 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((t1 - t0) / 86400000);
}

function AlertsCard({
  investments,
  monthlySummary,
  onOpenInvestments,
  onOpenPlan
}: {
  investments: { id: string; name: string; due_date: string | null; liquidity_type: "diaria" | "vencimento"; is_redeemed: boolean; total_value: number; allocated_total?: number }[];
  monthlySummary: { total_remaining_this_month: number } | null;
  onOpenInvestments: () => void;
  onOpenPlan: () => void;
}) {
  const remaining = Number(monthlySummary?.total_remaining_this_month ?? 0);

  const overAllocated = React.useMemo(() => {
    return (investments ?? []).filter((r) => {
      const allocated = Number(r.allocated_total ?? 0);
      const total = Number(r.total_value ?? 0);
      return !r.is_redeemed && allocated > total + 0.0001;
    });
  }, [investments]);

  const upcoming = React.useMemo(() => {
    return (investments ?? [])
      .filter((r) => !r.is_redeemed && r.liquidity_type === "vencimento" && !!r.due_date)
      .map((r) => ({ ...r, days: daysUntil(String(r.due_date)) }))
      .filter((r) => r.days <= 60)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [investments]);

  const has = remaining > 0 || overAllocated.length > 0 || upcoming.length > 0;

  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-400/25 via-sky-400/35 to-emerald-400/25" />

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="min-w-0">
          <div className="text-slate-900 font-semibold">Alertas & próximos passos</div>
          <div className="mt-1 text-sm text-slate-600">Uma visão rápida do que merece sua atenção.</div>
        </div>
        <div className="shrink-0 rounded-xl2 border border-slate-200 bg-white p-2 text-slate-800">
          <Icon name="bell" className="h-5 w-5" />
        </div>
      </div>

      {has ? (
        <div className="mt-4 grid gap-3">
          {remaining > 0 ? (
            <div className="rounded-xl2 border border-slate-200 bg-white p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-slate-900 font-medium">Restante do mês</div>
                <div className="mt-1 text-sm text-slate-700">Ainda faltam <span className="font-semibold">{formatBRL(remaining)}</span> para completar o plano mensal.</div>
              </div>
              <Button variant="secondary" onClick={onOpenPlan} className="h-9 px-3 shrink-0">
                Ver plano
              </Button>
            </div>
          ) : null}

          {overAllocated.length ? (
            <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-slate-900 font-medium">Alocações acima do total</div>
                <div className="mt-1 text-sm text-red-900">{overAllocated.length} investimento(s) com alocação maior que o valor total.</div>
              </div>
              <Button variant="ghost" onClick={onOpenInvestments} className="h-9 px-3 text-rose-700 hover:bg-rose-50 shrink-0">
                Revisar
              </Button>
            </div>
          ) : null}

          {upcoming.length ? (
            <div className="rounded-xl2 border border-slate-200 bg-white p-4">
              <div className="text-slate-900 font-medium">Próximos vencimentos</div>
              <div className="mt-2 grid gap-2">
                {upcoming.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl2 border border-slate-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-slate-800 text-sm font-medium truncate">{r.name}</div>
                      <div className="text-xs text-slate-600">Vence em {formatDateBR(r.due_date)}</div>
                    </div>
                    <span className={
                      "shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                      (r.days <= 7
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : r.days <= 30
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-800")
                    }>
                      {r.days <= 0 ? "Hoje" : `${r.days}d`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="secondary" onClick={onOpenInvestments} className="h-9 px-3">
                  Ver investimentos
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-xl2 border border-slate-200 bg-white p-6 text-center">
          <div className="text-slate-900 font-medium">Tudo certo por aqui</div>
          <div className="mt-1 text-sm text-slate-600">Sem alertas relevantes no momento.</div>
        </div>
      )}
    </Card>
  );
}


function CapacityFulfillmentChart6m({ year }: { year: number }) {
  const currentYear = new Date().getFullYear();
  const months = React.useMemo(() => {
    const base = year === currentYear ? new Date(currentYear, new Date().getMonth(), 1) : new Date(year, 0, 1);
    return Array.from({ length: 6 }, (_, i) => addMonths(base, i));
  }, [year, currentYear]);

  const data = useAsync(async () => {
    const rows = await Promise.all(
      months.map(async (d) => {
        const monthISO = monthIsoStart(d);
        const goals = await listMonthlyPlanGoals(monthISO);
        const suggested = goals.reduce((s, g) => s + Number(g.suggested_this_month ?? 0), 0);
        const contributed = goals.reduce((s, g) => s + Number(g.contributed_this_month ?? 0), 0);
        const remaining = Math.max(0, suggested - contributed);
        return {
          monthISO,
          label: monthLabelShort(d),
          suggested,
          contributed,
          remaining,
          coveragePct: suggested > 0 ? Math.min(100, (contributed / suggested) * 100) : 0
        };
      })
    );
    return rows;
  }, [year, months]);

  const rows = Array.isArray(data.data) ? data.data : [];
  const maxValue = Math.max(1, ...rows.map((r) => Math.max(r.suggested, r.contributed)));

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-slate-900 font-semibold">Capacidade de cumprimento (6 meses)</div>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              Planejado {year}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-600">Comparativo mensal entre sugerido, aportado e faltante do plano.</div>
        </div>
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          6m
        </span>
      </div>

      {data.loading ? (
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !rows.length ? (
        <div className="mt-4 rounded-xl2 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Sem metas no plano mensal para exibir a capacidade dos próximos meses.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.monthISO} className="rounded-xl2 border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-900 uppercase">{r.label}</div>
                <div className="text-xs text-slate-600">{formatPercent(r.coveragePct)}</div>
              </div>

              <div className="mt-2 grid gap-1.5">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Sugerido</span>
                    <span>{formatBRL(r.suggested)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-slate-300" style={{ width: `${(r.suggested / maxValue) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Aportado</span>
                    <span>{formatBRL(r.contributed)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(r.contributed / maxValue) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Gap</span>
                    <span>{formatBRL(r.remaining)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(r.remaining / maxValue) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
            <div className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />Sugerido</div>
            <div className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Aportado</div>
            <div className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Gap</div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const equity = useAsync(() => getEquitySummary(), []);
  const monthly = useAsync(() => getMonthlyPlanSummary(), []);
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const yearGoals = useAsync(() => listYearGoalProjections(selectedYear), [selectedYear]);
  const invs = useAsync(() => listInvestments(), []);

  const totalEquity = Number(equity.data?.total_equity ?? 0);

const now = new Date();
const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

React.useEffect(() => {
  // Marca como "atualizado agora" quando os principais blocos terminarem de carregar.
  if (!equity.loading && !monthly.loading && !invs.loading && !yearGoals.loading) {
    setUpdatedAt(new Date());
  }
}, [equity.loading, monthly.loading, invs.loading, yearGoals.loading]);

const lastUpdatedLabel = React.useMemo(() => {
  if (!updatedAt) return "";
  const diffMs = Date.now() - updatedAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 0) return "agora";
  if (diffMin === 1) return "há 1 min";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return "há 1 h";
  return `há ${diffH} h`;
}, [updatedAt]);

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-slate-900 font-semibold">Dashboard</div>
            <div className="text-sm text-slate-600">Ano de planejamento aplicado aos cards de análise.</div>
          </div>
          <div className="inline-flex items-center gap-2 self-start sm:self-auto">
            <span className="text-sm text-slate-600">Ano</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              aria-label="Selecionar ano do dashboard"
            >
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
            </select>
          </div>
        </div>
      </Card>
      {/* Patrimônio */}
      <div className="grid grid-cols-1 gap-3">
        {equity.loading ? (
          <Card className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-40" />
            <Skeleton className="mt-3 h-4 w-48" />
          </Card>
        ) : (
          <StatCard title="Patrimônio" value={formatBRL(totalEquity)} subtitle="Soma dos ativos não resgatados" badge="Atual" />
        )}
      </div>

{/* Resumo do mês + CTA */}
<MonthlySummaryCard
  summary={monthly.data}
  loading={monthly.loading}
  lastUpdatedLabel={lastUpdatedLabel}
  badge="Atual"
  onContribute={() => {
    const suggested = Number(monthly.data?.total_suggested_this_month ?? 0);
    const qs = suggested > 0 ? `?modal=new&prefillTotal=${encodeURIComponent(String(suggested))}` : "?modal=new";
    navigate(`/app/investments${qs}`);
  }}
  onOpenPlan={() => navigate("/app/monthly-plan")}
/>

{/* Resumo anual */}
      <YearGoalsProjectionCard
        rows={yearGoals.data?.goals ?? []}
        loading={yearGoals.loading}
        year={selectedYear}
      />

      {/* Nova entrega de alto valor: capacidade de cumprimento dos próximos 6 meses */}
    </div>
  );
}