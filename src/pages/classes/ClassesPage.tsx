import React from "react";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Modal from "@/ui/primitives/Modal";
import Badge from "@/ui/primitives/Badge";
import { useAsync } from "@/state/useAsync";
import { listClasses, upsertClass, deleteClass } from "@/services/classes";
import { useToast } from "@/ui/feedback/Toast";
import { requireNonEmpty } from "@/lib/validate";
import { Icon } from "@/ui/layout/icons";

type FormState = { id?: string; name: string; target_percent: string };

export default function ClassesPage() {
  const toast = useToast();
  const classes = useAsync(() => listClasses(), []);

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({ name: "", target_percent: "0" });
  const [errs, setErrs] = React.useState<Record<string, string>>({});

  function openNew() {
    setForm({ name: "", target_percent: "0" });
    setErrs({});
    setOpen(true);
  }

  function openEdit(row: any) {
    setForm({ id: row.id, name: row.name, target_percent: String(row.target_percent ?? 0) });
    setErrs({});
    setOpen(true);
  }

  async function onSave() {
    const e: Record<string, string> = {};
    const msg = requireNonEmpty(form.name, "Nome");
    if (msg) e.name = msg;

    const pct = Number(String(form.target_percent).replace(",", "."));
    if (!isFinite(pct) || pct < 0 || pct > 100) e.target_percent = "Percentual deve estar entre 0 e 100.";

    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      await upsertClass({ id: form.id, name: form.name.trim(), target_percent: pct });
      toast.push({ title: "Classe salva", tone: "success" });
      setOpen(false);
      classes.reload();
    } catch (err: any) {
      toast.push({ title: "Erro ao salvar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir esta classe?")) return;
    try {
      await deleteClass(id);
      toast.push({ title: "Classe excluída", tone: "success" });
      classes.reload();
    } catch (err: any) {
      toast.push({ title: "Erro ao excluir", message: err?.message ?? "Erro", tone: "danger" });
    }
  }

  const rows = classes.data ?? [];

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-100 font-semibold">Ações</div>
          <div className="text-sm text-slate-400">Organize sua carteira por tipo de ativo.</div>
        </div>
        <Button
          onClick={openNew}
          aria-label="Nova classe"
          title="Nova classe"
          className="h-10 w-10 px-0 rounded-full"
        >
          <Icon name="plus" className="h-5 w-5" />
          <span className="sr-only">Nova classe</span>
        </Button>
      </Card>

      <Card className="p-4">
        {classes.loading ? (
          <div className="text-sm text-slate-400">Carregando...</div>
        ) : rows.length ? (
          <div className="grid gap-2">
            {rows.map((c) => (
              <div key={c.id} className="rounded-xl2 border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-slate-100 font-medium">{c.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Alvo atual: <Badge variant="info">{Number(c.target_percent ?? 0).toFixed(1)}%</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(c)} className="h-9 px-3">
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => void onDelete(c.id)} className="h-9 px-3 text-red-200 hover:bg-red-400/10">
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 border border-white/10 bg-white/5 p-6 text-center">
            <div className="text-slate-100 font-medium">Nenhuma classe ainda</div>
            <div className="mt-1 text-sm text-slate-400">Crie classes para melhorar análises e alvos.</div>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title={form.id ? "Editar classe" : "Nova classe"}
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
          <Input label="Nome" placeholder="Ex: Renda fixa" value={form.name} error={errs.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Input
            label="Percentual alvo (0 a 100)"
            placeholder="Ex: 35"
            value={form.target_percent}
            error={errs.target_percent}
            onChange={(e) => setForm((s) => ({ ...s, target_percent: e.target.value }))}
          />
          <div className="text-xs text-slate-500">Você também pode ajustar alvos na tela “Alvos da carteira”.</div>
        </div>
      </Modal>
    </div>
  );
}
