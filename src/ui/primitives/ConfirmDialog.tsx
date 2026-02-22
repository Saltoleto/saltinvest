import React from "react";
import Modal from "./Modal";
import Button from "./Button";
import { cn } from "../utils/cn";

export type ConfirmTone = "neutral" | "danger" | "warning";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "neutral",
  busy = false,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    if (!open) setWorking(false);
  }, [open]);

  async function handleConfirm() {
    try {
      setWorking(true);
      await onConfirm();
    } finally {
      setWorking(false);
    }
  }

  const ctaVariant = tone === "danger" ? "danger" : tone === "warning" ? "secondary" : "primary";

  return (
    <Modal
      open={open}
      title={title}
      onClose={working || busy ? () => {} : onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={working || busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={ctaVariant as any}
            onClick={() => void handleConfirm()}
            disabled={working || busy}
            className={cn(tone === "warning" ? "text-amber-900" : "")}
          >
            {working || busy ? "Aguarde..." : confirmLabel}
          </Button>
        </>
      }
    >
      {description ? <div className="text-slate-800">{description}</div> : null}

      {tone === "danger" ? (
        <div className="mt-3 rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Esta ação não pode ser desfeita.
        </div>
      ) : null}

      {tone === "warning" ? (
        <div className="mt-3 rounded-xl2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Verifique se está tudo certo antes de confirmar.
        </div>
      ) : null}
    </Modal>
  );
}
