import React from "react";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Input from "@/ui/primitives/Input";
import Modal from "@/ui/primitives/Modal";
import { useAsync } from "@/state/useAsync";
import { listInstitutions, upsertInstitution, deleteInstitution } from "@/services/institutions";
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

export default function InstitutionsPage() {
  const toast = useToast();
  const inst = useAsync(() => listInstitutions(), []);

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
      await upsertInstitution({ id: form.id, name: form.name.trim() });
      toast.push({ title: "Instituição salva", tone: "success" });
      setOpen(false);
      inst.reload();
    } catch (err: any) {
      toast.push({ title: "Erro ao salvar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string, name: string) {
    setConfirm({
      open: true,
      title: "Excluir instituição",
      description: (
        <>
          <div className="text-slate-800">Excluir <span className="font-semibold">{name}</span>?</div>
          <div className="mt-1 text-sm text-slate-600">Investimentos vinculados ficarão sem instituição.</div>
        </>
      ),
      tone: "danger",
      confirmLabel: "Excluir",
      action: async () => {
        try {
          setConfirm((c) => ({ ...c, busy: true }));
          await deleteInstitution(id);
          toast.push({ title: "Instituição excluída", tone: "success" });
          inst.reload();
        } catch (err: any) {
          toast.push({ title: "Erro ao excluir", message: err?.message ?? "Erro", tone: "danger" });
        } finally {
          setConfirm({ open: false, title: "" });
        }
      }
    });
  }

  const rows = inst.data ?? [];

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-900 font-semibold">Instituições</div>
          <div className="text-sm text-slate-600">Organize seus investimentos por banco/corretora.</div>
        </div>
        <Button
          onClick={openNew}
          aria-label="Nova instituição"
          title="Nova instituição"
          className="hidden sm:inline-flex h-10 w-10 px-0 rounded-full"
        >
          <Icon name="plus" className="h-5 w-5" />
          <span className="sr-only">Nova instituição</span>
        </Button>
      </Card>

      <Card className="p-4">
        {inst.loading ? (
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl2 border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-44" />
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
                <div className="text-slate-900 font-medium">{c.name}</div>
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
            <div className="text-slate-900 font-medium">Nenhuma instituição ainda</div>
            <div className="mt-1 text-sm text-slate-600">Cadastre bancos/corretoras para enriquecer o dashboard e a visão FGC.</div>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title={form.id ? "Editar instituição" : "Nova instituição"}
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
          <Input label="Nome" placeholder="Ex: Nubank" value={form.name} error={errs.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <div className="text-xs text-slate-500">A exposição ao FGC é calculada por instituição no dashboard.</div>
        </div>
      </Modal>
    

      <Button
        onClick={() => setForm({ id: null, nome: "" })}
        aria-label="Nova instituição"
        title="Nova instituição"
        className="sm:hidden fixed right-4 bottom-24 z-30 h-14 w-14 px-0 rounded-full shadow-lg"
      >
        <Icon name="plus" className="h-6 w-6" />
        <span className="sr-only">Nova instituição</span>
      </Button>

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
