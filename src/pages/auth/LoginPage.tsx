import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import Input from "@/ui/primitives/Input";
import Button from "@/ui/primitives/Button";
import { useAuth } from "@/state/auth/AuthContext";
import { useToast } from "@/ui/feedback/Toast";

export default function LoginPage() {
  const { signIn, user, configError } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from ?? "/app/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      toast.push({ title: "Falha no login", message: res.error, tone: "danger" });
      return;
    }
    toast.push({ title: "Bem-vindo de volta!", tone: "success" });
    navigate(from, { replace: true });
  }

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua carteira e seu plano do mês.">
      <form onSubmit={onSubmit} className="grid gap-4">
        {configError ? (
          <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? (
          <div className="rounded-xl2 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <Button type="submit" disabled={loading || !!configError}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link to="/reset" className="text-blue-700 hover:text-blue-600">
            Esqueci minha senha
          </Link>
          <Link to="/signup" className="text-slate-700 hover:text-slate-900">
            Criar conta
          </Link>
        </div>

        <div className="text-xs text-slate-500">
          Dica: No Supabase, habilite o provedor Email em Auth → Providers.
        </div>
      </form>
    </AuthShell>
  );
}
