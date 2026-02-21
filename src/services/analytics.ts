import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch } from "./cache";

const TTL_MS = 10_000;
const k = (uid: string, suffix: string) => `u:${uid}:analytics:${suffix}`;

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
  return cacheFetch(k(uid, "equity"), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("investimentos")
      .select("valor_total, liquidez, coberto_fgc, status")
      .eq("user_id", uid);
    if (error) throw error;

    let total = 0;
    let liquid = 0;
    let fgc = 0;

    for (const r of data ?? []) {
      const row: any = r;
      if (String(row.status) !== "ATIVO") continue;
      const v = Number(row.valor_total) || 0;
      total += v;
      if (String(row.liquidez).toUpperCase() === "DIARIA") liquid += v;
      if (row.coberto_fgc) fgc += v;
    }

    return { user_id: uid, total_equity: total, liquid_equity: liquid, fgc_protected_total: fgc };
  });
}

export async function getFgcExposure(): Promise<FgcExposureRow[]> {
  const uid = await requireUserId();
  return cacheFetch(k(uid, "fgc"), TTL_MS, async () => {
    const { data, error } = await supabase
      .from("investimentos")
      .select("valor_total, coberto_fgc, status, instituicoes(nome)")
      .eq("user_id", uid);
    if (error) throw error;

    const byInst: Record<string, { covered: number; uncovered: number; total: number }> = {};

    for (const r of data ?? []) {
      const row: any = r;
      if (String(row.status) !== "ATIVO") continue;
      const instName = String(row.instituicoes?.nome ?? "Sem instituição");
      const v = Number(row.valor_total) || 0;
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
  });
}

export async function countInvestmentsThisMonth(): Promise<number> {
  const uid = await requireUserId();
  const start = monthStartISO();
  return cacheFetch(k(uid, `count:${start}`), TTL_MS, async () => {
    const { count, error } = await supabase
      .from("investimentos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .gte("created_at", `${start}T00:00:00Z`);
    if (error) throw error;
    return count ?? 0;
  });
}
