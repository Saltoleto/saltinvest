import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch } from "./cache";

const TTL_MS = 20_000;
const k = (uid: string, suffix: string) => `u:${uid}:yearly:${suffix}`;

export type YearTotals = {
  year: number;
  ytd: number;
  projected: number;
  projAdd: number;
};

export type YearGoalProjectionRow = {
  goal_id: string;
  name: string;
  target_value: number;
  target_date: string;
  ytd: number;
  projected: number;
  proj_add: number;
  ytd_pct: number;
  projected_pct: number;
};

export type YearMonthGoalDetail = {
  goal_id: string;
  name: string;
  target_value: number;
  contributed: number; // realizado no mês
  planned: number; // planejado no mês (parcelas abertas)
};

export type YearMonthBreakdownRow = {
  month: string; // YYYY-MM
  contributed: number; // realizado no mês
  planned: number; // planejado no mês (parcelas abertas)
  contributed_cum: number; // acumulado até o mês
  projected_cum: number; // acumulado + planejado restante até Dez
  details: YearMonthGoalDetail[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function yearStart(year: number) {
  return `${year}-01-01`;
}

function yearEndExclusive(year: number) {
  return `${year + 1}-01-01`;
}

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

function decMonthStart(year: number): string {
  return `${year}-12-01`;
}

export async function listYearGoalProjections(year?: number): Promise<{ totals: YearTotals; goals: YearGoalProjectionRow[] }> {
  const uid = await requireUserId();
  const y = year ?? new Date().getFullYear();
  const cacheKey = k(uid, `proj:${y}`);

  return cacheFetch(cacheKey, TTL_MS, async () => {
    const yStart = yearStart(y);
    const yEnd = yearEndExclusive(y);

    const { data: metas, error: e1 } = await supabase
      .from("metas")
      .select("id, nome, valor_alvo, data_alvo")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (e1) throw e1;

    const goalIds = (metas ?? []).map((m: any) => String(m.id));
    if (!goalIds.length) {
      return {
        totals: { year: y, ytd: 0, projected: 0, projAdd: 0 },
        goals: []
      };
    }

    // "Agora" (realizado) baseado no plano: soma de parcelas/submetas com status APORTADA (equivalente a ATINGIDA)
    // Usamos valor_esperado como fonte de verdade do plano (e não valor_aportado), para garantir consistência com o alvo.
    const { data: subsYear, error: e2 } = await supabase
      .from("submetas")
      .select("meta_id, valor_esperado, status, data_referencia")
      .eq("user_id", uid)
      .in("meta_id", goalIds)
      .gte("data_referencia", yStart)
      .lt("data_referencia", yEnd);
    if (e2) throw e2;

    const ytdByGoal: Record<string, number> = {};
    for (const s of subsYear ?? []) {
      const gid = String((s as any).meta_id);
      const st = String((s as any).status || "");
      const achieved = st === "APORTADA" || st === "ATINGIDA";
      const v = achieved ? (Number((s as any).valor_esperado) || 0) : 0;
      ytdByGoal[gid] = (ytdByGoal[gid] ?? 0) + v;
    }

    // "Até Dez" (faltante) = soma de parcelas/submetas ABERTA do mês atual até Dez.
    const nowMonth = monthStartISO();
    const dec = decMonthStart(y);

    const { data: subsRemain, error: e3 } = await supabase
      .from("submetas")
      .select("meta_id, valor_esperado, status, data_referencia")
      .eq("user_id", uid)
      .in("meta_id", goalIds)
      .eq("status", "ABERTA")
      .gte("data_referencia", nowMonth)
      .lte("data_referencia", dec);
    if (e3) throw e3;

    const rawRemainByGoal: Record<string, number> = {};
    for (const s of subsRemain ?? []) {
      const gid = String((s as any).meta_id);
      rawRemainByGoal[gid] = (rawRemainByGoal[gid] ?? 0) + (Number((s as any).valor_esperado) || 0);
    }

    const goals: YearGoalProjectionRow[] = (metas ?? []).map((g: any) => {
      const goalId = String(g.id);
      const target = Number(g.valor_alvo) || 0;
      const targetDate = String(g.data_alvo || "");
      const ytdVal = ytdByGoal[goalId] ?? 0;
      const remainingToTarget = Math.max(0, target - ytdVal);
      const projAddRaw = rawRemainByGoal[goalId] ?? 0;
      const projAdd = Math.min(projAddRaw, remainingToTarget);
      const projected = ytdVal + projAdd;

      const ytdPct = target > 0 ? Math.min(100, (ytdVal / target) * 100) : 0;
      const projPct = target > 0 ? Math.min(100, (projected / target) * 100) : 0;

      return {
        goal_id: goalId,
        name: String(g.nome),
        target_value: target,
        target_date: targetDate,
        ytd: ytdVal,
        projected,
        proj_add: projAdd,
        ytd_pct: ytdPct,
        projected_pct: projPct
      };
    });

    const totalsYtd = goals.reduce((acc, r) => acc + r.ytd, 0);
    const totalsProjAdd = goals.reduce((acc, r) => acc + r.proj_add, 0);
    const totalsProjected = totalsYtd + totalsProjAdd;

    return {
      totals: { year: y, ytd: totalsYtd, projAdd: totalsProjAdd, projected: totalsProjected },
      goals
    };
  });
}

function monthKey(dateISO: string): string {
  // data_referencia é YYYY-MM-DD
  return String(dateISO).slice(0, 7);
}

function monthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }).map((_, i) => `${year}-${pad2(i + 1)}`);
}

