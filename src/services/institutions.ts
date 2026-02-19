import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch, cacheInvalidate } from "./cache";

const TTL_MS = 30_000;
const key = (uid: string) => `u:${uid}:institutions:list`;

// UI expects legacy shape.
export type InstitutionRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string | null;
  updated_at?: string | null;
};

export async function listInstitutions(): Promise<InstitutionRow[]> {
  const uid = await requireUserId();
  return cacheFetch(key(uid), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("instituicoes_financeiras")
      .select("id, usuario_id, nome, criado_em")
      .eq("usuario_id", uid)
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      user_id: String(r.usuario_id),
      name: String(r.nome),
      created_at: r.criado_em ?? null,
      updated_at: null
    }));
  });
}

export async function upsertInstitution(payload: { id?: string; name: string }): Promise<void> {
  const uid = await requireUserId();
  const name = payload.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");

  if (payload.id) {
    const { error } = await supabase.from("instituicoes_financeiras").update({ nome: name }).eq("id", payload.id).eq("usuario_id", uid);
    if (error) throw error;
    cacheInvalidate(`u:${uid}:institutions:`);
    return;
  }

  const { error } = await supabase.from("instituicoes_financeiras").insert({ usuario_id: uid, nome: name });
  if (error) throw error;
  cacheInvalidate(`u:${uid}:institutions:`);
}

export async function deleteInstitution(id: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("instituicoes_financeiras").delete().eq("id", id).eq("usuario_id", uid);
  if (error) throw error;
  cacheInvalidate(`u:${uid}:institutions:`);
}
