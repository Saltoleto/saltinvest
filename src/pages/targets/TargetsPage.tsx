import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Button from "@/ui/primitives/Button";
import Progress from "@/ui/primitives/Progress";
import { useAsync } from "@/state/useAsync";
import { listClasses, upsertClass } from "@/services/classes";
import { useToast } from "@/ui/feedback/Toast";
import { sum } from "@/lib/validate";

export default function TargetsPage() {
  const toast = useToast();
  const classes = useAsync(() => listClasses(), []);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const c of classes.data ?? []) next[c.id] = String(c.target_percent ?? 0);
    setDraft(next);
  }, [classes.data]);

  const total = React.useMemo(() => {
    const values = Object.values(draft).map((x) => Number(String(x).replace(",", ".")));
    return sum(values);
  }, [draft]);

  const totalClamped = Math.max(0, Math.min(200, total));
  const deltaTo100 = 100 - total;
  const totalTone: "success" | "warning" | "danger" = Math.abs(deltaTo100) < 0.05 ? "success" : total < 100 ? "warning" : "danger";
  const canSave = total <= 100.05; // allow tiny float drift

  async function saveAll() {
    if (!canSave) {
      toast.push({ title: "Ajuste os percentuais", message: "O total precisa ser igual ou menor que 100%.", tone: "danger" });
      return;
    }

    const rows = classes.data ?? [];
    const errors: string[] = [];

    const items = rows.map((c) => {
      const pct = Number(String(draft[c.id] ?? "0").replace(",", "."));
      if (!isFinite(pct) || pct < 0 || pct > 100) errors.push(`Percentual inválido em ${c.name}.`);
      return { id: c.id, name: c.name, target_percent: isFinite(pct) ? pct : 0 };
    });

    if (errors.length) {
      toast.push({ title: "Ajuste os percentuais", message: errors[0], tone: "danger" });
      return;
    }

    try {
      setSaving(true);
      // save sequentially to reuse upsert policy
      for (const it of items) {
        await upsertClass({ id: it.id, name: it.name, target_percent: it.target_percent });
      }
      toast.push({ title: "Alvos salvos", message: `Total: ${total.toFixed(1)}%`, tone: "success" });
      classes.reload();
    } catch (e: any) {
      toast.push({ title: "Erro ao salvar", message: e?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  function setPct(id: string, pct: number) {
    const v = Math.max(0, Math.min(100, pct));
    setDraft((s) => ({ ...s, [id]: String(Number.isFinite(v) ? v : 0) }));
  }

  function parsePct(raw: string) {
    const n = Number(String(raw ?? "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-slate-100 font-semibold">Alvos</div>
            <div className="mt-1 text-sm text-slate-400">Defina a distribuição ideal por classe (recomendado: total = 100%).</div>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <div className="text-right">
              <div className="text-xs text-slate-400">Total</div>
              <div className="text-2xl font-semibold text-slate-100 leading-none">{total.toFixed(1)}%</div>
            </div>
            <Badge variant={totalTone === "success" ? "success" : totalTone === "warning" ? "warning" : "danger"}>
              {totalTone === "success" ? "OK" : totalTone === "warning" ? `Falta ${Math.abs(deltaTo100).toFixed(1)}%` : `Excesso ${Math.abs(deltaTo100).toFixed(1)}%`}
            </Badge>
            <Button onClick={() => void saveAll()} disabled={saving || classes.loading || !canSave}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <Progress value={(totalClamped / 100) * 100} />
          <div className="mt-2 text-xs text-slate-500">Dica: manter em 100% facilita comparar sua carteira real vs alvo.</div>
        </div>
      </Card>

      <Card className="p-4">
        {classes.loading ? (
          <div className="text-sm text-slate-400">Carregando...</div>
        ) : (classes.data ?? []).length ? (
          <div className="grid gap-3">
            {(classes.data ?? []).map((c) => {
              const pct = parsePct(draft[c.id] ?? "0");
              return (
                <div key={c.id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-slate-100 font-medium truncate">{c.name}</div>
                      <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                        <span>Atual</span>
                        <Badge variant="info">{Number(c.target_percent ?? 0).toFixed(1)}%</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        onClick={() => setPct(c.id, pct - 5)}
                        aria-label="Diminuir 5%"
                        title="-5%"
                      >
                        −
                      </button>

                      <div className="flex flex-col items-center justify-center px-2">
                        <div className="text-[11px] text-slate-400">Alvo %</div>
                        <Badge variant="info">{pct.toFixed(1)}%</Badge>
                      </div>

                      <button
                        type="button"
                        className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        onClick={() => setPct(c.id, pct + 5)}
                        aria-label="Aumentar 5%"
                        title="+5%"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Math.max(0, Math.min(100, pct))}
                      onChange={(e) => setPct(c.id, Number(e.target.value))}
                      className="mt-2 w-full accent-white/70"
                      aria-label={`Alvo para ${c.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl2 border border-white/10 bg-white/5 p-6 text-center">
            <div className="text-slate-100 font-medium">Sem classes</div>
            <div className="mt-1 text-sm text-slate-400">Crie classes para configurar alvos.</div>
          </div>
        )}
      </Card>
    </div>
  );
}
