import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";


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
  return String(v) === "DIARIA" ? "diaria" : "vencimento";
}

function mapLegacyToLiquidez(v: "diaria" | "vencimento"): "DIARIA" | "NO_VENCIMENTO" {
  return v === "diaria" ? "DIARIA" : "NO_VENCIMENTO";
}

function normalizeClassId(input: string | null | undefined): string {
  if (input) return input;
  throw new Error("Classe é obrigatória.");
}

export async function listInvestments(): Promise<InvestmentRow[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("aplicacoes")
    .select("id, usuario_id, nome, valor_aplicado, categoria_ativo_id, instituicao_financeira_id, liquidez, data_vencimento, coberto_fgc, status, criado_em, atualizado_em, categorias_ativos(nome), instituicoes_financeiras(nome)")
    .eq("usuario_id", uid)
    .order("criado_em", { ascending: false });
  if (error) throw error;

  const appIds = (data ?? []).map((r: any) => String(r.id));
  const totalsById: Record<string, number> = {};
  if (appIds.length) {
    const { data: aportes, error: e2 } = await supabase
      .from("aportes")
      .select("aplicacao_id, valor_aporte")
      .eq("usuario_id", uid)
      .in("aplicacao_id", appIds);
    if (e2) throw e2;
    for (const a of aportes ?? []) {
      const id = String((a as any).aplicacao_id);
      totalsById[id] = (totalsById[id] ?? 0) + (Number((a as any).valor_aporte) || 0);
    }
  }

  return Promise.all(
    (data ?? []).map(async (r: any) => {
      const className = r.categorias_ativos?.nome ?? null;
      const rawCatId = String(r.categoria_ativo_id);
      const uiCatId = rawCatId;

      return {
        id: String(r.id),
        user_id: String(r.usuario_id),
        name: String(r.nome),
        total_value: Number(r.valor_aplicado) || 0,
        class_id: uiCatId,
        institution_id: r.instituicao_financeira_id ? String(r.instituicao_financeira_id) : null,
        due_date: r.data_vencimento ?? null,
        liquidity_type: mapLiquidezToLegacy(String(r.liquidez)),
        is_fgc_covered: !!r.coberto_fgc,
        is_redeemed: String(r.status) === "RESGATADA",
        created_at: r.criado_em ?? null,
        updated_at: r.atualizado_em ?? null,
        class_name: String(className ?? "") || null,
        institution_name: r.instituicoes_financeiras?.nome ?? null,
        allocated_total: totalsById[String(r.id)] ?? 0
      } as InvestmentRow;
    })
  );
}

export async function getInvestment(id: string): Promise<InvestmentRow | null> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("aplicacoes")
    .select("id, usuario_id, nome, valor_aplicado, categoria_ativo_id, instituicao_financeira_id, liquidez, data_vencimento, coberto_fgc, status, criado_em, atualizado_em, categorias_ativos(nome), instituicoes_financeiras(nome)")
    .eq("id", id)
    .eq("usuario_id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const rawCatId = String((data as any).categoria_ativo_id);
  const uiCatId = rawCatId;

  return {
    id: String((data as any).id),
    user_id: String((data as any).usuario_id),
    name: String((data as any).nome),
    total_value: Number((data as any).valor_aplicado) || 0,
    class_id: uiCatId,
    institution_id: (data as any).instituicao_financeira_id ? String((data as any).instituicao_financeira_id) : null,
    due_date: (data as any).data_vencimento ?? null,
    liquidity_type: mapLiquidezToLegacy(String((data as any).liquidez)),
    is_fgc_covered: !!(data as any).coberto_fgc,
    is_redeemed: String((data as any).status) === "RESGATADA",
    created_at: (data as any).criado_em ?? null,
    updated_at: (data as any).atualizado_em ?? null,
    class_name: (data as any).categorias_ativos?.nome ?? null,
    institution_name: (data as any).instituicoes_financeiras?.nome ?? null
  };
}

export async function listAllocationsByInvestment(investmentId: string): Promise<AllocationRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("aportes")
    .select("id, aplicacao_id, objetivo_id, valor_aporte, criado_em, objetivos(nome)")
    .eq("usuario_id", uid)
    .eq("aplicacao_id", investmentId)
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: String(r.id),
    investment_id: String(r.aplicacao_id),
    goal_id: String(r.objetivo_id),
    amount: Number(r.valor_aporte) || 0,
    created_at: r.criado_em ?? null,
    goal_name: r.objetivos?.nome ?? null
  }));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
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
    usuario_id: uid,
    nome: input.name.trim(),
    valor_aplicado: input.total_value,
    categoria_ativo_id: classId,
    instituicao_financeira_id: input.institution_id,
    liquidez,
    data_vencimento: due,
    coberto_fgc: !!input.is_fgc_covered,
    status: "ATIVA"
  };

  const { data: saved, error } = await supabase.from("aplicacoes").upsert(row).select("id").single();
  if (error) throw error;
  const appId = String(saved.id);

  // Replace aportes (allocations) for this application.
  const { error: eDel } = await supabase.from("aportes").delete().eq("usuario_id", uid).eq("aplicacao_id", appId);
  if (eDel) throw eDel;

  const allocs = (input.allocations ?? []).filter((a) => Number(a.amount) > 0);
  if (allocs.length) {
    const goalIds = allocs.map((a) => a.goal_id);
    const m = monthStartISO();
    const { data: parcelas, error: ePar } = await supabase
      .from("parcelas_objetivo")
      .select("id, objetivo_id")
      .eq("usuario_id", uid)
      .eq("mes_referencia", m)
      .in("objetivo_id", goalIds);
    if (ePar) throw ePar;
    const parcelaByGoal: Record<string, string> = {};
    for (const p of parcelas ?? []) parcelaByGoal[String((p as any).objetivo_id)] = String((p as any).id);

    const nowIso = new Date().toISOString();
    const toInsert = allocs.map((a) => ({
      usuario_id: uid,
      aplicacao_id: appId,
      objetivo_id: a.goal_id,
      parcela_objetivo_id: parcelaByGoal[a.goal_id] ?? null,
      valor_aporte: Number(a.amount) || 0,
      aportado_em: nowIso
    }));
    const { error: eIns } = await supabase.from("aportes").insert(toInsert);
    if (eIns) throw eIns;
  }

  return appId;
}

export async function setInvestmentRedeemed(id: string, value: boolean): Promise<void> {
  if (!value) {
    throw new Error("Pelo modelo de dados, resgates não podem ser revertidos pelo app.");
  }

  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("aplicacoes")
    .select("id, valor_aplicado")
    .eq("id", id)
    .eq("usuario_id", uid)
    .single();
  if (error) throw error;

  const valor = Number((data as any).valor_aplicado) || 0;
  const { error: e2 } = await supabase.rpc("fn_aplicacoes_resgatar", { p_aplicacao_id: id, p_valor_resgatado: valor });
  if (e2) throw e2;
}

export async function deleteInvestment(id: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("aplicacoes").delete().eq("id", id).eq("usuario_id", uid);
  if (error) throw error;
}
