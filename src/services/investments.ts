import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch, cacheInvalidate } from "./cache";

const TTL_MS = 15_000;
const k = (uid: string, suffix: string) => `u:${uid}:investments:${suffix}`;

// Legacy shapes used by existing UI.
export type InvestmentRow = {
  id: string;
  user_id: string;
  name: string;
  total_value: number;
  class_id: string | null;
  institution_id: string | null;
  due_date: string | null;
  liquidity_type: "diaria" | "vencimento";
  is_fgc_covered: boolean;
  is_redeemed: boolean;
  created_at: string | null;
  updated_at: string | null;
  class_name?: string | null;
  institution_name?: string | null;
  allocated_total?: number;
};

export type AllocationRow = {
  id: string;
  investment_id: string;
  goal_id: string;
  amount: number;
  created_at: string | null;
  goal_name?: string | null;
};

function mapLiquidezToLegacy(v: string): "diaria" | "vencimento" {
  // SQL defines `liquidez` as TEXT. We consider DIARIA as daily and everything else as due-date.
  return String(v).toUpperCase() === "DIARIA" ? "diaria" : "vencimento";
}

function mapLegacyToLiquidez(v: "diaria" | "vencimento"): string {
  return v === "diaria" ? "DIARIA" : "NO_VENCIMENTO";
}

function normalizeClassId(input: string | null | undefined): string {
  if (input) return input;
  throw new Error("Classe é obrigatória.");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

export async function listInvestments(opts?: { goal_id?: string | null }): Promise<InvestmentRow[]> {
  const uid = await requireUserId();

  const goalId = opts?.goal_id ? String(opts.goal_id) : "";
  return cacheFetch(k(uid, `list:${goalId || "all"}`), TTL_MS, async () => {
    let restrictIds: string[] | null = null;

    if (goalId) {
      // Investments that have allocations to submetas of that meta.
      const { data: subs, error: eS } = await supabase
        .from("submetas")
        .select("id")
        .eq("user_id", uid)
        .eq("meta_id", goalId);
      if (eS) throw eS;
      const subIds = (subs ?? []).map((s: any) => String(s.id));
      if (!subIds.length) return [];

      const { data: allocs, error: eA } = await supabase
        .from("alocacoes_investimento")
        .select("investimento_id")
        .eq("user_id", uid)
        .in("submeta_id", subIds);
      if (eA) throw eA;
      const ids = Array.from(new Set((allocs ?? []).map((a: any) => String(a.investimento_id)))).filter(Boolean);
      if (!ids.length) return [];
      restrictIds = ids;
    }

    let q = supabase
      .from("investimentos")
      .select(
        "id, user_id, nome, valor_total, classe_id, instituicao_id, liquidez, data_vencimento, coberto_fgc, status, created_at, classes_investimento(nome), instituicoes(nome)"
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (restrictIds) q = q.in("id", restrictIds);

    const { data, error } = await q;
    if (error) throw error;

    const invIds = (data ?? []).map((r: any) => String(r.id));
    const totalsById: Record<string, number> = {};
    if (invIds.length) {
      const { data: allocs, error: e2 } = await supabase
        .from("alocacoes_investimento")
        .select("investimento_id, valor_alocado")
        .eq("user_id", uid)
        .in("investimento_id", invIds);
      if (e2) throw e2;
      for (const a of allocs ?? []) {
        const id = String((a as any).investimento_id);
        totalsById[id] = (totalsById[id] ?? 0) + (Number((a as any).valor_alocado) || 0);
      }
    }

    return (data ?? []).map((r: any) => {
      return {
        id: String(r.id),
        user_id: String(r.user_id),
        name: String(r.nome),
        total_value: Number(r.valor_total) || 0,
        class_id: r.classe_id ? String(r.classe_id) : null,
        institution_id: r.instituicao_id ? String(r.instituicao_id) : null,
        due_date: r.data_vencimento ?? null,
        liquidity_type: mapLiquidezToLegacy(String(r.liquidez ?? "")),
        is_fgc_covered: !!r.coberto_fgc,
        is_redeemed: String(r.status) === "RESGATADO",
        created_at: r.created_at ?? null,
        updated_at: null,
        class_name: r.classes_investimento?.nome ?? null,
        institution_name: r.instituicoes?.nome ?? null,
        allocated_total: totalsById[String(r.id)] ?? 0
      } as InvestmentRow;
    });
  });
}

export async function getInvestment(id: string): Promise<InvestmentRow | null> {
  const uid = await requireUserId();
  return cacheFetch(k(uid, `get:${id}`), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("investimentos")
      .select(
        "id, user_id, nome, valor_total, classe_id, instituicao_id, liquidez, data_vencimento, coberto_fgc, status, created_at, classes_investimento(nome), instituicoes(nome)"
      )
      .eq("id", id)
      .eq("user_id", uid)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return {
      id: String((data as any).id),
      user_id: String((data as any).user_id),
      name: String((data as any).nome),
      total_value: Number((data as any).valor_total) || 0,
      class_id: (data as any).classe_id ? String((data as any).classe_id) : null,
      institution_id: (data as any).instituicao_id ? String((data as any).instituicao_id) : null,
      due_date: (data as any).data_vencimento ?? null,
      liquidity_type: mapLiquidezToLegacy(String((data as any).liquidez ?? "")),
      is_fgc_covered: !!(data as any).coberto_fgc,
      is_redeemed: String((data as any).status) === "RESGATADO",
      created_at: (data as any).created_at ?? null,
      updated_at: null,
      class_name: (data as any).classes_investimento?.nome ?? null,
      institution_name: (data as any).instituicoes?.nome ?? null
    };
  });
}

export async function listAllocationsByInvestment(investmentId: string): Promise<AllocationRow[]> {
  const uid = await requireUserId();
  return cacheFetch(k(uid, `alloc:${investmentId}`), TTL_MS, async () => {
    // Join: allocations -> submetas -> metas (name)
    const { data, error } = await supabase
      .from("alocacoes_investimento")
      .select("id, investimento_id, submeta_id, valor_alocado, created_at, submetas(meta_id, metas(nome))")
      .eq("user_id", uid)
      .eq("investimento_id", investmentId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      id: String(r.id),
      investment_id: String(r.investimento_id),
      goal_id: String(r.submetas?.meta_id ?? ""),
      amount: Number(r.valor_alocado) || 0,
      created_at: r.created_at ?? null,
      goal_name: r.submetas?.metas?.nome ?? null
    }));
  });
}

