import { supabase } from "@/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

export function asErrorMessage(err: unknown): string {
  const e = err as any;
  return e?.message ?? "Erro inesperado.";
}

export function pgErrorMessage(err: PostgrestError | null): string | null {
  if (!err) return null;
  return err.message;
}

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Usuário não autenticado.");
  return data.user.id;
}

export function monthRangeISO(d = new Date()): { start: string; end: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}
