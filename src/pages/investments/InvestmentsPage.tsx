import React from "react";
import { useSearchParams } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Badge from "@/ui/primitives/Badge";
import Modal from "@/ui/primitives/Modal";
import Select from "@/ui/primitives/Select";
import Skeleton from "@/ui/primitives/Skeleton";
import { Icon } from "@/ui/layout/icons";
import { useAsync } from "@/state/useAsync";
import { deleteInvestment, listInvestments, setInvestmentRedeemed } from "@/services/investments";
import { listGoals } from "@/services/goals";
import { formatBRL, formatDateBR } from "@/lib/format";
import { useToast } from "@/ui/feedback/Toast";
import { InvestmentForm, type InvestmentFormHandle } from "./InvestmentFormPage";
// NOTE: The primary "+" action for Investments lives in the TopBar.

export default function InvestmentsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const goals = useAsync(() => listGoals(), []);
  const [goalId, setGoalId] = React.useState<string>("");
  const invs = useAsync(() => listInvestments({ goal_id: goalId || null }), [goalId]);

  const [filtersCollapsed, setFiltersCollapsed] = React.useState(true);

  const modal = searchParams.get("modal");
  const editId = searchParams.get("edit");
  const isOpen = modal === "new" || !!editId;
  const mode: "create" | "edit" = editId ? "edit" : "create";

  const formRef = React.useRef<InvestmentFormHandle | null>(null);
  const [formMeta, setFormMeta] = React.useState<{ isSaving: boolean; isBusy: boolean }>({ isSaving: false, isBusy: false });

  const [q, setQ] = React.useState("");
  const [showRedeemed, setShowRedeemed] = React.useState(false);

  const rows = React.useMemo(() => {
    const src = invs.data ?? [];
    const query = q.trim().toLowerCase();
    return src.filter((r) => {
      if (!showRedeemed && r.is_redeemed) return false;
      if (!query) return true;
      return (
        String(r.name).toLowerCase().includes(query) ||
        String(r.class_name ?? "").toLowerCase().includes(query) ||
        String(r.institution_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [invs.data, q, showRedeemed]);

  async function redeem(id: string) {
    if (!confirm("Confirmar resgate deste investimento?")) return;
    try {
      await setInvestmentRedeemed(id, true);
      toast.push({ title: "Resgate realizado", tone: "success" });
      invs.reload();
    } catch (e: any) {
      toast.push({ title: "Erro ao atualizar", message: e?.message ?? "Erro", tone: "danger" });
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir este investimento?")) return;
    try {
      await deleteInvestment(id);
      toast.push({ title: "Investimento excluído", tone: "success" });
      invs.reload();
    } catch (e: any) {
      toast.push({ title: "Erro ao excluir", message: e?.message ?? "Erro", tone: "danger" });
    }
  }

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
            <div className="text-sm text-slate-400">
              {goalId ? "1" : "0"} filtro(s) ativo(s){q.trim() ? " + busca" : ""}
            </div>
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
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
            <Select
              label="Meta"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="sm:min-w-[260px]"
            >
              <option value="">Todas</option>
              {goals.loading
                ? null
                : (goals.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
            </Select>
            <Input label="Buscar" placeholder="nome, classe, instituição" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {rows.length} item(ns){showRedeemed ? " (inclui resgatados)" : ""}
          </div>
          <button
            className="text-sm text-sky-300 hover:text-sky-200"
            onClick={() => setShowRedeemed((v) => !v)}
          >
            {showRedeemed ? "Ocultar resgatados" : "Mostrar resgatados"}
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {invs.loading ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-4 w-64" />
                    </div>
                    <div className="text-right shrink-0">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="mt-2 h-3 w-28" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </>
          ) : rows.length ? (
            rows.map((r) => {
              const allocated = Number(r.allocated_total ?? 0);
              const total = Number(r.total_value ?? 0);
              const over = allocated > total + 0.0001;

              return (
                <div key={r.id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-slate-100 font-medium flex items-center gap-2">
                        {r.name}
                        {r.is_redeemed ? <Badge variant="neutral">Resgatado</Badge> : null}
                        {r.is_fgc_covered ? <Badge variant="success">FGC</Badge> : <Badge variant="neutral">Sem FGC</Badge>}
                        {r.liquidity_type === "diaria" ? <Badge variant="info">Diária</Badge> : <Badge variant="warning">Vencimento</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {r.institution_name ?? "Sem instituição"} • {r.class_name ?? "—"}
                        {r.liquidity_type === "vencimento" ? ` • venc: ${formatDateBR(r.due_date)}` : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-100 font-semibold">{formatBRL(total)}</div>
                      <div className={"mt-1 text-xs " + (over ? "text-red-300" : "text-slate-400")}>
                        Alocado: {formatBRL(allocated)}{over ? " (acima do total!)" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => setSearchParams({ edit: r.id })}
                      className="h-9 px-3"
                      disabled={r.is_redeemed}
                      title={r.is_redeemed ? "Investimentos resgatados não podem ser editados." : undefined}
                    >
                      Editar
                    </Button>

                    {!r.is_redeemed ? (
                      <Button
                        variant="ghost"
                        onClick={() => void redeem(r.id)}
                        className="h-9 px-3 text-amber-200 hover:bg-amber-400/10"
                      >
                        Resgatar
                      </Button>
                    ) : null}

                    <Button variant="ghost" onClick={() => void onDelete(r.id)} className="h-9 px-3 text-red-200 hover:bg-red-400/10">
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl2 border border-white/10 bg-white/5 p-6 text-center">
              <div className="text-slate-100 font-medium">Nenhum investimento ainda</div>
              <div className="mt-1 text-sm text-slate-400">Cadastre investimentos e conecte metas para ver progresso.</div>
              <div className="mt-3 text-sm text-slate-400">
                Use o botão <span className="text-slate-200 font-medium">+</span> acima para cadastrar.
              </div>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={isOpen}
        title={mode === "edit" ? "Editar investimento" : "Novo investimento"}
        onClose={() => setSearchParams({})}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSearchParams({})}>
              Cancelar
            </Button>
            <Button
              onClick={() => void formRef.current?.save()}
              disabled={formMeta.isBusy}
            >
              {formMeta.isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <InvestmentForm
          ref={formRef}
          mode={mode}
          investmentId={editId ?? undefined}
          onClose={() => setSearchParams({})}
          onMetaChange={setFormMeta}
          onSaved={() => {
            setSearchParams({});
            invs.reload();
          }}
        />
      </Modal>
    </div>
  );
}

