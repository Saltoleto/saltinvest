import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "./AuthShell";
import Input from "@/ui/primitives/Input";
import Button from "@/ui/primitives/Button";
import { useToast } from "@/ui/feedback/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/state/auth/AuthContext";

export default function NewPasswordPage() {
  const toast = useToast();
  const { configError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [touched, setTouched] = React.useState<{ password: boolean; confirm: boolean }>({ password: false, confirm: false });

  const pTrim = password.trim();
  const cTrim = confirm.trim();
  const passwordTooShort = ready && touched.password && pTrim.length > 0 && pTrim.length < 6;
  const passwordsMismatch = ready && touched.confirm && cTrim.length > 0 && pTrim !== cTrim;
  const canSubmit = ready && !loading && !configError && pTrim.length >= 6 && pTrim === cTrim;

  React.useEffect(() => {
    if (configError) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const sp = new URLSearchParams(location.search);
        const hp = new URLSearchParams((location.hash ?? "").replace(/^#/, ""));

        // Fluxo PKCE (mais comum hoje): ?code=...
        const code = sp.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Fluxo tokens no hash: #access_token=...&refresh_token=...
        const access_token = sp.get("access_token") ?? hp.get("access_token");
        const refresh_token = sp.get("refresh_token") ?? hp.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.push({
            title: "Link inválido ou expirado",
            message: err?.message ?? "Não foi possível validar a sessão.",
            tone: "danger"
          });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configError, location.hash, location.search, toast]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (configError) return;

    const p = pTrim;
    const c = cTrim;

    if (p.length < 6) {
      toast.push({ title: "Senha fraca", message: "Use pelo menos 6 caracteres.", tone: "danger" });
      return;
    }
    if (p !== c) {
      toast.push({ title: "Senhas diferentes", message: "As senhas precisam ser iguais.", tone: "danger" });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: p });
      if (error) throw error;

      toast.push({ title: "Senha atualizada", message: "Faça login novamente.", tone: "success" });
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.push({ title: "Não foi possível atualizar", message: err?.message ?? "Erro", tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Alterar senha" subtitle="Defina uma nova senha para sua conta.">
      <form onSubmit={onSubmit} className="grid gap-4">
        {configError ? (
          <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {configError}
          </div>
        ) : null}

        {!ready ? (
          <div className="rounded-xl2 border border-slate-200 bg-white p-3 text-sm text-slate-700">Validando link...</div>
        ) : (
          <>
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, password: true }))}
              error={passwordTooShort ? "Use pelo menos 6 caracteres." : undefined}
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
              error={passwordsMismatch ? "As senhas precisam ser iguais." : undefined}
              required
            />

            <Button type="submit" disabled={!canSubmit}>
              {loading ? "Atualizando..." : "Atualizar senha"}
            </Button>

            <div className="text-sm">
              <Link to="/login" className="text-slate-700 hover:text-slate-900">
                Voltar para login
              </Link>
            </div>
          </>
        )}
      </form>
    </AuthShell>
  );
}
