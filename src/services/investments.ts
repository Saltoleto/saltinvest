import { supabase, type Tables } from "@/lib/supabase";
import { requireUserId } from "./db";

export type InvestmentRow = Tables["investments"] & {
  class_name?: string | null;
  institution_name?: string | null;
  allocated_total?: number;
};

export type AllocationRow = Tables["investment_allocations"] & { goal_name?: string | null };

export async function listInvestments(): Promise<InvestmentRow[]> {
  const uid = await requireUserId();

  // join by foreign tables
  const { data, error } = await supabase
    .from("investments")
    .select("*, classes(name), institutions(name)")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as any[];

  // Fetch allocations totals in one query
  const ids = rows.map((x) => x.id).filter(Boolean);
  let totalsById: Record<string, number> = {};
  if (ids.length) {
    const { data: allocs, error: e2 } = await supabase
      .from("investment_allocations")
      .select("investment_id, amount")
      .in("investment_id", ids);
    if (e2) throw e2;
    totalsById = (allocs ?? []).reduce((acc: Record<string, number>, a: any) => {
      acc[a.investment_id] = (acc[a.investment_id] ?? 0) + (Number(a.amount) || 0);
      return acc;
    }, {});
  }

  return rows.map((r) => ({
    ...(r as any),
    class_name: r.classes?.name ?? null,
    institution_name: r.institutions?.name ?? null,
    allocated_total: totalsById[r.id] ?? 0
  }));
}

export async function getInvestment(id: string): Promise<Tables["investments"] | null> {
  const { data, error } = await supabase.from("investments").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as any;
}

export async function listAllocationsByInvestment(investmentId: string): Promise<AllocationRow[]> {
  const { data, error } = await supabase
    .from("investment_allocations")
    .select("*, goals(name)")
    .eq("investment_id", investmentId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((a: any) => ({ ...(a as any), goal_name: a.goals?.name ?? null })) as any;
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
  allocations: Array<{ goal_id: string; amount: number }>;
}): Promise<string> {
  const uid = await requireUserId();

  const invRow: Partial<Tables["investments"]> = {
    id: input.id,
    user_id: uid,
    name: input.name,
    total_value: input.total_value,
    class_id: input.class_id,
    institution_id: input.institution_id,
    liquidity_type: input.liquidity_type,
    due_date: input.liquidity_type === "vencimento" ? input.due_date : null,
    is_fgc_covered: input.is_fgc_covered,
    is_redeemed: false
  };

  const { data, error } = await supabase.from("investments").upsert(invRow, { onConflict: "id" }).select("id").single();
  if (error) throw error;

  const investmentId = data.id as string;

  // Replace allocations atomically: delete old then insert new.
  const { error: delErr } = await supabase.from("investment_allocations").delete().eq("investment_id", investmentId);
  if (delErr) throw delErr;

  const rows = input.allocations
    .filter((a) => a.amount > 0)
    .map((a) => ({ investment_id: investmentId, goal_id: a.goal_id, amount: a.amount }));

  if (rows.length) {
    const { error: insErr } = await supabase.from("investment_allocations").insert(rows);
    if (insErr) throw insErr;
  }

  return investmentId;
}

export async function setInvestmentRedeemed(id: string, redeemed: boolean): Promise<void> {
  const { error } = await supabase.from("investments").update({ is_redeemed: redeemed }).eq("id", id);
  if (error) throw error;
}

export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw error;
}
