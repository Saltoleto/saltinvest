import { supabase, type Tables } from "@/lib/supabase";
import { requireUserId } from "./db";

export async function listClasses(): Promise<Tables["classes"][]> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("classes").select("*").eq("user_id", uid).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function upsertClass(payload: { id?: string; name: string; target_percent: number }): Promise<void> {
  const uid = await requireUserId();
  const row = {
    id: payload.id,
    user_id: uid,
    name: payload.name,
    target_percent: payload.target_percent
  };
  const { error } = await supabase.from("classes").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw error;
}
