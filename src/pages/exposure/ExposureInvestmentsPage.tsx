import React from "react";
import Card from "@/ui/primitives/Card";
import Skeleton from "@/ui/primitives/Skeleton";
import { useAsync } from "@/state/useAsync";
import { formatBRL, formatPercent } from "@/lib/format";
import { getEquitySummary } from "@/services/analytics";
import { listInvestments } from "@/services/investments";
import Progress from "@/ui/primitives/Progress";
import { Icon } from "@/ui/layout/icons";

function pct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  const tone =
    title === "Liquidez diária"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : title === "Proteção FGC"
        ? "bg-violet-50 text-violet-700 border-violet-200"
        : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-sky-400/40 via-emerald-400/30 to-violet-400/30" />
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <div className="text-sm text-slate-700">{title}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tracking-tight">{value}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>
        <span className={"shrink-0 rounded-full border px-3 py-1 text-xs font-semibold " + tone}>
          {title === "Liquidez diária" ? "Diária" : title === "Proteção FGC" ? "Coberto" : "Total"}
        </span>
      </div>
    </Card>
  );
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
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="min-w-0 text-left"
          aria-label={collapsed ? `Expandir ${title}` : `Recolher ${title}`}
        >
          <span className="block text-slate-900 font-semibold leading-snug break-words pr-1">{title}</span>
          <span className="block mt-1 text-xs text-slate-600">
            {total ? `Total: ${formatBRL(total)}` : "Sem dados suficientes"}
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

            {items.length > 2 ? (
              <div className="rounded-xl2 border border-slate-200 bg-white px-3 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="text-slate-800 text-sm font-medium truncate">Outros</span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <span className="text-slate-900 font-semibold">{formatPercent(restPct)}</span>
                  <span className="text-slate-700 text-sm">{formatBRL(Math.max(0, total - (a?.value ?? 0) - (b?.value ?? 0)))}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <Progress value={Math.min(100, aPct + bPct)} />
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-xl2 border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Cadastre investimentos para ver esta visão.
        </div>
      )}
    </Card>
  );
}

export default function ExposureInvestmentsPage() {
  const equity = useAsync(() => getEquitySummary(), []);
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

  const liquidEquity = Number(equity.data?.liquid_equity ?? 0);
  const fgcTotal = Number(equity.data?.fgc_protected_total ?? 0);

  return (
    <div className="grid gap-4 lg:gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-900 font-semibold text-lg">Exposição de investimentos</div>
          <div className="text-sm text-slate-600">Liquidez, cobertura e concentração da sua carteira.</div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          <Icon name="pie" className="h-4 w-4 text-blue-600" />
          Visão da carteira
        </span>
      </div>

      {/* Liquidez + FGC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {equity.loading ? (
          <Card className="p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-4 w-44" />
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

      {/* Concentração */}
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
    </div>
  );
}
