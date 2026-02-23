import React from "react";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Modal from "@/ui/primitives/Modal";
import { useAsync } from "@/state/useAsync";
import { listClasses, upsertClass, deleteClass } from "@/services/classes";
import { useToast } from "@/ui/feedback/Toast";
import { requireNonEmpty } from "@/lib/validate";
import { Icon } from "@/ui/layout/icons";
import Skeleton from "@/ui/primitives/Skeleton";
import ConfirmDialog, { type ConfirmTone } from "@/ui/primitives/ConfirmDialog";

type ConfirmState = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  action?: () => Promise<void>;
};

type FormState = { id?: string; name: string };

export default function ClassesPage() {
  const toast = useToast();
  const classes = useAsync(() => listClasses(), []);

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({ name: "" });
  const [errs, setErrs] = React.useState<Record<string, string>>({});

  const [confirm, setConfirm] = React.useState<ConfirmState>({ open: false, title: "" });

  function openNew() {
    setForm({ name: "" });
    setErrs({});
    setOpen(true);
  }

  function openEdit(row: any) {
    setForm({ id: row.id, name: row.name });
    setErrs({});
    setOpen(true);
  }

  async function onSave() {
    const e: Record<string, string> = {};
    const msg = requireNonEmpty(form.name, "Nome");
    if (msg) e.name = msg;

    setErrs(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      // Percentual é definido somente na tela de Alvos.
      await upsertClass({ id: form.id, name: form.name.trim() });
      toast.push({ title: "Classe salva", tone: "success" });
      setOpen(false);
      classes.reload();
    } catch (err: any) {
      toast.push({ title: "Erro ao salvar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string, name: string) {
    setConfirm({
      open: true,
      title: "Excluir classe",
      description: (
        <>
          <div className="text-slate-800">Excluir <span className="font-semibold">{name}</span>?</div>
          <div className="mt-1 text-sm text-slate-600">Investimentos existentes podem perder a classificação.</div>
        </>
      ),
      tone: "danger",
      confirmLabel: "Excluir",
      action: async () => {
        try {
          setConfirm((c) => ({ ...c, busy: true }));
          await deleteClass(id);
          toast.push({ title: "Classe excluída", tone: "success" });
          classes.reload();
        } catch (err: any) {
          toast.push({ title: "Erro ao excluir", message: err?.message ?? "Erro", tone: "danger" });
        } finally {
          setConfirm({ open: false, title: "" });
        }
      }
    });
  }

  const rows = classes.data ?? [];

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-900 font-semibold">Classes</div>
          <div className="text-sm text-slate-600">Organize sua carteira por tipo de ativo.</div>
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
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl2 border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length ? (
          <div className="grid gap-2">
            {rows.map((c) => (
              <div key={c.id} className="rounded-xl2 border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-slate-900 font-medium">{c.name}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(c)} className="h-9 px-3">
                    Editar
                  </Button>
                  <button
                      type="button"
                      onClick={() => void onDelete(c.id, c.name)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl2 border border-slate-200 bg-white text-rose-700 hover:bg-rose-50 transition"
                      aria-label="Excluir"
                      title="Excluir"
                    >
                      <Icon name="trash" className="h-5 w-5" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 border border-slate-200 bg-white p-6 text-center">
            <div className="text-slate-900 font-medium">Nenhuma classe ainda</div>
            <div className="mt-1 text-sm text-slate-600">Crie classes para melhorar análises e alvos.</div>
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
          <div className="text-xs text-slate-500">O percentual alvo é definido na tela “Alvos”.</div>
        </div>
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