async function pickSubmetaIdsForGoals(uid: string, goalIds: string[]): Promise<Record<string, string>> {
  const month = monthStartISO();

  // Prefer current month ABERTA, else earliest ABERTA.
  const { data: current, error: e1 } = await supabase
    .from("submetas")
    .select("id, meta_id")
    .eq("user_id", uid)
    .in("meta_id", goalIds)
    .eq("status", "ABERTA")
    .eq("data_referencia", month);
  if (e1) throw e1;

  const byGoal: Record<string, string> = {};
  for (const s of current ?? []) byGoal[String((s as any).meta_id)] = String((s as any).id);

  const remaining = goalIds.filter((gid) => !byGoal[gid]);
  if (!remaining.length) return byGoal;

  const { data: earliest, error: e2 } = await supabase
    .from("submetas")
    .select("id, meta_id, data_referencia")
    .eq("user_id", uid)
    .in("meta_id", remaining)
    .eq("status", "ABERTA")
    .order("data_referencia", { ascending: true });
  if (e2) throw e2;

  for (const s of earliest ?? []) {
    const gid = String((s as any).meta_id);
    if (!byGoal[gid]) byGoal[gid] = String((s as any).id);
  }

  return byGoal;
}

export async function saveInvestmentWithAllocations(input: {
  id?: string;
  name: string;
  total_value: number;
  class_id: string | null;
  institution_id: string | null;
  liquidity_type: "diaria" | "vencimento";
  due_date: string | null;
  is_fgc_covered: boolean;
  allocations: { goal_id: string; amount: number }[];
}): Promise<string> {
  const uid = await requireUserId();

  const classId = normalizeClassId(input.class_id);
  const liquidez = mapLegacyToLiquidez(input.liquidity_type);
  const due = input.liquidity_type === "vencimento" ? input.due_date : null;

  const row: any = {
    id: input.id,
    user_id: uid,
    nome: input.name.trim(),
    valor_total: input.total_value,
    classe_id: classId,
    instituicao_id: input.institution_id,
    liquidez,
    data_vencimento: due,
    coberto_fgc: !!input.is_fgc_covered,
    status: "ATIVO"
  };

  const { data: saved, error } = await supabase.from("investimentos").upsert(row).select("id").single();
  if (error) throw error;
  const invId = String((saved as any).id);

  // Replace allocations for this investment.
  const { error: eDel } = await supabase.from("alocacoes_investimento").delete().eq("user_id", uid).eq("investimento_id", invId);
  if (eDel) throw eDel;

  const allocs = (input.allocations ?? []).filter((a) => Number(a.amount) > 0);
  if (allocs.length) {
    const goalIds = allocs.map((a) => String(a.goal_id));
    const submetaByGoal = await pickSubmetaIdsForGoals(uid, goalIds);

    const toInsert = allocs.map((a) => {
      const submetaId = submetaByGoal[String(a.goal_id)];
      if (!submetaId) {
        throw new Error("Não foi possível encontrar uma parcela aberta para a meta selecionada. Verifique as submetas/parcelas.");
      }
      return {
        user_id: uid,
        investimento_id: invId,
        submeta_id: submetaId,
        valor_alocado: Number(a.amount) || 0
      };
    });

    const { error: eIns } = await supabase.from("alocacoes_investimento").insert(toInsert);
    if (eIns) throw eIns;
  }

  cacheInvalidate(`u:${uid}:investments:`);
  cacheInvalidate(`u:${uid}:goals:`);
  cacheInvalidate(`u:${uid}:monthly:`);
  cacheInvalidate(`u:${uid}:analytics:`);
  cacheInvalidate(`u:${uid}:yearly:`);

  return invId;
}

export async function setInvestmentRedeemed(id: string, value: boolean): Promise<void> {
  if (!value) {
    throw new Error("Pelo modelo de dados, resgates não podem ser revertidos pelo app.");
  }

  const uid = await requireUserId();
  const { error } = await supabase
    .from("investimentos")
    .update({ status: "RESGATADO" })
    .eq("id", id)
    .eq("user_id", uid);
  if (error) throw error;

  cacheInvalidate(`u:${uid}:investments:`);
  cacheInvalidate(`u:${uid}:analytics:`);
}

export async function deleteInvestment(id: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("investimentos").delete().eq("id", id).eq("user_id", uid);
  if (error) throw error;

  cacheInvalidate(`u:${uid}:investments:`);
  cacheInvalidate(`u:${uid}:analytics:`);
}
