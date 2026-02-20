import React from "react";
import { Link } from "react-router-dom";
import AuthShell from "./AuthShell";
import Input from "@/ui/primitives/Input";
import Button from "@/ui/primitives/Button";
import { useAuth } from "@/state/auth/AuthContext";
import { useToast } from "@/ui/feedback/Toast";

export default function ResetPasswordPage() {
  const { resetPassword, configError } = useAuth();
  const toast = useToast();

  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await resetPassword(email);
    setLoading(false);

    if (res.error) {
      toast.push({ title: "Não foi possível enviar", message: res.error, tone: "danger" });
      return;
    }
    setDone(true);
    toast.push({ title: "E-mail enviado", message: "Confira sua caixa de entrada.", tone: "success" });
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Receba um link seguro para redefinir.">
      <form onSubmit={onSubmit} className="grid gap-4">
        {configError ? (
          <div className="rounded-xl2 border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-800">
            {configError}
          </div>
        ) : null}

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" disabled={loading || !!configError}>
          {loading ? "Enviando..." : "Enviar link"}
        </Button>

        {done ? (
          <div className="rounded-xl2 border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-800">
            Se existir uma conta para este e-mail, você receberá uma mensagem em instantes.
          </div>
        ) : null}

        <div className="text-sm">
          <Link to="/login" className="text-slate-700 hover:text-slate-900">
            Voltar para login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
