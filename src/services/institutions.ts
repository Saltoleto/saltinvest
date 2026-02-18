import { supabase, type Tables } from "@/lib/supabase";
import { requireUserId } from "./db";

export async function listInstitutions(): Promise<Tables["institutions"][]> {
  const uid = await requireUserId();
  const { data, error } = await supabase.from("institutions").select("*").eq("user_id", uid).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function upsertInstitution(payload: { id?: string; name: string }): Promise<void> {
  const uid = await requireUserId();
  const row = { id: payload.id, user_id: uid, name: payload.name };
  const { error } = await supabase.from("institutions").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteInstitution(id: string): Promise<void> {
  const { error } = await supabase.from("institutions").delete().eq("id", id);
  if (error) throw error;
}
