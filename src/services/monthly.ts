import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";

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
  const sums: Record<string, number> = {};
  if (!goalIds.length) return sums;

  const { data, error } = await supabase
    .from("aportes")
    .select("objetivo_id, valor_aporte")
    .eq("usuario_id", uid)
    .in("objetivo_id", goalIds);
  if (error) throw error;

  for (const r of data ?? []) {
    const gid = String((r as any).objetivo_id);
    sums[gid] = (sums[gid] ?? 0) + (Number((r as any).valor_aporte) || 0);
  }
  return sums;
}

export async function getMonthlyPlanSummary(monthISO?: string): Promise<MonthlyPlanSummary | null> {
  const uid = await requireUserId();
  const m = normalizeMonthISO(monthISO);
  const { data, error } = await supabase
    .from("v_plano_mensal_resumo")
    .select("usuario_id, mes_referencia, valor_total_sugerido, valor_total_aportado, valor_total_restante")
    .eq("usuario_id", uid)
    .eq("mes_referencia", m)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    user_id: uid,
    total_suggested_this_month: Number((data as any).valor_total_sugerido) || 0,
    total_contributed_this_month: Number((data as any).valor_total_aportado) || 0,
    total_remaining_this_month: Number((data as any).valor_total_restante) || 0
  };
}

export async function listMonthlyPlanGoals(monthISO?: string): Promise<MonthlyPlanGoalRow[]> {
  const uid = await requireUserId();
  const m = normalizeMonthISO(monthISO);

  const { data: detail, error: e1 } = await supabase
    .from("v_plano_mensal_detalhe")
    .select("objetivo_id, objetivo_nome, participa_plano_mensal, valor_planejado, valor_pago")
    .eq("usuario_id", uid)
    .eq("mes_referencia", m)
    .eq("participa_plano_mensal", true);
  if (e1) throw e1;

  const goalIds = (detail ?? []).map((r: any) => String(r.objetivo_id));
  if (!goalIds.length) return [];

  const { data: goals, error: e2 } = await supabase
    .from("objetivos")
    .select("id, nome, valor_alvo, data_alvo, participa_plano_mensal")
    .eq("usuario_id", uid)
    .in("id", goalIds);
  if (e2) throw e2;

  const byId = new Map<string, any>();
  for (const g of goals ?? []) byId.set(String((g as any).id), g);

  const sums = await getContribSums(uid, goalIds);

  return (detail ?? []).map((r: any) => {
    const gid = String(r.objetivo_id);
    const g = byId.get(gid);
    const target = Number(g?.valor_alvo) || 0;
    const contributed = sums[gid] ?? 0;
    const remainingValue = Math.max(0, target - contributed);
    const suggested = Number(r.valor_planejado) || 0;
    const paid = Number(r.valor_pago) || 0;
    const remainingThisMonth = Math.max(0, suggested - paid);
    return {
      user_id: uid,
      goal_id: gid,
      name: String(g?.nome ?? r.objetivo_nome ?? ""),
      target_value: target,
      target_date: String(g?.data_alvo ?? ""),
      is_monthly_plan: !!g?.participa_plano_mensal,
      current_contributed: contributed,
      remaining_value: remainingValue,
      months_remaining: monthsRemainingFromNow(String(g?.data_alvo ?? m)),
      suggested_this_month: suggested,
      contributed_this_month: paid,
      remaining_this_month: remainingThisMonth
    };
  });
}

export async function listMonthlyPlanRanking(monthISO?: string): Promise<MonthlyPlanRankingRow[]> {
  const rows = await listMonthlyPlanGoals(monthISO);

  // Heurística simples (client-side):
  // 1) menor meses restantes
  // 2) maior restante total
  // 3) maior restante do mês
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
