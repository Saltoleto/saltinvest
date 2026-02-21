import React from "react";
import Card from "@/ui/primitives/Card";
import Input from "@/ui/primitives/Input";
import Select from "@/ui/primitives/Select";
import Toggle from "@/ui/primitives/Toggle";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import Skeleton from "@/ui/primitives/Skeleton";
import { useAsync } from "@/state/useAsync";
import { listClasses } from "@/services/classes";
import { listInstitutions } from "@/services/institutions";
import { listGoalsEvolution } from "@/services/goals";
import { getInvestment, listAllocationsByInvestment, saveInvestmentWithAllocations } from "@/services/investments";
import { listMonthlyPlanGoals } from "@/services/monthly";
import { formatBRL, formatPercent, clamp } from "@/lib/format";
import { sum, toNumberBRL, requireNonEmpty, requirePositiveNumber } from "@/lib/validate";
import { maskBRLCurrencyInput } from "@/lib/masks";
import { useToast } from "@/ui/feedback/Toast";

export type InvestmentFormHandle = {
  save: () => Promise<void>;
  isSaving: boolean;
  isBusy: boolean;
};

type Props = {
  mode: "create" | "edit";
  investmentId?: string;
  onClose: () => void;
  onSaved: () => void;
  onMetaChange?: (m: { isSaving: boolean; isBusy: boolean }) => void;
};

