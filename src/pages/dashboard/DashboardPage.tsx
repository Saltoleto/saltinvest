import React from "react";
import { Link } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Button from "@/ui/primitives/Button";
import { Icon } from "@/ui/layout/icons";
import Skeleton from "@/ui/primitives/Skeleton";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent } from "@/lib/format";
import { getEquitySummary } from "@/services/analytics";
import { listInvestments } from "@/services/investments";
import { listYearGoalProjections, type YearGoalProjectionRow, type YearTotals } from "@/services/yearly";

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
  const [collapsed, setCollapsed] = React.useState(false);
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
          <span className="block text-slate-100 font-semibold leading-snug break-words pr-1">
            {title}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-xl2 border border-white/10 bg-white/5 p-2 text-sky-200 hover:bg-white/10 transition"
          aria-label={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? <Icon name="chevronDown" className="h-5 w-5" /> : <Icon name="chevronUp" className="h-5 w-5" />}
        </button>
      </div>

      {collapsed ? null : total ? (
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
        <div className="mt-3">
          <EmptyState title="Sem dados" subtitle="Cadastre investimentos para ver a concentração." />
        </div>
      )}
    </Card>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card className="p-4 relative overflow-hidden">
      {/* subtle top accent for premium hierarchy */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-400/40 via-emerald-400/30 to-violet-400/30" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100 tracking-tight">{value}</div>
        </div>
        <div className="shrink-0 rounded-xl2 border border-white/10 bg-white/5 p-2">
          {/* icon is inferred from title (keeps callsites unchanged) */}
          {title === "Patrimônio" ? (
            <Icon name="wallet" className="h-5 w-5 text-sky-200" />
          ) : title === "Liquidez diária" ? (
            <Icon name="droplet" className="h-5 w-5 text-emerald-200" />
          ) : (
            <Icon name="shield" className="h-5 w-5 text-violet-200" />
          )}
        </div>
      </div>

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

function YearGoalsProjectionCard({
  rows,
  totals,
  loading,
  year,
  onYearChange
}: {
  rows: YearGoalProjectionRow[];
  totals: YearTotals;
  loading: boolean;
  year: number;
  onYearChange: (year: number) => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  const safeRows = Array.isArray(rows) ? rows : [];

  const yearOptions = React.useMemo(() => {
    const nowY = new Date().getFullYear();
    return [nowY, nowY - 1, nowY - 2, nowY - 3, nowY - 4];
  }, []);

  const top = React.useMemo(() => {
    // Mostra as metas mais relevantes pelo impacto da projeção
    return [...safeRows]
      .sort((a, b) => (b.proj_add || 0) - (a.proj_add || 0))
      .slice(0, 5);
  }, [safeRows]);

  return (
    <Card className="p-4">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="min-w-0 text-left"
          aria-label={collapsed ? "Expandir evolução anual" : "Recolher evolução anual"}
        >
          <div className="text-slate-100 font-semibold">Evolução anual das metas</div>
          <div className="mt-1 text-sm text-slate-400">
            {loading
              ? "Calculando..."
              : `Em ${year}: ${formatBRL(totals.ytd)} até agora • Projeção: ${formatBRL(totals.projected)} (${formatBRL(
                  totals.projAdd
                )} a mais)`}
          </div>
        </button>

        <div className="shrink-0 flex items-center gap-2">
          {/* Seletor de ano (mobile/web). */}
          <label className="flex items-center gap-2 rounded-xl2 border border-white/10 bg-white/5 px-2.5 h-9">
            <span className="hidden sm:inline text-xs text-slate-400">Ano</span>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="bg-transparent text-sm text-slate-100 outline-none"
              aria-label="Selecionar ano"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>


          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-xl2 border border-white/10 bg-white/5 p-2 text-sky-200 hover:bg-white/10 transition"
            aria-label={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <Icon name="chevronDown" className="h-5 w-5" /> : <Icon name="chevronUp" className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <>
          {loading ? (
            <div className="mt-4 grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : safeRows.length ? (
            <div className="mt-4 grid gap-3">
              {/* Totais: barra premium */}
              <div className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-400">Avanço no ano</div>
                  <Badge variant="info">Projeção até Dez</Badge>
                </div>
                <div className="mt-3 h-3 rounded-full bg-white/10 overflow-hidden flex">
                  {/* já realizado */}
                  <div className="bg-sky-400" style={{ width: `${Math.min(100, (totals.ytd / Math.max(1, totals.projected)) * 100)}%` }} />
                  {/* projeção */}
                  <div className="bg-emerald-400/70" style={{ width: `${Math.max(0, 100 - Math.min(100, (totals.ytd / Math.max(1, totals.projected)) * 100))}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="text-slate-300">{formatBRL(totals.ytd)} realizado</div>
                  <div className="text-slate-300">{formatBRL(totals.projected)} projetado</div>
                </div>
              </div>

              {/* Destaques por meta */}
              <div className="grid gap-2">
                {top.map((g) => {
                  const target = Math.max(0, Number(g.target_value) || 0);
                  const ytd = Math.max(0, Number(g.ytd) || 0);
                  const proj = Math.max(ytd, Number(g.projected) || 0);
                  const ytdPct = target > 0 ? Math.min(100, (ytd / target) * 100) : 0;
                  const projPct = target > 0 ? Math.min(100, (proj / target) * 100) : 0;

                  return (
                    <div key={g.goal_id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-slate-100 font-medium truncate">{g.name}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {formatBRL(ytd)} agora • {formatBRL(proj)} até Dez • alvo {formatBRL(target)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-slate-100 font-semibold">{formatPercent(ytdPct)}</div>
                          <div className="text-xs text-slate-400">→ {formatPercent(projPct)}</div>
                        </div>
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full flex">
                          <div className="bg-sky-400" style={{ width: `${ytdPct}%` }} />
                          <div className="bg-emerald-400/70" style={{ width: `${Math.max(0, projPct - ytdPct)}%` }} />
                        </div>
                      </div>

                      {g.proj_add > 0 ? (
                        <div className="mt-2 text-xs text-slate-400">
                          Mantendo o plano: +{formatBRL(g.proj_add)} até o fim do ano
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-slate-500">Sem projeção para o restante do ano (fora do plano mensal).</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-slate-500">
                Projeção baseada nos valores planejados do Plano do mês até Dezembro.
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState title="Sem metas" subtitle="Cadastre metas e/ou ative a opção de plano mensal para ver projeções." />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const equity = useAsync(() => getEquitySummary(), []);
  const [selectedYear, setSelectedYear] = React.useState(() => new Date().getFullYear());
  const yearGoals = useAsync(() => listYearGoalProjections(selectedYear), [selectedYear]);
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

      {/* Nova entrega de alto valor: visão de avanço anual + projeção */}
      <YearGoalsProjectionCard
        year={selectedYear}
        onYearChange={setSelectedYear}
        totals={yearGoals.data?.totals ?? { year: selectedYear, ytd: 0, projected: 0, projAdd: 0 }}
        rows={yearGoals.data?.goals ?? []}
        loading={yearGoals.loading}
      />
    </div>
  );
}
