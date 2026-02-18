import { supabase, type Views } from "@/lib/supabase";
import { requireUserId, monthRangeISO } from "./db";

export async function getEquitySummary(): Promise<Views["v_equity_summary"] | null> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("v_equity_summary").select("*").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return (data ?? null) as any;
}

export async function getFgcExposure(): Promise<Views["v_fgc_exposure"][]> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("v_fgc_exposure").select("*").eq("user_id", uid).order("total_in_institution", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function countInvestmentsThisMonth(): Promise<number> {
  const uid = await requireUserId();
  const { start, end } = monthRangeISO(new Date());
  const { count, error } = await supabase
    .from("investments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid)
    .gte("created_at", start)
    .lte("created_at", end);
  if (error) throw error;
  return count ?? 0;
}

export async function getTodayInsights(): Promise<any[] | null> {
  const uid = await requireUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("insights").select("content").eq("user_id", uid).eq("insight_date", today).maybeSingle();
  if (error) throw error;
  return (data?.content as any[]) ?? null;
}

export async function upsertTodayInsights(content: any[]): Promise<void> {
  const uid = await requireUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("insights").upsert({ user_id: uid, insight_date: today, content }, { onConflict: "user_id,insight_date" });
  if (error) throw error;
}
