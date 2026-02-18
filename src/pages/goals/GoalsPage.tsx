import React from "react";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Modal from "@/ui/primitives/Modal";
import Toggle from "@/ui/primitives/Toggle";
import Badge from "@/ui/primitives/Badge";
import Progress from "@/ui/primitives/Progress";
import { useAsync } from "@/state/useAsync";
import { listGoals, listGoalsEvolution, upsertGoal, deleteGoal } from "@/services/goals";
import { formatBRL, formatDateBR, clamp } from "@/lib/format";
import { toNumberBRL, requireNonEmpty, requirePositiveNumber } from "@/lib/validate";
import { useToast } from "@/ui/feedback/Toast";

type FormState = {
  id?: string;
  name: string;
  target_value: string;
  target_date: string;
  is_monthly_plan: boolean;
};

export default function GoalsPage() {
  const toast = useToast();

  const goals = useAsync(() => listGoals(), []);
  const evol = useAsync(() => listGoalsEvolution(), []);

  const byId = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const g of evol.data ?? []) map.set(g.goal_id, g);
    return map;
  }, [evol.data]);

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({ name: "", target_value: "", target_date: "", is_monthly_plan: true });
  const [errs, setErrs] = React.useState<Record<string, string>>({});

  function reset() {
    setForm({ name: "", target_value: "", target_date: "", is_monthly_plan: true });
    setErrs({});
  }

  function openNew() {
    reset();
    setOpen(true);
  }

  // Open from TopBar "+" action
  React.useEffect(() => {
    const onOpen = () => openNew();
    window.addEventListener("saltinvest:open-goal-modal", onOpen as any);
    return () => window.removeEventListener("saltinvest:open-goal-modal", onOpen as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(row: any) {
    setForm({
      id: row.id,
      name: row.name,
      target_value: String(row.target_value ?? ""),
      target_date: row.target_date,
      is_monthly_plan: !!row.is_monthly_plan
    });
    setErrs({});
    setOpen(true);
  }

  async function onSave() {
    const e: Record<string, string> = {};
    const n1 = requireNonEmpty(form.name, "Nome");
    if (n1) e.name = n1;
    const target = toNumberBRL(form.target_value);
    const n2 = requirePositiveNumber(target, "Valor alvo");
    if (n2) e.target_value = n2;
    if (!form.target_date) e.target_date = "Data alvo é obrigatória.";

    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      await upsertGoal({
        id: form.id,
        name: form.name.trim(),
        target_value: target,
        target_date: form.target_date,
        is_monthly_plan: form.is_monthly_plan
      });
      toast.push({ title: "Meta salva", tone: "success" });
      setOpen(false);
      reset();
      goals.reload();
      evol.reload();
    } catch (err: any) {
      toast.push({ title: "Erro ao salvar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta meta? Isso remove vínculos de alocação relacionados.")) return;
    try {
      await deleteGoal(id);
      toast.push({ title: "Meta excluída", tone: "success" });
      goals.reload();
      evol.reload();
    } catch (err: any) {
      toast.push({ title: "Erro ao excluir", message: err?.message ?? "Erro", tone: "danger" });
    }
  }

  const rows = goals.data ?? [];

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        {goals.loading ? (
          <div className="text-sm text-slate-400">Carregando...</div>
        ) : rows.length ? (
          <div className="grid gap-3">
            {rows.map((g) => {
              const ev = byId.get(g.id);
              const pct = clamp(Number(ev?.percent_progress ?? 0), 0, 100);
              return (
                <div key={g.id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-slate-100 font-medium">{g.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {formatBRL(Number(ev?.current_contributed ?? 0))} de {formatBRL(Number(g.target_value ?? 0))} • alvo {formatDateBR(g.target_date)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={g.is_monthly_plan ? "info" : "neutral"}>{g.is_monthly_plan ? "No plano" : "Fora do plano"}</Badge>
                      <Button variant="secondary" onClick={() => openEdit(g)} className="h-9 px-3">
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => void onDelete(g.id)} className="h-9 px-3 text-red-200 hover:bg-red-400/10">
                        Excluir
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Progress value={pct} />
                    <div className="mt-2 text-xs text-slate-400">{pct.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl2 border border-white/10 bg-white/5 p-6 text-center">
            <div className="text-slate-100 font-medium">Nenhuma meta ainda</div>
            <div className="mt-1 text-sm text-slate-400">Crie sua primeira meta para ver o plano mensal.</div>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title={form.id ? "Editar meta" : "Nova meta"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void onSave()} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Input
            label="Nome"
            placeholder="Ex: Reserva de emergência"
            value={form.name}
            error={errs.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />

          <Input
            label="Valor alvo (R$)"
            placeholder="Ex: 10.000"
            value={form.target_value}
            error={errs.target_value}
            onChange={(e) => setForm((s) => ({ ...s, target_value: e.target.value }))}
          />

          <Input
            label="Data alvo"
            type="date"
            value={form.target_date}
            error={errs.target_date}
            onChange={(e) => setForm((s) => ({ ...s, target_date: e.target.value }))}
          />

          <Toggle
            label="Plano do mês"
            hint="Se ativo, entra no cálculo do Total Sugerido."
            checked={form.is_monthly_plan}
            onChange={(v) => setForm((s) => ({ ...s, is_monthly_plan: v }))}
          />

          <div className="text-xs text-slate-500">
            Dica: O progresso vem das alocações (investment_allocations) vinculadas a esta meta.
          </div>
        </div>
      </Modal>
    </div>
  );
}
