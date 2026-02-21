import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch } from "./cache";

const TTL_MS = 12_000;
const k = (uid: string, suffix: string) => `u:${uid}:monthly:${suffix}`;

// Legacy shapes expected by the UI.
export type MonthlyPlanSummary = {
  user_id: string;
  total_suggested_this_month: number;
  total_contributed_this_month: number;
  total_remaining_this_month: number;
};

export type MonthlyPlanGoalRow = {
  user_id: string;
  goal_id: string;
  name: string;
  target_value: number;
  target_date: string;
  is_monthly_plan: boolean;
  current_contributed: number;
  remaining_value: number;
  months_remaining: number;
  suggested_this_month: number;
  contributed_this_month: number;
  remaining_this_month: number;
};

export type MonthlyPlanRankingRow = MonthlyPlanGoalRow & {
  priority_score: number;
  priority_rank: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

function normalizeMonthISO(monthISO?: string): string {
  // Accepts "YYYY-MM" or "YYYY-MM-01". Defaults to current month start.
  if (!monthISO) return monthStartISO();
  if (/^\d{4}-\d{2}$/.test(monthISO)) return `${monthISO}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(monthISO)) return `${monthISO.slice(0, 7)}-01`;
  return monthStartISO();
}

function monthIndex(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
}

function monthsRemainingFromNow(targetDateISO: string): number {
  const start = monthStartISO(new Date());
  const startIdx = monthIndex(start);
  const targetMonthIso = `${targetDateISO.slice(0, 7)}-01`;
  const targetIdx = monthIndex(targetMonthIso);
  const diff = targetIdx - startIdx;
  return Math.max(0, diff + 1);
}

async function getContribSums(uid: string, goalIds: string[]): Promise<Record<string, number>> {
  const key = k(uid, `contrib:${goalIds.sort().join(",")}`);
  return cacheFetch(key, TTL_MS, async () => {
    const sums: Record<string, number> = {};
    if (!goalIds.length) return sums;

    const { data, error } = await supabase
      .from("submetas")
      .select("meta_id, valor_aportado")
      .eq("user_id", uid)
      .in("meta_id", goalIds);
    if (error) throw error;

    for (const r of data ?? []) {
      const gid = String((r as any).meta_id);
      sums[gid] = (sums[gid] ?? 0) + (Number((r as any).valor_aportado) || 0);
    }
    return sums;
  });
}

export async function getMonthlyPlanSummary(monthISO?: string): Promise<MonthlyPlanSummary | null> {
  const uid = await requireUserId();
  const m = normalizeMonthISO(monthISO);
  return cacheFetch(k(uid, `summary:${m}`), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("vw_planejamento_mensal")
      .select("user_id, mes, total_sugerido, total_aportado, restante_mes")
      .eq("user_id", uid)
      .eq("mes", m)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      user_id: uid,
      total_suggested_this_month: Number((data as any).total_sugerido) || 0,
      total_contributed_this_month: Number((data as any).total_aportado) || 0,
      total_remaining_this_month: Number((data as any).restante_mes) || 0
    };
  });
}

export async function listMonthlyPlanGoals(monthISO?: string): Promise<MonthlyPlanGoalRow[]> {
  const uid = await requireUserId();
  const m = normalizeMonthISO(monthISO);

  return cacheFetch(k(uid, `goals:${m}`), TTL_MS, async () => {
    // One row per meta for the selected month.
    const { data: subs, error: e1 } = await supabase
      .from("submetas")
      .select("id, meta_id, valor_esperado, valor_aportado, status, metas(nome, valor_alvo, data_alvo, is_plano_mensal)")
      .eq("user_id", uid)
      .eq("data_referencia", m);
    if (e1) throw e1;

    const filtered = (subs ?? []).filter((s: any) => !!s.metas?.is_plano_mensal);
    const goalIds = filtered.map((s: any) => String(s.meta_id));
    if (!goalIds.length) return [];

    const sums = await getContribSums(uid, goalIds);

    return filtered.map((s: any) => {
      const gid = String(s.meta_id);
      const g = s.metas;
      const target = Number(g?.valor_alvo) || 0;
      const contributed = sums[gid] ?? 0;
      const remainingValue = Math.max(0, target - contributed);
      const suggested = Number(s.valor_esperado) || 0;
      const paid = Number(s.valor_aportado) || 0;
      const remainingThisMonth = Math.max(0, suggested - paid);

      return {
        user_id: uid,
        goal_id: gid,
        name: String(g?.nome ?? ""),
        target_value: target,
        target_date: String(g?.data_alvo ?? ""),
        is_monthly_plan: !!g?.is_plano_mensal,
        current_contributed: contributed,
        remaining_value: remainingValue,
        months_remaining: monthsRemainingFromNow(String(g?.data_alvo ?? m)),
        suggested_this_month: suggested,
        contributed_this_month: paid,
        remaining_this_month: remainingThisMonth
      };
    });
  });
}

export async function listMonthlyPlanRanking(monthISO?: string): Promise<MonthlyPlanRankingRow[]> {
  const rows = await listMonthlyPlanGoals(monthISO);

  const sorted = [...rows].sort((a, b) => {
    if (a.months_remaining !== b.months_remaining) return a.months_remaining - b.months_remaining;
    if (a.remaining_value !== b.remaining_value) return b.remaining_value - a.remaining_value;
    return b.remaining_this_month - a.remaining_this_month;
  });

  return sorted.map((r, idx) => ({
    ...r,
    priority_score: (r.months_remaining > 0 ? r.remaining_value / r.months_remaining : r.remaining_value) + r.remaining_this_month,
    priority_rank: idx + 1
  }));
}
