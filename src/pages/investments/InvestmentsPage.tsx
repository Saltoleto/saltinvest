import React from "react";
import { useSearchParams } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Badge from "@/ui/primitives/Badge";
import Modal from "@/ui/primitives/Modal";
import Select from "@/ui/primitives/Select";
import Skeleton from "@/ui/primitives/Skeleton";
import ConfirmDialog, { type ConfirmTone } from "@/ui/primitives/ConfirmDialog";
import { Icon } from "@/ui/layout/icons";
import { useAsync } from "@/state/useAsync";
import { deleteInvestment, listInvestments, setInvestmentRedeemed } from "@/services/investments";
import { listGoals } from "@/services/goals";
import { formatBRL, formatDateBR } from "@/lib/format";
import { useToast } from "@/ui/feedback/Toast";
import { InvestmentForm, type InvestmentFormHandle } from "./InvestmentFormPage";
// NOTE: The primary "+" action for Investments lives in the TopBar.

type ConfirmState = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  action?: () => Promise<void>;
};

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

  const [confirm, setConfirm] = React.useState<ConfirmState>({ open: false, title: "" });

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

  function askConfirm(next: Omit<ConfirmState, "open">) {
    setConfirm({ ...next, open: true });
  }

  async function redeem(id: string, name: string) {
    askConfirm({
      title: "Confirmar resgate",
      description: (
        <>
          <div className="text-slate-800">Resgatar <span className="font-semibold">{name}</span>?</div>
          <div className="mt-1 text-sm text-slate-600">O investimento ficará marcado como resgatado (histórico).</div>
        </>
      ),
      tone: "warning",
      confirmLabel: "Resgatar",
      action: async () => {
        try {
          setConfirm((c) => ({ ...c, busy: true }));
          await setInvestmentRedeemed(id, true);
          toast.push({ title: "Resgate realizado", tone: "success" });
          invs.reload();
        } catch (e: any) {
          toast.push({ title: "Erro ao atualizar", message: e?.message ?? "Erro", tone: "danger" });
        } finally {
          setConfirm({ open: false, title: "" });
        }
      }
    });
  }

  async function onDelete(id: string, name: string) {
    askConfirm({
      title: "Excluir investimento",
      description: (
        <>
          <div className="text-slate-800">Excluir <span className="font-semibold">{name}</span>?</div>
          <div className="mt-1 text-sm text-slate-600">Isso remove o investimento e seus vínculos de alocação.</div>
        </>
      ),
      tone: "danger",
      confirmLabel: "Excluir",
      action: async () => {
        try {
          setConfirm((c) => ({ ...c, busy: true }));
          await deleteInvestment(id);
          toast.push({ title: "Investimento excluído", tone: "success" });
          invs.reload();
        } catch (e: any) {
          toast.push({ title: "Erro ao excluir", message: e?.message ?? "Erro", tone: "danger" });
        } finally {
          setConfirm({ open: false, title: "" });
        }
      }
    });
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
            <div className="text-slate-900 font-semibold">Filtros</div>
            <div className="text-sm text-slate-600">
              {goalId ? "1" : "0"} filtro(s) ativo(s){q.trim() ? " + busca" : ""}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFiltersCollapsed((v) => !v)}
            className="shrink-0 rounded-xl2 border border-slate-200 bg-white p-2 text-blue-600 hover:bg-slate-100 transition"
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
          <div className="text-sm text-slate-600">
            {rows.length} item(ns){showRedeemed ? " (inclui resgatados)" : ""}
          </div>
          <button className="text-sm text-blue-700 hover:text-blue-600" onClick={() => setShowRedeemed((v) => !v)}>
            {showRedeemed ? "Ocultar resgatados" : "Mostrar resgatados"}
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {invs.loading ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl2 border border-slate-200 bg-white p-4">
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
                <div key={r.id} className="rounded-xl2 border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-slate-900 font-medium flex items-center gap-2 flex-wrap">
                        {r.name}
                        {r.is_redeemed ? <Badge variant="neutral">Resgatado</Badge> : null}
                        {r.is_fgc_covered ? <Badge variant="success">FGC</Badge> : <Badge variant="neutral">Sem FGC</Badge>}
                        {r.liquidity_type === "diaria" ? <Badge variant="info">Diária</Badge> : <Badge variant="warning">Vencimento</Badge>}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {r.institution_name ?? "Sem instituição"} • {r.class_name ?? "—"}
                        {r.liquidity_type === "vencimento" ? ` • venc: ${formatDateBR(r.due_date)}` : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-900 font-semibold">{formatBRL(total)}</div>
                      <div className={"mt-1 text-xs " + (over ? "text-red-300" : "text-slate-600")}>
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
                        onClick={() => void redeem(r.id, r.name)}
                        className="h-9 px-3 text-amber-900 hover:bg-amber-50"
                      >
                        Resgatar
                      </Button>
                    ) : null}

                    <Button
                      variant="ghost"
                      onClick={() => void onDelete(r.id, r.name)}
                      className="h-9 px-3 text-rose-700 hover:bg-rose-50"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl2 border border-slate-200 bg-white p-6 text-center">
              <div className="text-slate-900 font-medium">Nenhum investimento ainda</div>
              <div className="mt-1 text-sm text-slate-600">Cadastre investimentos e conecte metas para ver progresso.</div>
              <div className="mt-3 text-sm text-slate-600">
                Use o botão <span className="text-slate-800 font-medium">+</span> acima para cadastrar.
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
            <Button onClick={() => void formRef.current?.save()} disabled={formMeta.isBusy}>
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

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        tone={confirm.tone}
        busy={confirm.busy}
        onCancel={() => setConfirm({ open: false, title: "" })}
        onConfirm={async () => {
          await confirm.action?.();
        }}
      />
    </div>
  );
}
