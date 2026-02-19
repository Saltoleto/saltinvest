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
import { maskBRLCurrencyInput } from "@/lib/masks";
import { useToast } from "@/ui/feedback/Toast";
import { Icon } from "@/ui/layout/icons";

type FormState = {
  name: string;
  target_value: string;
  start_date: string;
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
  const [form, setForm] = React.useState<FormState>({ name: "", target_value: "", start_date: "", target_date: "", is_monthly_plan: true });
  const [errs, setErrs] = React.useState<Record<string, string>>({});

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function plusMonthsISO(months: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
  }

  function reset() {
    setForm({ name: "", target_value: "", start_date: todayISO(), target_date: plusMonthsISO(6), is_monthly_plan: true });
    setErrs({});
  }

  function openNew() {
    reset();
    setOpen(true);
  }

  async function onSave() {
    const e: Record<string, string> = {};
    const n1 = requireNonEmpty(form.name, "Nome");
    if (n1) e.name = n1;
    const target = toNumberBRL(form.target_value);
    const n2 = requirePositiveNumber(target, "Valor alvo");
    if (n2) e.target_value = n2;
    if (!form.start_date) e.start_date = "Data início é obrigatória.";
    if (!form.target_date) e.target_date = "Data alvo é obrigatória.";

    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      await upsertGoal({
        name: form.name.trim(),
        target_value: target,
        start_date: form.start_date,
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
      <Card className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-100 font-semibold">Ações</div>
          <div className="text-sm text-slate-400">Defina objetivos e acompanhe evolução com alocações.</div>
          <div className="mt-1 text-xs text-slate-500">Pelo modelo de dados, metas não são editáveis (apenas criar e excluir).</div>
        </div>
        <Button
          onClick={openNew}
          aria-label="Nova meta"
          title="Nova meta"
          className="h-10 w-10 px-0 rounded-full"
        >
          <Icon name="plus" className="h-5 w-5" />
          <span className="sr-only">Nova meta</span>
        </Button>
      </Card>

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
        title="Nova meta"
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
            placeholder="R$ 0,00"
            inputMode="numeric"
            value={form.target_value}
            error={errs.target_value}
            onChange={(e) => setForm((s) => ({ ...s, target_value: maskBRLCurrencyInput(e.target.value) }))}
          />

          <Input
            label="Data início"
            type="date"
            value={form.start_date}
            error={errs.start_date}
            onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
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
            Dica: o progresso vem dos aportes (aportes) vinculados a esta meta.
          </div>
        </div>
      </Modal>
    </div>
  );
}
