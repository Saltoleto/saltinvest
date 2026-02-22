import React from "react";
import { Link } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Select from "@/ui/primitives/Select";
import Skeleton from "@/ui/primitives/Skeleton";
import Badge from "@/ui/primitives/Badge";
import { Icon } from "@/ui/layout/icons";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent } from "@/lib/format";
import { listYearGoalProjections, listYearMonthBreakdown } from "@/services/yearly";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[idx] ?? m}/${String(y).slice(-2)}`;
}

export default function GoalsYearPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = React.useState(String(currentYear));
  const y = Number(year) || currentYear;

  const proj = useAsync(() => listYearGoalProjections(y), [y]);
  const months = useAsync(() => listYearMonthBreakdown(y), [y]);

  const [monthOpen, setMonthOpen] = React.useState<Record<string, boolean>>({});

  const totals = React.useMemo(() => {
    const t = (proj.data as any)?.totals;
    if (!t) return { ytd: 0, add: 0, projected: 0 };
    return { ytd: Number(t.ytd) || 0, add: Number(t.projAdd) || 0, projected: Number(t.projected) || 0 };
  }, [proj.data]);

  const maxScale = React.useMemo(() => {
    const m = months.data ?? [];
    const max = m.reduce((s, r) => Math.max(s, Number(r.projected_cum) || 0, Number(r.contributed_cum) || 0), 0);
    return Math.max(1, max);
  }, [months.data]);

  return (
    <div className="grid gap-4 lg:gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-900 font-semibold text-lg">Metas no ano</div>
          <div className="text-sm text-slate-600">Evolução mês a mês + projeção até Dezembro</div>
        </div>
        <div className="flex items-end gap-2">
          <Select label="Ano" value={year} onChange={(e) => setYear(e.target.value)} className="min-w-[140px]">
            {/* Mantém uma janela simples (ano atual e anterior) */}
            <option value={String(currentYear - 1)}>{currentYear - 1}</option>
            <option value={String(currentYear)}>{currentYear}</option>
          </Select>
          <Link to="/app/goals">
            <Button variant="secondary" className="h-11 px-4">
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-900 font-semibold">Resumo {y}</div>
            <div className="mt-1 text-sm text-slate-600">
              Realizado no ano até agora + projeção caso o plano mensal seja seguido.
            </div>
          </div>
          <Badge variant="info">Projeção</Badge>
        </div>

        {proj.loading ? (
          <div className="mt-4 grid gap-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-600">Realizado</div>
                <div className="mt-2 text-xl text-slate-900 font-semibold">{formatBRL(totals.ytd)}</div>
              </div>
              <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-600">Previsto (até Dez)</div>
                <div className="mt-2 text-xl text-slate-900 font-semibold">{formatBRL(totals.projected)}</div>
              </div>
              <div className="rounded-xl2 border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-600">A mais (plano)</div>
                <div className="mt-2 text-xl text-slate-900 font-semibold">+ {formatBRL(totals.add)}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
                <div className="bg-sky-400" style={{ width: `${Math.min(100, (totals.ytd / Math.max(1, totals.projected)) * 100)}%` }} />
                <div
                  className="bg-emerald-400/70"
                  style={{ width: `${Math.max(0, 100 - Math.min(100, (totals.ytd / Math.max(1, totals.projected)) * 100))}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">Azul = realizado • Verde = projeção restante</div>
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-900 font-semibold">Linha do tempo</div>
            <div className="mt-1 text-sm text-slate-600">Clique no mês para ver detalhes por meta.</div>
          </div>
          <div className="text-xs text-slate-500">Escala: {formatBRL(maxScale)}</div>
        </div>

        {months.loading ? (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (months.data ?? []).length ? (
          <div className="mt-4 grid gap-2">
            {(months.data ?? []).map((m) => {
              const open = !!monthOpen[m.month];
              const pctActual = Math.min(100, (m.contributed_cum / maxScale) * 100);
              const pctProj = Math.min(100, (m.projected_cum / maxScale) * 100);
              const delta = Math.max(0, (m.projected_cum || 0) - (m.contributed_cum || 0));

              return (
                <div key={m.month} className="rounded-xl2 border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMonthOpen((s) => ({ ...s, [m.month]: !open }))}
                    className="w-full p-4 text-left"
                    aria-label={open ? `Recolher ${m.month}` : `Expandir ${m.month}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-slate-900 font-medium flex items-center gap-2">
                          <span className="shrink-0">{monthLabel(m.month)}</span>
                          {m.planned > 0 ? <Badge variant="info">Plano {formatBRL(m.planned)}</Badge> : <Badge variant="neutral">Sem plano</Badge>}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Acumulado: {formatBRL(m.contributed_cum)} • Projeção: {formatBRL(m.projected_cum)}
                          {delta > 0 ? ` • +${formatBRL(delta)}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-slate-700">
                        {open ? <Icon name="chevronUp" className="h-5 w-5" /> : <Icon name="chevronDown" className="h-5 w-5" />}
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full flex">
                        <div className="bg-sky-400" style={{ width: `${pctActual}%` }} />
                        <div className="bg-emerald-400/70" style={{ width: `${Math.max(0, pctProj - pctActual)}%` }} />
                      </div>
                    </div>
                  </button>

                  {open ? (
                    <div className="border-t border-slate-200 p-4">
                      {m.details.length ? (
                        <div className="grid gap-2">
                          {m.details.map((d) => {
                            const total = (d.contributed || 0) + (d.planned || 0);
                            return (
                              <div key={d.goal_id} className="rounded-xl2 border border-slate-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-slate-900 font-medium truncate">{d.name}</div>
                                    <div className="mt-1 text-xs text-slate-600">
                                      {d.contributed ? `Aportado: ${formatBRL(d.contributed)}` : "Aportado: —"}
                                      {d.planned ? ` • Planejado: ${formatBRL(d.planned)}` : ""}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className="text-slate-900 font-semibold">{formatBRL(total)}</div>
                                    {d.target_value > 0 ? (
                                      <div className="text-xs text-slate-600">{formatPercent(Math.min(100, (total / d.target_value) * 100))} do alvo</div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-600">Sem movimentação neste mês.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl2 border border-slate-200 bg-white p-6 text-center">
            <div className="text-slate-900 font-medium">Sem dados para {y}</div>
            <div className="mt-1 text-sm text-slate-600">Cadastre metas e registre aportes / plano mensal para ver a evolução.</div>
            <div className="mt-3">
              <Link to="/app/goals">
                <Button variant="secondary">Ir para Metas</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
