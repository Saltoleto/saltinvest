import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";

export type EquitySummary = {
  user_id: string;
  total_equity: number;
  liquid_equity: number;
  fgc_protected_total: number;
};

export type FgcExposureRow = {
  user_id: string;
  institution_name: string;
  covered_amount: number;
  uncovered_amount: number;
  total_in_institution: number;
};

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function getEquitySummary(): Promise<EquitySummary> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("aplicacoes")
    .select("valor_aplicado, liquidez, coberto_fgc, status")
    .eq("usuario_id", uid);
  if (error) throw error;

  let total = 0;
  let liquid = 0;
  let fgc = 0;
  for (const r of data ?? []) {
    const row: any = r;
    if (String(row.status) !== "ATIVA") continue;
    const v = Number(row.valor_aplicado) || 0;
    total += v;
    if (String(row.liquidez) === "DIARIA") liquid += v;
    if (row.coberto_fgc) fgc += v;
  }

  return { user_id: uid, total_equity: total, liquid_equity: liquid, fgc_protected_total: fgc };
}

export async function getFgcExposure(): Promise<FgcExposureRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("aplicacoes")
    .select("valor_aplicado, coberto_fgc, status, instituicoes_financeiras(nome)")
    .eq("usuario_id", uid);
  if (error) throw error;

  const byInst: Record<string, { covered: number; uncovered: number; total: number }> = {};
  for (const r of data ?? []) {
    const row: any = r;
    if (String(row.status) !== "ATIVA") continue;
    const instName = String(row.instituicoes_financeiras?.nome ?? "Sem instituição");
    const v = Number(row.valor_aplicado) || 0;
    byInst[instName] = byInst[instName] || { covered: 0, uncovered: 0, total: 0 };
    byInst[instName].total += v;
    if (row.coberto_fgc) byInst[instName].covered += v;
    else byInst[instName].uncovered += v;
  }

  return Object.entries(byInst)
    .map(([institution_name, v]) => ({
      user_id: uid,
      institution_name,
      covered_amount: v.covered,
      uncovered_amount: v.uncovered,
      total_in_institution: v.total
    }))
    .sort((a, b) => b.total_in_institution - a.total_in_institution);
}

export async function countInvestmentsThisMonth(): Promise<number> {
  const uid = await requireUserId();
  const start = monthStartISO();
  const { count, error } = await supabase
    .from("aplicacoes")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", uid)
    .gte("criado_em", `${start}T00:00:00Z`);
  if (error) throw error;
  return count ?? 0;
}
