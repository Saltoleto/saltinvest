import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch, cacheInvalidate } from "./cache";

export type InstitutionRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string | null;
  updated_at?: string | null;
};

const TTL_MS = 30_000;
const k = (uid: string, suffix: string) => `u:${uid}:institutions:${suffix}`;

export async function listInstitutions(): Promise<InstitutionRow[]> {
  const uid = await requireUserId();
  return cacheFetch(k(uid, "list"), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("instituicoes")
      .select("id, user_id, nome, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      name: String(r.nome),
      created_at: r.created_at ?? null,
      updated_at: null
    }));
  });
}

export async function upsertInstitution(payload: { id?: string; name: string }): Promise<void> {
  const uid = await requireUserId();
  const name = payload.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");

  if (payload.id) {
    const { error } = await supabase.from("instituicoes").update({ nome: name }).eq("id", payload.id).eq("user_id", uid);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("instituicoes").insert({ user_id: uid, nome: name });
    if (error) throw error;
  }

  cacheInvalidate(`u:${uid}:institutions:`);
}

export async function deleteInstitution(id: string): Promise<void> {
  const uid = await requireUserId();

  const { count, error: eCount } = await supabase
    .from("investimentos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("instituicao_id", id);
  if (eCount) throw eCount;
  if ((count ?? 0) > 0) {
    throw new Error("Não é possível excluir: existem investimentos vinculados a esta instituição. Reatribua-os antes de excluir.");
  }

  const { error } = await supabase.from("instituicoes").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;

  cacheInvalidate(`u:${uid}:institutions:`);
}