export const InvestmentForm = React.forwardRef<InvestmentFormHandle, Props>(function InvestmentForm(
  { mode, investmentId, onClose, onSaved, onMetaChange },
  ref
) {
  const toast = useToast();

  const classes = useAsync(() => listClasses(), []);
  const inst = useAsync(() => listInstitutions(), []);
  const goals = useAsync(() => listGoalsEvolution(), []);
  const monthly = useAsync(() => listMonthlyPlanGoals(), []);
  const existing = useAsync(() => (mode === "edit" && investmentId ? getInvestment(investmentId) : Promise.resolve(null)), [mode, investmentId]);
  const existingAlloc = useAsync(() => (mode === "edit" && investmentId ? listAllocationsByInvestment(investmentId) : Promise.resolve([])), [mode, investmentId]);

  const isRedeemed = mode === "edit" && !!existing.data?.is_redeemed;

  const [name, setName] = React.useState("");
  const [totalValue, setTotalValue] = React.useState("");
  const [classId, setClassId] = React.useState<string | "">("");
  const [institutionId, setInstitutionId] = React.useState<string | "">("");
  const [liquidity, setLiquidity] = React.useState<"diaria" | "vencimento">("diaria");
  const [dueDate, setDueDate] = React.useState("");
  const [fgc, setFgc] = React.useState(false);

  const [alloc, setAlloc] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [errs, setErrs] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    onMetaChange?.({
      isSaving: saving,
      isBusy:
        saving ||
        classes.loading ||
        inst.loading ||
        goals.loading ||
        monthly.loading ||
        (mode === "edit" && (existing.loading || existingAlloc.loading)) ||
        isRedeemed
    });
  }, [saving, classes.loading, inst.loading, goals.loading, monthly.loading, mode, existing.loading, existingAlloc.loading, isRedeemed, onMetaChange]);

  function resetForCreate() {
    setName("");
    setTotalValue("");
    setClassId("");
    setInstitutionId("");
    setLiquidity("diaria");
    setDueDate("");
    setFgc(false);
    setAlloc({});
    setErrs({});
  }

  React.useEffect(() => {
    if (mode === "create") {
      resetForCreate();
      return;
    }
    if (!existing.data) return;

    setName(existing.data.name ?? "");
    setTotalValue(existing.data.total_value != null ? formatBRL(Number(existing.data.total_value)) : "");
    setClassId(existing.data.class_id ?? "");
    setInstitutionId(existing.data.institution_id ?? "");
    setLiquidity((existing.data.liquidity_type as any) || "diaria");
    setDueDate(existing.data.due_date ?? "");
    setFgc(!!existing.data.is_fgc_covered);
  }, [mode, existing.data]);

  React.useEffect(() => {
    if (mode !== "edit") return;
    const map: Record<string, string> = {};
    for (const a of existingAlloc.data ?? []) {
      map[a.goal_id] = a.amount != null ? formatBRL(Number(a.amount)) : "";
    }
    setAlloc(map);
  }, [mode, existingAlloc.data]);

  const total = toNumberBRL(totalValue);

  const monthlyByGoal = React.useMemo(() => {
    const map: Record<string, { suggested: number; remaining: number }> = {};
    for (const r of monthly.data ?? []) {
      const gid = (r as any).goal_id as string;
      map[gid] = {
        suggested: Number((r as any).suggested_this_month) || 0,
        remaining: Number((r as any).remaining_this_month) || 0
      };
    }
    return map;
  }, [monthly.data]);

  const allocations = React.useMemo(() => {
    // UX: don't allow allocating new money to goals already completed (>= 100%).
    // When editing an investment, keep showing goals that already have allocation values,
    // even if the goal later became completed, so the user can understand/review.
    const rows = (goals.data ?? []).filter((g) => {
      const pct = Number(g.percent_progress) || 0;
      const currentAmount = toNumberBRL(alloc[g.goal_id] ?? "0");
      return pct < 99.999 || currentAmount > 0;
    });

    return rows.map((g) => ({
      goal_id: g.goal_id,
      name: g.name,
      percent_progress: Number(g.percent_progress) || 0,
      is_monthly_plan: !!g.is_monthly_plan,
      days_remaining: Number(g.days_remaining) || 0,
      amount: toNumberBRL(alloc[g.goal_id] ?? "0"),
      suggested: monthlyByGoal[g.goal_id]?.remaining ?? 0
    }));
  }, [goals.data, alloc, monthlyByGoal]);

  const allocatedTotal = sum(allocations.map((x) => x.amount));
  const remainingToAllocate = Math.max(0, total - allocatedTotal);
  const overAllocated = allocatedTotal > total + 0.0001;

  function setAllocation(goalId: string, value: string) {
    setAlloc((s) => ({ ...s, [goalId]: value }));
  }

  function autoDistribute() {
    const candidates = allocations.filter((a) => a.is_monthly_plan);
    if (!candidates.length) {
      toast.push({ title: "Sem metas no plano", message: "Ative “Plano do mês” em uma meta para usar auto-distribuição.", tone: "warning" });
      return;
    }
    if (total <= 0) {
      toast.push({ title: "Defina o valor do investimento", tone: "warning" });
      return;
    }

    const next: Record<string, string> = { ...alloc };
    const suggestedSum = sum(candidates.map((c) => Math.max(0, c.suggested || 0)));

    if (suggestedSum > 0) {
      const scale = suggestedSum > total ? total / suggestedSum : 1;
      for (const c of candidates) {
        const v = Math.max(0, (c.suggested || 0) * scale);
        next[c.goal_id] = v ? formatBRL(v) : "";
      }
    } else {
      const each = total / candidates.length;
      for (const c of candidates) next[c.goal_id] = each ? formatBRL(each) : "";
    }

    setAlloc(next);
    toast.push({ title: "Distribuição automática aplicada", tone: "success" });
  }

  function applySuggested(goalId: string) {
    const s = monthlyByGoal[goalId];
    if (!s) return;
    const current = toNumberBRL(alloc[goalId] ?? "0");
    const desired = Math.max(0, s.remaining);

    const room = total > 0 ? Math.max(0, total - (allocatedTotal - current)) : desired;
    const value = total > 0 ? Math.min(desired, room) : desired;
    setAllocation(goalId, value ? formatBRL(value) : "");
  }

  async function save() {
    if (isRedeemed) {
      toast.push({ title: "Investimento resgatado", message: "Investimentos resgatados não podem ser editados.", tone: "danger" });
      return;
    }

    const e: Record<string, string> = {};
    const n1 = requireNonEmpty(name, "Nome");
    if (n1) e.name = n1;

    const n2 = requirePositiveNumber(total, "Valor total");
    if (n2) e.total = n2;

    if (!classId) e.class = "Classe é obrigatória.";
    if (liquidity === "vencimento" && !dueDate) e.dueDate = "Data de vencimento é obrigatória.";

    if (overAllocated) e.alloc = "Soma das alocações não pode ser maior que o valor total do investimento.";

    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      await saveInvestmentWithAllocations({
        id: mode === "edit" ? investmentId : undefined,
        name: name.trim(),
        total_value: total,
        class_id: classId,
        institution_id: institutionId || null,
        liquidity_type: liquidity,
        due_date: liquidity === "vencimento" ? dueDate : null,
        is_fgc_covered: fgc,
        allocations: allocations.map((a) => ({ goal_id: a.goal_id, amount: a.amount }))
      });

      toast.push({ title: "Investimento salvo", tone: "success" });
      onSaved();
    } catch (err: any) {
      toast.push({ title: "Erro ao salvar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  React.useImperativeHandle(ref, () => ({
    save,
    isSaving: saving,
    isBusy:
      saving ||
      classes.loading ||
      inst.loading ||
      goals.loading ||
      monthly.loading ||
      (mode === "edit" && (existing.loading || existingAlloc.loading)) ||
      isRedeemed
  }));

  const loading = classes.loading || inst.loading || goals.loading || monthly.loading || (mode === "edit" && (existing.loading || existingAlloc.loading));

  return (
    <div className="grid gap-4">
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 grid gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </Card>
          <Card className="p-4">
            <Skeleton className="h-4 w-44" />
            <div className="mt-4 grid gap-4">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </Card>
        </div>
      ) : (
        <>
          {isRedeemed ? (
            <div className="rounded-xl2 border border-amber-400/25 bg-amber-400/5 p-3 text-sm text-amber-200">
              Este investimento está resgatado e não pode ser editado.
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-slate-100 font-semibold">Detalhes</div>
              <div className="mt-4 grid gap-4">
                <Input label="Nome" placeholder="Ex: CDB 12% 2028" value={name} error={errs.name} onChange={(e) => setName(e.target.value)} />

                <Input
                  label="Valor total (R$)"
                  placeholder="R$ 0,00"
                  inputMode="numeric"
                  value={totalValue}
                  error={errs.total}
                  onChange={(e) => setTotalValue(maskBRLCurrencyInput(e.target.value))}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Classe" value={classId} error={errs.class} onChange={(e) => setClassId(e.target.value)}>
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {(classes.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>

                  <Select label="Instituição" value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
                    <option value="">Sem instituição</option>
                    {(inst.data ?? []).map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <Select label="Liquidez" value={liquidity} onChange={(e) => setLiquidity(e.target.value as any)}>
                  <option value="diaria">Diária</option>
                  <option value="vencimento">No vencimento</option>
                </Select>

                {liquidity === "vencimento" ? (
                  <Input label="Data de vencimento" type="date" value={dueDate} error={errs.dueDate} onChange={(e) => setDueDate(e.target.value)} />
                ) : null}

                <Toggle label="Coberto pelo FGC" hint="Use para análises de exposição por instituição." checked={fgc} onChange={setFgc} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-slate-100 font-semibold">Distribuição em metas</div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 active:bg-white/15"
                  onClick={autoDistribute}
                >
                  Auto-distribuir
                </button>
              </div>

              <div className="mt-2 text-sm text-slate-400">
                Total: <span className="text-slate-100 font-medium">{formatBRL(total)}</span> • Alocado:{" "}
                <span className={"font-medium " + (overAllocated ? "text-red-200" : "text-slate-100")}>{formatBRL(allocatedTotal)}</span> • Restante:{" "}
                <span className="text-slate-100 font-medium">{formatBRL(remainingToAllocate)}</span>
              </div>

              {errs.alloc ? <div className="mt-3 rounded-xl2 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{errs.alloc}</div> : null}

              <div className="mt-4 grid gap-3">
                {(allocations.length ? allocations : []).map((g) => (
                  <div key={g.goal_id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-100 font-medium flex items-center gap-2">
                          {g.name}
                          {g.is_monthly_plan ? <Badge variant="info">Plano</Badge> : <Badge variant="neutral">—</Badge>}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Progresso: {formatPercent(g.percent_progress)} • {g.days_remaining} dia(s) restantes
                        </div>
                        {g.is_monthly_plan && g.suggested > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400">Sugerido agora:</span>
                            <button
                              type="button"
                              onClick={() => applySuggested(g.goal_id)}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-100 hover:bg-white/10 active:bg-white/15"
                              title="Preencher com o valor sugerido do mês"
                            >
                              {formatBRL(g.suggested)}
                              <span className="text-slate-300/80">• aplicar</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="w-full sm:w-32">
                        <Input
                          label="Aporte (R$)"
                          placeholder={g.is_monthly_plan && g.suggested > 0 ? formatBRL(g.suggested) : "R$ 0,00"}
                          inputMode="numeric"
                          value={alloc[g.goal_id] ?? ""}
                          onChange={(e) => setAllocation(g.goal_id, maskBRLCurrencyInput(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={clamp(g.percent_progress, 0, 100)} />
                    </div>
                  </div>
                ))}

                {!allocations.length ? (
                  <div className="rounded-xl2 border border-white/10 bg-white/5 p-5 text-center">
                    <div className="text-slate-100 font-medium">Nenhuma meta cadastrada</div>
                    <div className="mt-1 text-sm text-slate-400">Crie metas para distribuir aportes.</div>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          {/* keep a minimal hint for required fields */}
          <div className="text-xs text-slate-500">
            {liquidity === "vencimento" ? "Liquidez no vencimento exige data de vencimento." : ""}
          </div>
        </>
      )}
    </div>
  );
});

// Backward compatibility (no longer routed): keep default export as the modal-friendly form.
export default InvestmentForm;
