import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/ui/primitives/Card';
import Button from '@/ui/primitives/Button';
import Select from '@/ui/primitives/Select';
import Skeleton from '@/ui/primitives/Skeleton';
import Progress from '@/ui/primitives/Progress';
import { Icon } from '@/ui/layout/icons';
import { formatBRL, formatDateBR } from '@/lib/format';
import { useAsync } from '@/state/useAsync';
import { getPlanejamentoPlurianual } from '@/services/plurianual';

function Stat({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-xl2 border border-slate-200 bg-white p-4">
      <div className="text-xs sm:text-sm text-slate-600">{label}</div>
      <div className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      {help ? <div className="mt-1 text-xs text-slate-500">{help}</div> : null}
    </div>
  );
}

function YearCard({ year, maxTotal }: { year: any; maxTotal: number }) {
  const barPct = maxTotal > 0 ? Math.max(8, Math.min(100, (year.totalMetas / maxTotal) * 100)) : 0;
  const openGoals = year.metasAbertasCount;
  const closedGoals = year.metasBaixadasCount;
  return (
    <Card className="p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-400/40 via-emerald-400/30 to-violet-400/30" />
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">{year.ano}</div>
          <div className="mt-1 text-sm text-slate-600">{year.metasCount} meta(s) • {openGoals} aberta(s){closedGoals ? ` • ${closedGoals} baixada(s)` : ''}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl2 border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-600">Total das metas</div>
          <div className="mt-1 font-semibold text-slate-900">{formatBRL(year.totalMetas)}</div>
        </div>
        <div className="rounded-xl2 border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-600">Aportado (submetas)</div>
          <div className="mt-1 font-semibold text-slate-900">{formatBRL(year.totalAportadoAno)}</div>
        </div>
        <div className="rounded-xl2 border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-600">Restante estimado</div>
          <div className="mt-1 font-semibold text-slate-900">{formatBRL(year.totalRestanteAno)}</div>
        </div>
        <div className="rounded-xl2 border border-slate-200 bg-white p-3">
          <div className="text-xs text-slate-600">Metas no plano do mês</div>
          <div className="mt-1 font-semibold text-slate-900">{formatBRL(year.totalPlanoMensalAno)}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Progresso consolidado do ano</span>
          <span>{year.progressoAnoPct.toFixed(1)}%</span>
        </div>
        <div className="mt-2"><Progress value={year.progressoAnoPct} /></div>
      </div>

      <div className="mt-4 rounded-xl2 border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-slate-900">Peso deste ano no planejamento</div>
          <div className="text-xs text-slate-600 sm:text-right">{formatBRL(year.totalMetas)}</div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${barPct}%` }} />
        </div>
      </div>

      {year.proximasMetas.length ? (
        <div className="mt-4 grid gap-2">
          <div className="text-sm font-medium text-slate-900">Metas deste ano</div>
          {year.proximasMetas.map((g: any) => {
            const baixada = String(g.status ?? '').toUpperCase() === 'BAIXADA';
            return (
              <div key={g.id} className="rounded-xl2 border border-slate-200 bg-white px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{g.nome}</div>
                  <div className="text-xs text-slate-600">Alvo {formatDateBR(g.dataAlvo)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {baixada ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      <Icon name="check" className="h-3.5 w-3.5" /> Baixada
                    </span>
                  ) : null}
                  <span className="text-sm font-semibold text-slate-900">{formatBRL(g.valorMeta)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

export default function PlurianualPlanningPage() {
  const navigate = useNavigate();
  const query = useAsync(() => getPlanejamentoPlurianual(), []);
  const [yearFilter, setYearFilter] = React.useState<'all' | string>('all');

  const years = query.data?.anos ?? [];
  const yearOptions = React.useMemo(() => years.map((y) => String(y.ano)), [years]);
  const visibleYears = React.useMemo(
    () => (yearFilter === 'all' ? years : years.filter((y) => String(y.ano) === yearFilter)),
    [years, yearFilter]
  );
  const maxTotal = React.useMemo(() => years.reduce((m, y) => Math.max(m, y.totalMetas), 0), [years]);

  const totals = React.useMemo(() => {
    const src = visibleYears;
    return {
      metas: src.reduce((s, y) => s + y.totalMetas, 0),
      aportado: src.reduce((s, y) => s + y.totalAportadoAno, 0),
      restante: src.reduce((s, y) => s + y.totalRestanteAno, 0),
      metasCount: src.reduce((s, y) => s + y.metasCount, 0)
    };
  }, [visibleYears]);

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] sm:text-xs font-semibold text-blue-700">
              <Icon name="layers" className="h-3.5 w-3.5" /> Planejamento plurianual
            </div>
            <div className="mt-2 text-slate-900 font-semibold text-lg sm:text-xl tracking-tight">Visão total das metas por ano</div>
            <div className="mt-1 text-sm text-slate-600 max-w-3xl">
              Consolida o valor total das metas cadastradas e mostra a distribuição anual, com visão de aportes e saldo restante.
            </div>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[260px] rounded-xl2 border border-slate-200 bg-white p-3">
            <Select label="Filtrar ano" value={yearFilter} onChange={(e) => setYearFilter(e.target.value as any)}>
              <option value="all">Todos os anos</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {query.loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl2 border border-slate-200 bg-white p-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="mt-2 h-7 w-32" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
              ))
            ) : (
              <>
                <Stat label="Total das metas" value={formatBRL(totals.metas)} help={`${totals.metasCount} meta(s) no recorte`} />
                <Stat label="Aportado consolidado" value={formatBRL(totals.aportado)} />
                <Stat label="Restante consolidado" value={formatBRL(totals.restante)} />
              </>
            )}
          </div>
        </div>
      </Card>

      {query.loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-2 h-4 w-56" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-16 w-full" />)}
              </div>
              <Skeleton className="mt-4 h-2 w-full" />
            </Card>
          ))}
        </div>
      ) : query.error ? (
        <Card className="p-6 text-center">
          <div className="text-slate-900 font-medium">Não foi possível carregar o planejamento plurianual</div>
          <div className="mt-1 text-sm text-slate-600">{query.error}</div>
          <div className="mt-4"><Button onClick={query.reload}>Tentar novamente</Button></div>
        </Card>
      ) : visibleYears.length ? (
        <div className="grid gap-3">
          {visibleYears.map((y) => <YearCard key={y.ano} year={y} maxTotal={maxTotal} />)}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <div className="text-slate-900 font-medium">Sem metas para exibir</div>
          <div className="mt-1 text-sm text-slate-600">Cadastre metas para acompanhar o planejamento anual e plurianual.</div>
          <div className="mt-4"><Button onClick={() => navigate('/app/goals?modal=new')}><Icon name="plus" className="h-4 w-4" /> Nova meta</Button></div>
        </Card>
      )}
    </div>
  );
}
