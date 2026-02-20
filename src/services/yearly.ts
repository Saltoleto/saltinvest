import { supabase } from "@/lib/supabase";
import { requireUserId } from "./db";
import { cacheFetch } from "./cache";

const TTL_MS = 20_000;
const k = (uid: string, suffix: string) => `u:${uid}:yearly:${suffix}`;

export type YearGoalProjectionRow = {
  user_id: string;
  goal_id: string;
  name: string;
  target_value: number;
  is_monthly_plan: boolean;
  contributed_ytd: number;
  suggested_remaining_year: number;
  projected_end_year: number;
  progress_ytd_pct: number;
  progress_projected_pct: number;
};

export type YearMonthGoalDetail = {
  goal_id: string;
  name: string;
  target_value: number;
  is_monthly_plan: boolean;
  contributed: number;
  planned: number;
};

export type YearMonthBreakdownRow = {
  month: string; // YYYY-MM
  contributed: number;
  planned: number;
  contributed_cum: number;
  projected_cum: number;
  details: YearMonthGoalDetail[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
}

export async function listYearGoalProjections(year?: number): Promise<YearGoalProjectionRow[]> {
  const uid = await requireUserId();
  const now = new Date();
  const y = year ?? now.getFullYear();
  const yearStart = `${y}-01-01T00:00:00.000Z`;
  const nextYearStart = `${y + 1}-01-01T00:00:00.000Z`;
  const fromMonth = y === now.getFullYear() ? monthStartISO(now) : `${y}-01-01`.slice(0, 7) + "-01";
  const toMonth = `${y}-12-01`;

  return cacheFetch(k(uid, `goals:${y}`), TTL_MS, async () => {
    const { data: goals, error: eGoals } = await supabase
      .from("objetivos")
      .select("id, nome, valor_alvo, participa_plano_mensal")
      .eq("usuario_id", uid);
    if (eGoals) throw eGoals;

    const ids = (goals ?? []).map((g: any) => String(g.id));
    if (!ids.length) return [];

    // Aportes no ano
    const contributed: Record<string, number> = {};
    const { data: aportes, error: eA } = await supabase
      .from("aportes")
      .select("objetivo_id, valor_aporte, aportado_em")
      .eq("usuario_id", uid)
      .in("objetivo_id", ids)
      .gte("aportado_em", yearStart)
      .lt("aportado_em", nextYearStart);
    if (eA) throw eA;
    for (const a of aportes ?? []) {
      const gid = String((a as any).objetivo_id);
      contributed[gid] = (contributed[gid] ?? 0) + (Number((a as any).valor_aporte) || 0);
    }

    // Projeção: soma do valor_planejado do plano mensal até o fim do ano
    // (baseado na visão v_plano_mensal_detalhe)
    const suggestedByGoal: Record<string, number> = {};
    const { data: planRows, error: eP } = await supabase
      .from("v_plano_mensal_detalhe")
      .select("objetivo_id, mes_referencia, valor_planejado, participa_plano_mensal")
      .eq("usuario_id", uid)
      .eq("participa_plano_mensal", true)
      .gte("mes_referencia", fromMonth)
      .lte("mes_referencia", toMonth)
      .in("objetivo_id", ids);
    if (eP) throw eP;
    for (const r of planRows ?? []) {
      const gid = String((r as any).objetivo_id);
      suggestedByGoal[gid] = (suggestedByGoal[gid] ?? 0) + (Number((r as any).valor_planejado) || 0);
    }

    return (goals ?? []).map((g: any) => {
      const gid = String(g.id);
      const target = Number(g.valor_alvo) || 0;
      const ytd = contributed[gid] ?? 0;
      const suggested = suggestedByGoal[gid] ?? 0;
      const projected = ytd + suggested;
      const pctYtd = target > 0 ? (ytd / target) * 100 : 0;
      const pctProj = target > 0 ? (projected / target) * 100 : 0;
      return {
        user_id: uid,
        goal_id: gid,
        name: String(g.nome),
        target_value: target,
        is_monthly_plan: !!g.participa_plano_mensal,
        contributed_ytd: ytd,
        suggested_remaining_year: suggested,
        projected_end_year: projected,
        progress_ytd_pct: pctYtd,
        progress_projected_pct: pctProj
      } as YearGoalProjectionRow;
    });
  });
}

function ym(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthsOfYear(y: number): string[] {
  return Array.from({ length: 12 }).map((_, i) => `${y}-${pad2(i + 1)}`);
}

/**
 * Month-by-month breakdown for the "Metas no ano" experience.
 * - contributed: sum of aportes in the month
 * - planned: sum of planned amounts from v_plano_mensal_detalhe in the month (only goals in monthly plan)
 * - projected_cum: cumulative projection from current month onward
 */
export async function listYearMonthBreakdown(year?: number): Promise<YearMonthBreakdownRow[]> {
  const uid = await requireUserId();
  const now = new Date();
  const y = year ?? now.getFullYear();

  const yearStart = `${y}-01-01T00:00:00.000Z`;
  const nextYearStart = `${y + 1}-01-01T00:00:00.000Z`;

  return cacheFetch(k(uid, `months:${y}`), TTL_MS, async () => {
    const { data: goals, error: eGoals } = await supabase
      .from("objetivos")
      .select("id, nome, valor_alvo, participa_plano_mensal")
      .eq("usuario_id", uid);
    if (eGoals) throw eGoals;

    const goalById = new Map<string, { name: string; target: number; plan: boolean }>();
    for (const g of goals ?? []) {
      goalById.set(String((g as any).id), {
        name: String((g as any).nome),
        target: Number((g as any).valor_alvo) || 0,
        plan: !!(g as any).participa_plano_mensal
      });
    }
    const ids = Array.from(goalById.keys());
    if (!ids.length) return [];

    // Contribuições por mês e meta
    const contribByYm: Record<string, Record<string, number>> = {};
    const { data: aportes, error: eA } = await supabase
      .from("aportes")
      .select("objetivo_id, valor_aporte, aportado_em")
      .eq("usuario_id", uid)
      .in("objetivo_id", ids)
      .gte("aportado_em", yearStart)
      .lt("aportado_em", nextYearStart);
    if (eA) throw eA;
    for (const a of aportes ?? []) {
      const gid = String((a as any).objetivo_id);
      const dt = new Date(String((a as any).aportado_em));
      const key = ym(dt);
      contribByYm[key] = contribByYm[key] ?? {};
      contribByYm[key][gid] = (contribByYm[key][gid] ?? 0) + (Number((a as any).valor_aporte) || 0);
    }

    // Planejado por mês e meta (somente metas do plano mensal)
    const plannedByYm: Record<string, Record<string, number>> = {};
    const { data: planRows, error: eP } = await supabase
      .from("v_plano_mensal_detalhe")
      .select("objetivo_id, mes_referencia, valor_planejado, participa_plano_mensal")
      .eq("usuario_id", uid)
      .eq("participa_plano_mensal", true)
      .gte("mes_referencia", `${y}-01-01`)
      .lte("mes_referencia", `${y}-12-31`)
      .in("objetivo_id", ids);
    if (eP) throw eP;
    for (const r of planRows ?? []) {
      const gid = String((r as any).objetivo_id);
      const d = new Date(String((r as any).mes_referencia));
      const key = ym(d);
      plannedByYm[key] = plannedByYm[key] ?? {};
      plannedByYm[key][gid] = (plannedByYm[key][gid] ?? 0) + (Number((r as any).valor_planejado) || 0);
    }

    const months = monthsOfYear(y);
    const currentYm = ym(now);

    let cumContrib = 0;
    let cumProjected = 0;

    const out: YearMonthBreakdownRow[] = [];
    for (const m of months) {
      const cMap = contribByYm[m] ?? {};
      const pMap = plannedByYm[m] ?? {};

      let contributed = 0;
      let planned = 0;

      const details: YearMonthGoalDetail[] = [];
      for (const gid of ids) {
        const meta = goalById.get(gid)!;
        const c = Number(cMap[gid] ?? 0);
        const p = Number(pMap[gid] ?? 0);
        if (c !== 0 || p !== 0) {
          details.push({
            goal_id: gid,
            name: meta.name,
            target_value: meta.target,
            is_monthly_plan: meta.plan,
            contributed: c,
            planned: p
          });
        }
        contributed += c;
        planned += p;
      }

      cumContrib += contributed;

      // Projection: past months follow actual; from current month onward, add planned for future months
      const isFuture = m > currentYm;
      const isCurrent = m === currentYm;
      if (out.length === 0) {
        // initialize at Jan
        cumProjected = cumContrib;
      } else {
        if (isFuture) {
          cumProjected += planned;
        } else if (isCurrent) {
          cumProjected = cumContrib; // reset baseline at current month
        } else {
          cumProjected = cumContrib;
        }
      }

      out.push({
        month: m,
        contributed,
        planned,
        contributed_cum: cumContrib,
        projected_cum: cumProjected,
        details: details.sort((a, b) => (b.contributed + b.planned) - (a.contributed + a.planned))
      });
    }

    return out;
  });
}
