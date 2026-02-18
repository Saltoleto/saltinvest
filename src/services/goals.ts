import { supabase, type Tables, type Views } from "@/lib/supabase";
import { requireUserId } from "./db";

export async function listGoals(): Promise<Tables["goals"][]> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", uid).order("target_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function listGoalsEvolution(): Promise<Views["v_goals_evolution"][]> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("v_goals_evolution").select("*").eq("user_id", uid).order("target_value", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function upsertGoal(payload: { id?: string; name: string; target_value: number; target_date: string; is_monthly_plan: boolean }): Promise<void> {
  const uid = await requireUserId();
  const row = { id: payload.id, user_id: uid, name: payload.name, target_value: payload.target_value, target_date: payload.target_date, is_monthly_plan: payload.is_monthly_plan };
  const { error } = await supabase.from("goals").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}
