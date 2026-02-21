import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch, cacheInvalidate } from "./cache";

const TTL_MS = 20_000;
const k = (uid: string, suffix: string) => `u:${uid}:goals:${suffix}`;

// Legacy shapes used across the UI.
export type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_value: number;
  target_date: string;
  start_date: string;
  is_monthly_plan: boolean;
  created_at: string | null;
  updated_at?: string | null;
};

export type GoalEvolutionRow = {
  user_id: string;
  goal_id: string;
  name: string;
  target_value: number;
  current_contributed: number;
  percent_progress: number;
  days_remaining: number;
  is_monthly_plan: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function diffDays(dateISO: string): number {
  const now = new Date();
  const target = new Date(`${dateISO}T00:00:00`);
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function listGoals(): Promise<GoalRow[]> {
  const uid = await requireUserId();
  return cacheFetch(k(uid, "list"), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("metas")
      .select("id, user_id, nome, valor_alvo, data_inicio, data_alvo, is_plano_mensal, created_at")
      .eq("user_id", uid)
      .order("data_alvo", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      name: String(r.nome),
      target_value: Number(r.valor_alvo) || 0,
      start_date: String(r.data_inicio),
      target_date: String(r.data_alvo),
      is_monthly_plan: !!r.is_plano_mensal,
      created_at: r.created_at ?? null,
      updated_at: null
    }));
  });
}

export async function upsertGoal(payload: {
  id?: string;
  name: string;
  target_value: number;
  target_date: string;
  start_date?: string;
  is_monthly_plan: boolean;
}): Promise<void> {
  // DB model blocks updates (trigger). We only allow inserts from the app.
  if (payload.id) {
    throw new Error("Pelo modelo de dados, metas não podem ser editadas (apenas criar e excluir). Exclua e cadastre novamente.");
  }

  const uid = await requireUserId();
  const row = {
    user_id: uid,
    nome: payload.name.trim(),
    valor_alvo: payload.target_value,
    data_inicio: payload.start_date || todayISO(),
    data_alvo: payload.target_date,
    is_plano_mensal: !!payload.is_monthly_plan
  };

  const { error } = await supabase.from("metas").insert(row);
  if (error) throw error;

  cacheInvalidate(k(uid, ""));
}

export async function deleteGoal(id: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("metas").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;

  cacheInvalidate(k(uid, ""));
}

export async function listGoalsEvolution(): Promise<GoalEvolutionRow[]> {
  const uid = await requireUserId();

  return cacheFetch(k(uid, "evolution"), TTL_MS, async () => {
    const { data: goals, error: e1 } = await supabase
      .from("metas")
      .select("id, nome, valor_alvo, data_alvo, is_plano_mensal")
      .eq("user_id", uid);
    if (e1) throw e1;

    const ids = (goals ?? []).map((g: any) => String(g.id));
    const sums: Record<string, number> = {};

    if (ids.length) {
      const { data: subs, error: e2 } = await supabase
        .from("submetas")
        .select("meta_id, valor_aportado")
        .eq("user_id", uid)
        .in("meta_id", ids);
      if (e2) throw e2;
      for (const s of subs ?? []) {
        const gid = String((s as any).meta_id);
        sums[gid] = (sums[gid] ?? 0) + (Number((s as any).valor_aportado) || 0);
      }
    }

    return (goals ?? []).map((g: any) => {
      const goalId = String(g.id);
      const target = Number(g.valor_alvo) || 0;
      const contributed = sums[goalId] ?? 0;
      const pct = target > 0 ? (contributed / target) * 100 : 0;
      return {
        user_id: uid,
        goal_id: goalId,
        name: String(g.nome),
        target_value: target,
        current_contributed: contributed,
        percent_progress: pct,
        days_remaining: diffDays(String(g.data_alvo)),
        is_monthly_plan: !!g.is_plano_mensal
      };
    });
  });
}
