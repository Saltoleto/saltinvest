import { supabase, type Views } from "@/lib/supabase";
import { requireUserId } from "./db";

export type MonthlyPlanGoalRow = Views["v_monthly_plan_goals"]; 
export type MonthlyPlanSummaryRow = Views["v_monthly_plan_summary"]; 
export type MonthlyPlanRankingRow = Views["v_monthly_plan_ranking"]; 

export async function getMonthlyPlanSummary(): Promise<MonthlyPlanSummaryRow | null> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("v_monthly_plan_summary").select("*").eq("user_id", uid).single();
  if (error) {
    // Quando não existe linha (nenhuma meta no plano), o PostgREST pode retornar 406.
    // Tratamos como null para a UI renderizar zero.
    const msg = String((error as any)?.message ?? "");
    if (msg.toLowerCase().includes("results contain 0 rows")) return null;
    if ((error as any)?.code === "PGRST116") return null;
    throw error;
  }
  return (data ?? null) as any;
}

export async function listMonthlyPlanGoals(): Promise<MonthlyPlanGoalRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("v_monthly_plan_goals")
    .select("*")
    .eq("user_id", uid)
    .eq("is_monthly_plan", true)
    .order("months_remaining", { ascending: true })
    .order("remaining_value", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function listMonthlyPlanRanking(): Promise<MonthlyPlanRankingRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("v_monthly_plan_ranking")
    .select("*")
    .eq("user_id", uid)
    .order("priority_rank", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}
