import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Badge from "@/ui/primitives/Badge";
import { useAsync } from "@/state/useAsync";
import { deleteInvestment, listInvestments, setInvestmentRedeemed } from "@/services/investments";
import { formatBRL, formatDateBR } from "@/lib/format";
import { useToast } from "@/ui/feedback/Toast";
// NOTE: The primary "+" action for Investments lives in the TopBar.

export default function InvestmentsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const invs = useAsync(() => listInvestments(), []);

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

  async function toggleRedeemed(id: string, value: boolean) {
    try {
      await setInvestmentRedeemed(id, value);
      toast.push({ title: value ? "Marcado como resgatado" : "Reativado", tone: "success" });
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
        <div className="max-w-xl">
          <Input label="Buscar" placeholder="nome, classe, instituição" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
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
            <div className="text-sm text-slate-400">Carregando...</div>
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
                        {r.institution_name ?? "Sem instituição"} • {r.class_name ?? "Sem classe"}
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
                    <Button variant="secondary" onClick={() => navigate(`/app/investments/${r.id}/edit`)} className="h-9 px-3">
                      Editar
                    </Button>

                    <Button
                      variant={r.is_redeemed ? "secondary" : "ghost"}
                      onClick={() => void toggleRedeemed(r.id, !r.is_redeemed)}
                      className={"h-9 px-3 " + (r.is_redeemed ? "" : "text-amber-200 hover:bg-amber-400/10")}
                    >
                      {r.is_redeemed ? "Reativar" : "Marcar resgatado"}
                    </Button>

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
    </div>
  );
}
