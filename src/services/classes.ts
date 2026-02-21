import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch, cacheInvalidate } from "./cache";

// UI expects a legacy shape with an optional target_percent.
export type ClassRow = {
  id: string;
  user_id: string;
  name: string;
  target_percent: number | null;
  created_at: string | null;
  updated_at?: string | null;
};

const TTL_MS = 30_000;
const k = (uid: string, suffix: string) => `u:${uid}:classes:${suffix}`;

export async function listClasses(): Promise<ClassRow[]> {
  const uid = await requireUserId();
  return cacheFetch(k(uid, "list"), TTL_MS, async () => {
    const { data: classes, error: e1 } = await supabase
      .from("classes_investimento")
      .select("id, user_id, nome, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (e1) throw e1;

    const ids = (classes ?? []).map((c: any) => String(c.id));
    const pctById: Record<string, number> = {};
    if (ids.length) {
      const { data: targets, error: e2 } = await supabase
        .from("alvos_carteira")
        .select("classe_id, percentual_alvo")
        .eq("user_id", uid)
        .in("classe_id", ids);
      if (e2) throw e2;
      for (const t of targets ?? []) {
        pctById[String((t as any).classe_id)] = Number((t as any).percentual_alvo) || 0;
      }
    }

    return (classes ?? []).map((c: any) => ({
      id: String(c.id),
      user_id: String(c.user_id),
      name: String(c.nome),
      target_percent: pctById[String(c.id)] ?? 0,
      created_at: c.created_at ?? null,
      updated_at: null
    }));
  });
}

export async function upsertClass(payload: { id?: string; name: string; target_percent?: number | null }): Promise<void> {
  const uid = await requireUserId();
  const name = payload.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");

  let classId = payload.id;

  if (classId) {
    const { error } = await supabase.from("classes_investimento").update({ nome: name }).eq("id", classId).eq("user_id", uid);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("classes_investimento")
      .insert({ user_id: uid, nome: name })
      .select("id")
      .single();
    if (error) throw error;
    classId = String((data as any).id);
  }

  // Only targets screen should alter percentages, but we support it here for full compatibility.
  if (Object.prototype.hasOwnProperty.call(payload, "target_percent")) {
    const pct = Number(payload.target_percent ?? 0);

    // Remove existing target for this class (schema doesn't define a unique constraint).
    const { error: eDel } = await supabase.from("alvos_carteira").delete().eq("user_id", uid).eq("classe_id", classId);
    if (eDel) throw eDel;

    if (pct > 0) {
      const { error: eIns } = await supabase.from("alvos_carteira").insert({
        user_id: uid,
        classe_id: classId,
        percentual_alvo: pct
      });
      if (eIns) throw eIns;
    }
  }

  cacheInvalidate(`u:${uid}:classes:`);
}

export async function deleteClass(id: string): Promise<void> {
  const uid = await requireUserId();

  // Prevent deletion when investments are linked.
  const { count, error: eCount } = await supabase
    .from("investimentos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("classe_id", id);
  if (eCount) throw eCount;
  if ((count ?? 0) > 0) {
    throw new Error("Não é possível excluir: existem investimentos vinculados a esta classe. Reatribua-os antes de excluir.");
  }

  // Delete target rows.
  const { error: eDelTargets } = await supabase.from("alvos_carteira").delete().eq("user_id", uid).eq("classe_id", id);
  if (eDelTargets) throw eDelTargets;

  const { error } = await supabase.from("classes_investimento").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;

  cacheInvalidate(`u:${uid}:classes:`);
}
