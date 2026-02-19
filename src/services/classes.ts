import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";

// UI expects the legacy shape (classes table with `target_percent`).
export type ClassRow = {
  id: string;
  user_id: string;
  name: string;
  target_percent: number | null;
  created_at: string | null;
  updated_at?: string | null;
};

const DEFAULT_POLICY_NAME = "Política Principal";

async function getOrCreatePrimaryPolicyId(uid: string): Promise<string> {
  const { data: existing, error: e1 } = await supabase
    .from("politicas_alocacao")
    .select("id")
    .eq("usuario_id", uid)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (e1) throw e1;
  if (existing?.id) return String(existing.id);

  const { data, error } = await supabase
    .from("politicas_alocacao")
    .insert({ usuario_id: uid, nome: DEFAULT_POLICY_NAME })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

export async function listClasses(): Promise<ClassRow[]> {
  const uid = await requireUserId();
  const policyId = await getOrCreatePrimaryPolicyId(uid);

  const { data: cats, error: e1 } = await supabase
    .from("categorias_ativos")
    .select("id, usuario_id, nome, criado_em")
    .eq("usuario_id", uid)
    .order("criado_em", { ascending: false });
  if (e1) throw e1;

  const { data: items, error: e2 } = await supabase
    .from("politicas_alocacao_itens")
    .select("categoria_ativo_id, percentual_alvo")
    .eq("politica_alocacao_id", policyId);
  if (e2) throw e2;

  const pctByCat = (items ?? []).reduce((acc: Record<string, number>, r: any) => {
    acc[String(r.categoria_ativo_id)] = Number(r.percentual_alvo) || 0;
    return acc;
  }, {});

  return (cats ?? []).map((c: any) => ({
    id: String(c.id),
    user_id: String(c.usuario_id),
    name: String(c.nome),
    target_percent: pctByCat[String(c.id)] || 0,
    created_at: c.criado_em ?? null,
    updated_at: null
  }));
}

export async function upsertClass(payload: { id?: string; name: string; target_percent?: number | null }): Promise<void> {
  const uid = await requireUserId();
  const policyId = await getOrCreatePrimaryPolicyId(uid);

  const name = payload.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");

  let categoryId = payload.id;

  if (categoryId) {
    const { error } = await supabase.from("categorias_ativos").update({ nome: name }).eq("id", categoryId).eq("usuario_id", uid);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("categorias_ativos")
      .insert({ usuario_id: uid, nome: name })
      .select("id")
      .single();
    if (error) throw error;
    categoryId = String(data.id);
  }

  // Somente a tela de "Alvos" deve alterar percentuais.
  if (Object.prototype.hasOwnProperty.call(payload, "target_percent")) {
    const pct = Number(payload.target_percent ?? 0);
    if (pct > 0) {
      // Constraint requires 0 < percentual_alvo <= 100.
      const { error } = await supabase.from("politicas_alocacao_itens").upsert(
        {
          politica_alocacao_id: policyId,
          categoria_ativo_id: categoryId,
          percentual_alvo: pct
        },
        { onConflict: "politica_alocacao_id,categoria_ativo_id" }
      );
      if (error) throw error;
    } else {
      // Zero means "not part of target policy".
      const { error } = await supabase
        .from("politicas_alocacao_itens")
        .delete()
        .eq("politica_alocacao_id", policyId)
        .eq("categoria_ativo_id", categoryId);
      if (error) throw error;
    }
  }
}

export async function deleteClass(id: string): Promise<void> {
  const uid = await requireUserId();

  // Bloqueia exclusão se houver aplicações vinculadas (FK é RESTRICT).
  const { count, error: eCount } = await supabase
    .from("aplicacoes")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", uid)
    .eq("categoria_ativo_id", id);
  if (eCount) throw eCount;
  if ((count ?? 0) > 0) {
    throw new Error("Não é possível excluir: existem investimentos vinculados a esta classe. Reatribua-os antes de excluir.");
  }

  // Remove itens da política (FK é RESTRICT).
  const { error: eDelItens } = await supabase.from("politicas_alocacao_itens").delete().eq("categoria_ativo_id", id);
  if (eDelItens) throw eDelItens;

  const { error } = await supabase.from("categorias_ativos").delete().eq("id", id).eq("usuario_id", uid);
  if (error) throw error;
}
