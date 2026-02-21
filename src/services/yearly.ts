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
  contributed: number;
  planned: number;
};

export type YearMonthBreakdownRow = {
  month: string; // YYYY-MM
  contributed: number;
  planned: number;
  contributed_cum: number;
  projected_cum: number;
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
      .select("id, nome, valor_alvo")
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

    // Year-to-date contributions from submetas.valor_aportado
    const { data: subsYear, error: e2 } = await supabase
      .from("submetas")
      .select("meta_id, valor_aportado, data_referencia")
      .eq("user_id", uid)
      .in("meta_id", goalIds)
      .gte("data_referencia", yStart)
      .lt("data_referencia", yEnd);
    if (e2) throw e2;

    const ytdByGoal: Record<string, number> = {};
    for (const s of subsYear ?? []) {
      const gid = String((s as any).meta_id);
      ytdByGoal[gid] = (ytdByGoal[gid] ?? 0) + (Number((s as any).valor_aportado) || 0);
    }

    // Planned remaining (raw) = sum of ABERTA parcelas (valor_esperado) from current month to Dec.
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
      .eq("user_id", uid);
    if (e1) throw e1;

    const goalById: Record<string, { name: string; target: number }> = {};
    for (const g of metas ?? []) {
      goalById[String((g as any).id)] = { name: String((g as any).nome), target: Number((g as any).valor_alvo) || 0 };
    }

    const goalIds = Object.keys(goalById);
    if (!goalIds.length) return [];

    const { data: subs, error: e2 } = await supabase
      .from("submetas")
      .select("meta_id, data_referencia, valor_aportado, valor_esperado, status")
      .eq("user_id", uid)
      .in("meta_id", goalIds)
      .gte("data_referencia", yStart)
      .lt("data_referencia", yEnd);
    if (e2) throw e2;

    const byMonth: Record<
      string,
      { contributed: number; planned: number; byGoal: Record<string, { contributed: number; planned: number }> }
    > = {};

    for (const s of subs ?? []) {
      const metaId = String((s as any).meta_id);
      const d = String((s as any).data_referencia);
      const month = d.slice(0, 7);
      const aportado = Number((s as any).valor_aportado) || 0;
      const esperado = Number((s as any).valor_esperado) || 0;
      const status = String((s as any).status || "");

      byMonth[month] ??= { contributed: 0, planned: 0, byGoal: {} };
      byMonth[month].contributed += aportado;
      if (status === "ABERTA") {
        byMonth[month].planned += esperado;
      }
      byMonth[month].byGoal[metaId] ??= { contributed: 0, planned: 0 };
      byMonth[month].byGoal[metaId].contributed += aportado;
      if (status === "ABERTA") {
        byMonth[month].byGoal[metaId].planned += esperado;
      }
    }

    const rows: YearMonthBreakdownRow[] = [];
    let cumContrib = 0;
    let cumProj = 0;

    for (let m = 1; m <= 12; m++) {
      const month = `${y}-${pad2(m)}`;
      const bucket = byMonth[month];
      const contributed = bucket?.contributed ?? 0;
      const planned = bucket?.planned ?? 0;
      cumContrib += contributed;
      cumProj += contributed + planned;

      const details: YearMonthGoalDetail[] = [];
      const goalBuckets = bucket?.byGoal ?? {};
      for (const goalId of Object.keys(goalBuckets)) {
        const info = goalById[goalId];
        const gb = goalBuckets[goalId];
        details.push({
          goal_id: goalId,
          name: info?.name ?? "",
          target_value: info?.target ?? 0,
          contributed: gb.contributed,
          planned: gb.planned
        });
      }
      details.sort((a, b) => b.contributed + b.planned - (a.contributed + a.planned));

      rows.push({ month, contributed, planned, contributed_cum: cumContrib, projected_cum: cumProj, details });
    }

    return rows;
  });
}
