import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Select from "@/ui/primitives/Select";
import Toggle from "@/ui/primitives/Toggle";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import { useAsync } from "@/state/useAsync";
import { listClasses } from "@/services/classes";
import { listInstitutions } from "@/services/institutions";
import { listGoalsEvolution } from "@/services/goals";
import { getInvestment, listAllocationsByInvestment, saveInvestmentWithAllocations } from "@/services/investments";
import { formatBRL, formatPercent, clamp } from "@/lib/format";
import { sum, toNumberBRL, requireNonEmpty, requirePositiveNumber } from "@/lib/validate";
import { useToast } from "@/ui/feedback/Toast";

export default function InvestmentFormPage({ mode }: { mode: "create" | "edit" }) {
  const toast = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const investmentId = params.id as string | undefined;

  const classes = useAsync(() => listClasses(), []);
  const inst = useAsync(() => listInstitutions(), []);
  const goals = useAsync(() => listGoalsEvolution(), []);
  const existing = useAsync(() => (mode === "edit" && investmentId ? getInvestment(investmentId) : Promise.resolve(null)), [mode, investmentId]);
  const existingAlloc = useAsync(() => (mode === "edit" && investmentId ? listAllocationsByInvestment(investmentId) : Promise.resolve([])), [mode, investmentId]);

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
    if (mode !== "edit") return;
    if (!existing.data) return;

    setName(existing.data.name ?? "");
    setTotalValue(String(existing.data.total_value ?? ""));
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
      map[a.goal_id] = String(a.amount ?? 0);
    }
    setAlloc(map);
  }, [mode, existingAlloc.data]);

  const total = toNumberBRL(totalValue);
  const allocations = React.useMemo(() => {
    const rows = goals.data ?? [];
    return rows.map((g) => ({
      goal_id: g.goal_id,
      name: g.name,
      percent_progress: Number(g.percent_progress) || 0,
      is_monthly_plan: !!g.is_monthly_plan,
      days_remaining: Number(g.days_remaining) || 0,
      amount: toNumberBRL(alloc[g.goal_id] ?? "0")
    }));
  }, [goals.data, alloc]);

  const allocatedTotal = sum(allocations.map((x) => x.amount));
  const remainingToAllocate = Math.max(0, total - allocatedTotal);
  const overAllocated = allocatedTotal > total + 0.0001;

  function setAllocation(goalId: string, value: string) {
    setAlloc((s) => ({ ...s, [goalId]: value }));
  }

  function autoDistribute() {
    // distribute remaining equally among goals in monthly plan
    const candidates = allocations.filter((a) => a.is_monthly_plan);
    if (!candidates.length) {
      toast.push({ title: "Sem metas no plano", message: "Ative “Plano do mês” em uma meta para usar auto-distribuição.", tone: "warning" });
      return;
    }
    if (total <= 0) {
      toast.push({ title: "Defina o valor do investimento", tone: "warning" });
      return;
    }
    const each = total / candidates.length;
    const next: Record<string, string> = { ...alloc };
    for (const c of candidates) next[c.goal_id] = String(each.toFixed(2));
    setAlloc(next);
    toast.push({ title: "Distribuição automática aplicada", tone: "success" });
  }

  async function onSave() {
    const e: Record<string, string> = {};
    const n1 = requireNonEmpty(name, "Nome");
    if (n1) e.name = n1;
    const n2 = requirePositiveNumber(total, "Valor total");
    if (n2) e.total = n2;
    if (liquidity === "vencimento" && !dueDate) e.dueDate = "Data de vencimento é obrigatória.";

    if (overAllocated) e.alloc = "Soma das alocações não pode ser maior que o valor total do investimento.";

    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      const id = await saveInvestmentWithAllocations({
        id: mode === "edit" ? investmentId : undefined,
        name: name.trim(),
        total_value: total,
        class_id: classId || null,
        institution_id: institutionId || null,
        liquidity_type: liquidity,
        due_date: liquidity === "vencimento" ? dueDate : null,
        is_fgc_covered: fgc,
        allocations: allocations.map((a) => ({ goal_id: a.goal_id, amount: a.amount }))
      });

      toast.push({ title: "Investimento salvo", tone: "success" });
      navigate("/app/investments", { replace: true });
      return id;
    } catch (err: any) {
      toast.push({ title: "Erro ao salvar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  const loading = classes.loading || inst.loading || goals.loading || (mode === "edit" && (existing.loading || existingAlloc.loading));

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-100 font-semibold">{mode === "edit" ? "Editar investimento" : "Novo investimento"}</div>
          <div className="text-sm text-slate-400">Cadastre o ativo e distribua aportes nas metas.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/app/investments")}>
            Cancelar
          </Button>
          <Button onClick={() => void onSave()} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 text-sm text-slate-400">Carregando formulário...</Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-slate-100 font-semibold">Detalhes</div>
              <div className="mt-4 grid gap-4">
                <Input label="Nome" placeholder="Ex: CDB 12% 2028" value={name} error={errs.name} onChange={(e) => setName(e.target.value)} />

                <Input label="Valor total (R$)" placeholder="Ex: 1500" value={totalValue} error={errs.total} onChange={(e) => setTotalValue(e.target.value)} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Classe" value={classId} onChange={(e) => setClassId(e.target.value)}>
                    <option value="">Sem classe</option>
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
                ) : (
                  <div className="rounded-xl2 border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
                    Com liquidez diária, a data de vencimento fica opcional e será salva como <span className="text-slate-200">null</span>.
                  </div>
                )}

                <Toggle
                  label="Coberto pelo FGC"
                  hint="Use para análises de exposição por instituição."
                  checked={fgc}
                  onChange={setFgc}
                />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-slate-100 font-semibold">Distribuição em metas</div>
                <Button variant="secondary" onClick={autoDistribute}>
                  Auto-distribuir
                </Button>
              </div>

              <div className="mt-2 text-sm text-slate-400">
                Total: <span className="text-slate-100 font-medium">{formatBRL(total)}</span> • Alocado:{" "}
                <span className={"font-medium " + (overAllocated ? "text-red-200" : "text-slate-100")}>{formatBRL(allocatedTotal)}</span> • Restante:{" "}
                <span className="text-slate-100 font-medium">{formatBRL(remainingToAllocate)}</span>
              </div>

              {errs.alloc ? (
                <div className="mt-3 rounded-xl2 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{errs.alloc}</div>
              ) : null}

              <div className="mt-4 grid gap-3 max-h-[520px] overflow-auto pr-1">
                {(allocations.length ? allocations : []).map((g) => (
                  <div key={g.goal_id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-slate-100 font-medium flex items-center gap-2">
                          {g.name}
                          {g.is_monthly_plan ? <Badge variant="info">Plano</Badge> : <Badge variant="neutral">—</Badge>}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Progresso: {formatPercent(g.percent_progress)} • {g.days_remaining} dia(s) restantes
                        </div>
                      </div>
                      <div className="w-32">
                        <Input
                          label="Aporte (R$)"
                          placeholder="0"
                          value={alloc[g.goal_id] ?? ""}
                          onChange={(e) => setAllocation(g.goal_id, e.target.value)}
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

          <Card className="p-4">
            <div className="text-slate-100 font-semibold">Validações aplicadas</div>
            <div className="mt-2 text-sm text-slate-400 grid gap-1">
              <div>• A soma dos aportes em metas não pode exceder o valor total do investimento.</div>
              <div>• Se a liquidez for <span className="text-slate-200">No vencimento</span>, a data de vencimento é obrigatória.</div>
              <div>• Cada insert/update envia <span className="text-slate-200">user_id</span> para respeitar as políticas RLS do schema.</div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
