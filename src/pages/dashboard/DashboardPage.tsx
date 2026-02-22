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
import { getMonthlyPlanSummary } from "@/services/monthly";
import { listYearGoalProjections } from "@/services/yearly";

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

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
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

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
  lastUpdatedLabel
}: {
  summary: { total_suggested_this_month: number; total_contributed_this_month: number; total_remaining_this_month: number } | null;
  loading: boolean;
  onContribute: () => void;
  onOpenPlan: () => void;
  lastUpdatedLabel?: string;
}) {
  const suggested = Number(summary?.total_suggested_this_month ?? 0);
  const contributed = Number(summary?.total_contributed_this_month ?? 0);
  const remaining = Number(summary?.total_remaining_this_month ?? Math.max(0, suggested - contributed));

  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400/30 via-sky-400/35 to-violet-400/25" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-slate-900 font-semibold">Resumo do mês</div>
          <div className="mt-1 text-sm text-slate-600">
            {lastUpdatedLabel ? `Atualizado ${lastUpdatedLabel}` : " "}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Button onClick={onContribute} size="sm">
            Aportar agora
          </Button>
          <button
            type="button"
            onClick={onOpenPlan}
            className="rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 transition"
          >
            Ver plano
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
  loading
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
}) {
  const navigate = useNavigate();
  const now = new Date();
  const year = now.getFullYear();
  const [collapsed, setCollapsed] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [prioritiesExpanded, setPrioritiesExpanded] = React.useState(false);

  const [selectedGoalId, setSelectedGoalId] = React.useState<string | null>(null);
  const [sheetTab, setSheetTab] = React.useState<"resumo" | "plano">("resumo");

  // Defensive: in some integrations the service may return an object before normalization.
  const safeRows = React.useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  const totals = React.useMemo(() => {
    const ytd = safeRows.reduce((s, r) => s + (Number(r.ytd) || 0), 0);
    const projAdd = safeRows.reduce((s, r) => s + (Number(r.proj_add) || 0), 0);
    return { ytd, projAdd, projected: ytd + projAdd };
  }, [safeRows]);

  const monthsLeft = React.useMemo(() => {
    // Inclui o mês atual. Ex.: Fev -> 11 meses (Fev..Dez)
    const m = now.getMonth();
    return Math.max(1, 12 - m);
  }, [now]);

  const yearPct = React.useMemo(() => {
    const denom = Math.max(1, totals.projected);
    return Math.min(100, (totals.ytd / denom) * 100);
  }, [totals.ytd, totals.projected]);

  function dueYear(targetDate?: string): number {
    if (!targetDate) return year;
    const d = new Date(`${targetDate}T00:00:00`);
    return Number.isFinite(d.getTime()) ? d.getFullYear() : year;
  }

  function isAtRisk(g: { target_date?: string; ytd_pct?: number; projected_pct?: number }): boolean {
    const ytdPct = Number(g.ytd_pct) || 0;
    if (ytdPct >= 100) return false;
    // Só faz sentido marcar "Em risco" quando a meta vence neste ano (ou já venceu).
    const isDueThisYearOrPast = dueYear(g.target_date) <= year;
    const projPct = Number(g.projected_pct) || 0;
    return isDueThisYearOrPast && projPct < 100;
  }

  const sortedGoals = React.useMemo(() => {
    // Prioridades: 1) metas em risco (vence até Dez/{year} e projeção < 100)
    // 2) demais metas com maior gap para 100%
    // 3) desempate por impacto (proj_add)
    const rows = [...safeRows];
    rows.sort((a, b) => {
      const aRisk = isAtRisk(a);
      const bRisk = isAtRisk(b);
      if (aRisk !== bRisk) return aRisk ? -1 : 1;

      const aGap = Math.max(0, 100 - (Number(a.projected_pct) || 0));
      const bGap = Math.max(0, 100 - (Number(b.projected_pct) || 0));
      if (aGap !== bGap) return bGap - aGap;

      return (Number(b.proj_add) || 0) - (Number(a.proj_add) || 0);
    });
    return rows;
  }, [safeRows, year]);

  const prioritiesToShow = React.useMemo(() => {
    if (prioritiesExpanded) return sortedGoals;
    return sortedGoals.slice(0, 3);
  }, [sortedGoals, prioritiesExpanded]);

  const selected = React.useMemo(() => {
    if (!selectedGoalId) return null;
    return safeRows.find((r) => String(r.goal_id) === String(selectedGoalId)) ?? null;
  }, [safeRows, selectedGoalId]);

  function statusChip(g: { ytd_pct: number; projected_pct: number; target_date?: string }) {
    const ytdPct = Number(g.ytd_pct) || 0;
    const projPct = Number(g.projected_pct) || 0;
    const isDueThisYearOrPast = dueYear(g.target_date) <= year;

    if (ytdPct >= 100) {
      return {
        label: "Concluída",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900"
      };
    }

    // Metas com alvo depois deste ano não devem aparecer como "Em risco" neste card anual.
    // Elas continuam em andamento (com o plano até Dez/{year}).
    if (!isDueThisYearOrPast) {
      if (projPct >= 100) {
        return {
          label: "Adiantada",
          className: "border-emerald-200 bg-emerald-50 text-emerald-900"
        };
      }
      return {
        label: "Em andamento",
        className: "border-sky-200 bg-sky-50 text-sky-900"
      };
    }

    if (projPct >= 100) {
      return {
        label: "No ritmo",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900"
      };
    }

    return {
      label: "Em risco",
      className: "border-amber-200 bg-amber-50 text-amber-900"
    };
  }

  function openGoal(goalId: string) {
    setSelectedGoalId(goalId);
    setSheetTab("resumo");
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="min-w-0 text-left"
          aria-label={collapsed ? "Expandir evolução anual" : "Recolher evolução anual"}
        >
          <div className="text-slate-900 font-semibold">Evolução anual das metas</div>
          {/* Mantemos o header limpo. Os destaques (Realizado / Falta até Dez) ficam dentro do card "Avanço no ano". */}
        </button>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-xl2 border border-slate-200 bg-white p-2 text-blue-600 hover:bg-slate-100 transition"
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
              {/* Resumo: menos poluição, mais decisão */}
              <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-slate-900 font-semibold">Resumo {year}</div>
                    <div className="mt-1 text-sm text-slate-600">Realizado + o que falta até Dez para seguir o plano.</div>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate("/app/goals/year")}
                      className="rounded-xl2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 transition"
                    >
                      Detalhar
                    </button>
                  </div>
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

              {/* Prioridades */}
              <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-slate-900 font-semibold">Prioridades</div>
                    <div className="text-xs text-slate-600">Mostrando {Math.min(prioritiesToShow.length, safeRows.length)} de {safeRows.length} meta(s)</div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      className="text-sm text-slate-700 hover:text-slate-900"
                      onClick={() => navigate("/app/goals/year")}
                      aria-label="Abrir visão anual"
                    >
                      Visão anual
                    </button>

                    {sortedGoals.length > 3 ? (
                      <button
                        type="button"
                        className="text-sm text-blue-700 hover:text-blue-600"
                        onClick={() => setPrioritiesExpanded((v) => !v)}
                        aria-label={prioritiesExpanded ? "Recolher prioridades" : "Ver todas as prioridades"}
                      >
                        {prioritiesExpanded ? "Recolher" : "Ver todas"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {prioritiesToShow.map((g) => {
                    const chip = statusChip(g);
                    const remaining = Math.max(0, Number(g.proj_add) || 0);
                    const perMonth = monthsLeft > 0 ? remaining / monthsLeft : remaining;
                    return (
                      <button
                        key={g.goal_id}
                        type="button"
                        onClick={() => openGoal(String(g.goal_id))}
                        className="w-full rounded-xl2 border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50 transition"
                        aria-label={`Ver detalhes de ${g.name}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-slate-900 font-medium truncate">{g.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + chip.className}>
                                {chip.label}
                              </span>
                              {remaining > 0 ? (
                                <span className="text-xs text-slate-600">Sugere {formatBRL(perMonth)}/mês</span>
                              ) : (
                                <span className="text-xs text-slate-500">Sem parcelas abertas</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-slate-900 font-semibold">{formatBRL(remaining)}</div>
                            <div className="text-xs text-slate-600">até Dez/{year} • {formatPercent(Number(g.projected_pct) || 0)}</div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Progress value={Math.min(100, Number(g.projected_pct) || 0)} className="h-2" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Todas as metas (compacto) */}
              <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="min-w-0 text-left"
                    aria-label={showAll ? "Recolher todas as metas" : "Mostrar todas as metas"}
                  >
                    <div className="text-slate-900 font-semibold">Todas as metas</div>
                    <div className="text-sm text-slate-600">{showAll ? "Toque em uma meta para ver detalhes." : "Lista compacta (recolhida por padrão)."}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="shrink-0 rounded-xl2 border border-slate-200 bg-white p-2 text-blue-600 hover:bg-slate-100 transition"
                    aria-label={showAll ? "Recolher" : "Expandir"}
                  >
                    {showAll ? <Icon name="chevronUp" className="h-5 w-5" /> : <Icon name="chevronDown" className="h-5 w-5" />}
                  </button>
                </div>

                {showAll ? (
                  <div className="mt-3 grid gap-2">
                    {safeRows.map((g) => {
                      const chip = statusChip(g);
                      const remaining = Math.max(0, Number(g.proj_add) || 0);
                      return (
                        <button
                          key={g.goal_id}
                          type="button"
                          onClick={() => openGoal(String(g.goal_id))}
                          className="w-full rounded-xl2 border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-slate-900 font-medium truncate">{g.name}</div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + chip.className}>
                                  {chip.label}
                                </span>
                                <span className="text-xs text-slate-600">Proj. {formatPercent(Number(g.projected_pct) || 0)}</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-slate-900 font-semibold">{formatBRL(remaining)}</div>
                              <div className="text-xs text-slate-600">até Dez/{year}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    <div className="pt-1 flex justify-end">
                      <button type="button" className="text-sm text-blue-700 hover:text-blue-600" onClick={() => navigate("/app/goals/year")}>
                        Abrir visão anual
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">{safeRows.length} meta(s)</div>
                    <button type="button" className="text-sm text-blue-700 hover:text-blue-600" onClick={() => setShowAll(true)}>
                      Mostrar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState title="Sem metas" subtitle="Cadastre metas e/ou ative a opção de plano mensal para ver projeções." />
            </div>
          )}
        </>
      )}

      <BottomSheet
        open={!!selected}
        title={selected ? selected.name : "Detalhe"}
        onClose={() => setSelectedGoalId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate("/app/goals/year")} className="h-10 px-4">
              Ver visão anual
            </Button>
            <Button onClick={() => navigate("/app/investments?modal=new")} className="h-10 px-4">
              Aportar
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSheetTab("resumo")}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (sheetTab === "resumo" ? "border-slate-200 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50")
                }
              >
                Resumo
              </button>
              <button
                type="button"
                onClick={() => setSheetTab("plano")}
                className={
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (sheetTab === "plano" ? "border-slate-200 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50")
                }
              >
                Plano
              </button>
            </div>

            {(() => {
              const target = Math.max(0, Number((selected as any).target_value) || 0);
              const ytd = Math.max(0, Number((selected as any).ytd) || 0);
              const remaining = Math.max(0, Number((selected as any).proj_add) || 0);
              const projected = ytd + remaining;
              const ytdPct = target > 0 ? Math.min(100, (ytd / target) * 100) : 0;
              const projPct = target > 0 ? Math.min(100, (projected / target) * 100) : 0;
              const chip = statusChip({ ytd_pct: ytdPct, projected_pct: projPct, target_date: (selected as any).target_date } as any);
              const perMonth = monthsLeft > 0 ? remaining / monthsLeft : remaining;

              if (sheetTab === "plano") {
                return (
                  <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-slate-900 font-semibold">Plano até Dez/{year}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          O que está aberto no plano mensal até o fim do ano.
                          {(() => {
                            const td = String((selected as any).target_date || "");
                            if (!td) return null;
                            return dueYear(td) > year ? (
                              <span className="block mt-1 text-xs text-slate-500">Alvo em {formatDateBR(td)} • este card considera somente até Dez/{year}.</span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <span className={"shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + chip.className}>
                        {chip.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl2 border border-slate-200 bg-white p-3">
                        <div className="text-[11px] text-slate-600">Falta até Dez/{year}</div>
                        <div className="mt-1 text-slate-900 font-semibold">{formatBRL(remaining)}</div>
                      </div>
                      <div className="rounded-xl2 border border-slate-200 bg-white p-3">
                        <div className="text-[11px] text-slate-600">Sugestão / mês</div>
                        <div className="mt-1 text-slate-900 font-semibold">{remaining > 0 ? formatBRL(perMonth) : "—"}</div>
                      </div>
                      <div className="rounded-xl2 border border-slate-200 bg-white p-3">
                        <div className="text-[11px] text-slate-600">Projeção</div>
                        <div className="mt-1 text-slate-900 font-semibold">{formatPercent(projPct)}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress value={projPct} />
                      <div className="mt-1 text-xs text-slate-500">Seguindo o plano até Dez/{year}, você chega em {formatPercent(projPct)} do alvo.</div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-slate-900 font-semibold">Visão geral</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Resumo do ano + projeção do plano.
                        {(() => {
                          const td = String((selected as any).target_date || "");
                          if (!td) return null;
                          return dueYear(td) > year ? (
                            <span className="block mt-1 text-xs text-slate-500">Alvo em {formatDateBR(td)} • este card mostra o avanço até Dez/{year}.</span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <span className={"shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " + chip.className}>
                      {chip.label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl2 border border-slate-200 bg-white p-3">
                      <div className="text-[11px] text-slate-600">Agora (realizado)</div>
                      <div className="mt-1 text-slate-900 font-semibold">{formatBRL(ytd)}</div>
                    </div>
                    <div className="rounded-xl2 border border-slate-200 bg-white p-3">
                      <div className="text-[11px] text-slate-600">Previsto (até Dez/{year})</div>
                      <div className="mt-1 text-slate-900 font-semibold">{formatBRL(projected)}</div>
                    </div>
                    <div className="rounded-xl2 border border-slate-200 bg-white p-3">
                      <div className="text-[11px] text-slate-600">Alvo</div>
                      <div className="mt-1 text-slate-900 font-semibold">{formatBRL(target)}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div className="bg-sky-400" style={{ width: `${ytdPct}%` }} />
                      <div className="bg-emerald-400/70" style={{ width: `${Math.max(0, projPct - ytdPct)}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Azul = realizado • Verde = projeção restante do plano.</div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}
      </BottomSheet>
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

      <div className="flex items-start justify-between gap-3">
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

export default function DashboardPage() {
  const navigate = useNavigate();

  const equity = useAsync(() => getEquitySummary(), []);
  const monthly = useAsync(() => getMonthlyPlanSummary(), []);
  const yearGoals = useAsync(() => listYearGoalProjections(), []);
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

      

{/* Resumo do mês + CTA */}
<MonthlySummaryCard
  summary={monthly.data}
  loading={monthly.loading}
  lastUpdatedLabel={lastUpdatedLabel}
  onContribute={() => navigate("/app/investments?modal=new")}
  onOpenPlan={() => navigate("/app/monthly-plan")}
/>

{/* Nova entrega de alto valor: visão de avanço anual + projeção */}
      <YearGoalsProjectionCard rows={yearGoals.data?.goals ?? []} loading={yearGoals.loading} />
    </div>
  );
}