/**
 * Retorna uma linha do tempo mês-a-mês baseada em submetas (parcelas).
 * - contributed: soma de valor_aportado no mês
 * - planned: soma de valor_esperado das parcelas ABERTA no mês
 * - contributed_cum: acumulado de contributed
 * - projected_cum: contributed_cum + soma do planned (ABERTA) do mês até Dez
 */
export async function listYearMonthBreakdown(year?: number): Promise<YearMonthBreakdownRow[]> {
  const uid = await requireUserId();
  const y = year ?? new Date().getFullYear();
  const cacheKey = k(uid, `months:${y}`);

  return cacheFetch(cacheKey, TTL_MS, async () => {
    const yStart = yearStart(y);
    const yEnd = yearEndExclusive(y);

    const { data: metas, error: e1 } = await supabase
      .from("metas")
      .select("id, nome, valor_alvo")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (e1) throw e1;

    const goalById: Record<string, { id: string; name: string; target: number }> = {};
    for (const m of metas ?? []) {
      const id = String((m as any).id);
      goalById[id] = { id, name: String((m as any).nome), target: Number((m as any).valor_alvo) || 0 };
    }
    const goalIds = Object.keys(goalById);
    if (!goalIds.length) return [];

    const { data: subs, error: e2 } = await supabase
      .from("submetas")
      .select("meta_id, data_referencia, status, valor_aportado, valor_esperado")
      .eq("user_id", uid)
      .in("meta_id", goalIds)
      .gte("data_referencia", yStart)
      .lt("data_referencia", yEnd);
    if (e2) throw e2;

    const months = monthsOfYear(y);

    const contributedByMonth: Record<string, number> = {};
    const plannedByMonth: Record<string, number> = {};

    // detailsByMonthGoal[month][goal] = {contributed, planned}
    const detailsByMonthGoal: Record<string, Record<string, { contributed: number; planned: number }>> = {};

    for (const s of subs ?? []) {
      const gid = String((s as any).meta_id);
      const mk = monthKey(String((s as any).data_referencia));
      if (!months.includes(mk)) continue;

      const st = String((s as any).status || "");
      const expected = Number((s as any).valor_esperado) || 0;
      // Contribuído no mês = parcelas atingidas (APORTADA/ATINGIDA) somadas pelo valor esperado.
      const contributed = st === "APORTADA" || st === "ATINGIDA" ? expected : 0;
      // Planejado no mês = parcelas ainda abertas.
      const planned = st === "ABERTA" ? expected : 0;

      contributedByMonth[mk] = (contributedByMonth[mk] ?? 0) + contributed;
      plannedByMonth[mk] = (plannedByMonth[mk] ?? 0) + planned;

      detailsByMonthGoal[mk] = detailsByMonthGoal[mk] ?? {};
      const cell = (detailsByMonthGoal[mk][gid] = detailsByMonthGoal[mk][gid] ?? { contributed: 0, planned: 0 });
      cell.contributed += contributed;
      cell.planned += planned;
    }

    // remaining planned from month -> Dec
    const plannedRemainingFrom: Record<string, number> = {};
    let runningRemain = 0;
    for (let i = months.length - 1; i >= 0; i--) {
      const mk = months[i];
      runningRemain += plannedByMonth[mk] ?? 0;
      plannedRemainingFrom[mk] = runningRemain;
    }

    // cumulative contributed
    const rows: YearMonthBreakdownRow[] = [];
    let runningContrib = 0;
    for (const mk of months) {
      const contributed = contributedByMonth[mk] ?? 0;
      const planned = plannedByMonth[mk] ?? 0;
      runningContrib += contributed;

      const projectedCum = runningContrib + (plannedRemainingFrom[mk] ?? 0);

      const detailsObj = detailsByMonthGoal[mk] ?? {};
      const details: YearMonthGoalDetail[] = Object.keys(detailsObj)
        .map((gid) => ({
          goal_id: gid,
          name: goalById[gid]?.name ?? "",
          target_value: goalById[gid]?.target ?? 0,
          contributed: detailsObj[gid].contributed,
          planned: detailsObj[gid].planned,
        }))
        .sort((a, b) => b.contributed + b.planned - (a.contributed + a.planned));

      rows.push({
        month: mk,
        contributed,
        planned,
        contributed_cum: runningContrib,
        projected_cum: projectedCum,
        details,
      });
    }

    return rows;
  });
}
