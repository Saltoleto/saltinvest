import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import Input from "@/ui/primitives/Input";
import Button from "@/ui/primitives/Button";
import { useAuth } from "@/state/auth/AuthContext";
import { useToast } from "@/ui/feedback/Toast";

export default function SignUpPage() {
  const { signUp, configError } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    const res = await signUp(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.push({ title: "Falha ao criar conta", message: res.error, tone: "danger" });
      return;
    }

    toast.push({ title: "Conta criada!", message: "Se o e-mail exigir confirmação, verifique sua caixa de entrada.", tone: "success" });
    navigate("/login", { replace: true });
  }

  return (
    <AuthShell title="Criar conta" subtitle="Uma carteira, várias metas, visão clara.">
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

        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="mín. 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="repita a senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error ? (
          <div className="rounded-xl2 border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={loading || !!configError}>
          {loading ? "Criando..." : "Criar conta"}
        </Button>

        <div className="text-sm">
          <Link to="/login" className="text-slate-700 hover:text-slate-900">
            Já tenho conta
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
