import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Select from "@/ui/primitives/Select";
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
import Skeleton from "@/ui/primitives/Skeleton";

type FormState = {
  name: string;
  target_value: string;
  start_date: string;
  target_date: string;
  is_monthly_plan: boolean;
};

export default function GoalsPage() {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

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

  React.useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("modal") !== "new") return;

    // Abre o modal via ação do TopBar e limpa o parâmetro para evitar reabertura.
    openNew();
    sp.delete("modal");
    const nextSearch = sp.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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

  const [filtersCollapsed, setFiltersCollapsed] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState<"all" | "in" | "out">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "done" | "overdue">("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  function derivedStatus(ev: any, goal: any): "done" | "overdue" | "active" {
    const pct = Number(ev?.percent_progress ?? 0);
    if (pct >= 100) return "done";
    const days = Number(ev?.days_remaining);
    if (!Number.isNaN(days) && days < 0) return "overdue";
    // fallback: compare target_date to today
    const td = goal?.target_date ? new Date(goal.target_date).getTime() : NaN;
    if (!Number.isNaN(td)) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (td < today) return "overdue";
    }
    return "active";
  }

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() : null;
    return rows
      .filter((g) => {
        if (planFilter === "in" && !g.is_monthly_plan) return false;
        if (planFilter === "out" && g.is_monthly_plan) return false;

        const ev = byId.get(g.id);
        const st = derivedStatus(ev, g);
        if (statusFilter === "done" && st !== "done") return false;
        if (statusFilter === "overdue" && st !== "overdue") return false;
        if (statusFilter === "active" && st !== "active") return false;

        if (query) {
          if (!String(g.name ?? "").toLowerCase().includes(query)) return false;
        }

        if (from || to) {
          const td = g.target_date ? new Date(g.target_date).getTime() : null;
          if (td == null) return false;
          if (from != null && td < from) return false;
          if (to != null && td > to) return false;
        }

        return true;
      })
      .slice();
  }, [rows, q, planFilter, statusFilter, dateFrom, dateTo, byId]);

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <button
            type="button"
            onClick={() => setFiltersCollapsed((v) => !v)}
            className="min-w-0 text-left"
            aria-label={filtersCollapsed ? "Expandir filtros" : "Recolher filtros"}
          >
            <div className="text-slate-100 font-semibold">Filtros</div>
            <div className="text-sm text-slate-400">{filtered.length} meta(s)</div>
          </button>
          <button
            type="button"
            onClick={() => setFiltersCollapsed((v) => !v)}
            className="shrink-0 rounded-xl2 border border-white/10 bg-white/5 p-2 text-sky-200 hover:bg-white/10 transition"
            aria-label={filtersCollapsed ? "Expandir" : "Recolher"}
          >
            {filtersCollapsed ? <Icon name="chevronDown" className="h-5 w-5" /> : <Icon name="chevronUp" className="h-5 w-5" />}
          </button>
        </div>

        {filtersCollapsed ? null : (
          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Input label="Nome" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="lg:col-span-1">
              <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="active">Em andamento</option>
                <option value="overdue">Vencida</option>
                <option value="done">Concluída</option>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Select label="Plano do mês" value={planFilter} onChange={(e) => setPlanFilter(e.target.value as any)}>
                <option value="all">Todas</option>
                <option value="in">No plano</option>
                <option value="out">Fora do plano</option>
              </Select>
            </div>

            <div className="lg:col-span-1">
              <Input label="Data alvo (de)" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="lg:col-span-1">
              <Input label="Data alvo (até)" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        {goals.loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="mt-2 h-4 w-64" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
                <Skeleton className="mt-4 h-2 w-full" />
                <Skeleton className="mt-2 h-3 w-12" />
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-3">
            {filtered.map((g) => {
              const ev = byId.get(g.id);
              const pct = clamp(Number(ev?.percent_progress ?? 0), 0, 100);
              return (
                <div key={g.id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-slate-100 font-medium break-words">{g.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        {formatBRL(Number(ev?.current_contributed ?? 0))} de {formatBRL(Number(g.target_value ?? 0))} • alvo {formatDateBR(g.target_date)}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 sm:justify-start">
                      <Badge variant={g.is_monthly_plan ? "info" : "neutral"}>
                        {g.is_monthly_plan ? (
                          <span className="inline-flex items-center" title="No plano do mês" aria-label="No plano do mês">
                            <Icon name="spark" className="h-4 w-4" />
                            <span className="sr-only">No plano do mês</span>
                          </span>
                        ) : (
                          "Fora do plano"
                        )}
                      </Badge>
                      <Button
                        variant="ghost"
                        onClick={() => void onDelete(g.id)}
                        className="h-9 px-3 text-red-200 hover:bg-red-400/10"
                      >
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
