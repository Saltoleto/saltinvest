import React from "react";
import Card from "@/ui/primitives/Card";
import Badge from "@/ui/primitives/Badge";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
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

  async function saveAll() {
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

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-100 font-semibold">Alvos da carteira</div>
            <div className="mt-1 text-sm text-slate-400">Defina seu portfólio ideal por classe. O total pode ser 100% (recomendado).</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Total</div>
            <div className="text-2xl font-semibold text-slate-100">{total.toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={(totalClamped / 100) * 100} />
          <div className="mt-2 text-xs text-slate-500">Ideal: 100%. Acima disso indica sobreposição de metas.</div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void saveAll()} disabled={saving || classes.loading}>
            {saving ? "Salvando..." : "Salvar alvos"}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        {classes.loading ? (
          <div className="text-sm text-slate-400">Carregando...</div>
        ) : (classes.data ?? []).length ? (
          <div className="grid gap-3">
            {(classes.data ?? []).map((c) => (
              <div key={c.id} className="rounded-xl2 border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-slate-100 font-medium">{c.name}</div>
                    <div className="mt-1 text-xs text-slate-400">Alvo atual: <Badge variant="info">{Number(c.target_percent ?? 0).toFixed(1)}%</Badge></div>
                  </div>
                  <div className="w-36">
                    <Input
                      label="Novo %"
                      value={draft[c.id] ?? "0"}
                      onChange={(e) => setDraft((s) => ({ ...s, [c.id]: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ))}
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
