import React from "react";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Badge from "@/ui/primitives/Badge";
import { useAuth } from "@/state/auth/AuthContext";
import { useToast } from "@/ui/feedback/Toast";
import { Icon } from "@/ui/layout/icons";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const toast = useToast();

  async function onLogout() {
    await signOut();
    toast.push({ title: "Você saiu", tone: "info" });
  }

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-slate-100 font-semibold">Conta</div>
            <div className="mt-1 text-sm text-slate-400">Gerencie sua sessão.</div>
          </div>
          <Badge variant="info">Protegido</Badge>
        </div>

        <div className="mt-4 rounded-xl2 border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-slate-400">E-mail</div>
          <div className="text-slate-100 font-medium">{user?.email ?? "—"}</div>

          <div className="mt-4">
            <Button variant="secondary" onClick={() => void onLogout()}>
              <Icon name="logout" className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-slate-100 font-semibold">PWA (instalação)</div>
        <div className="mt-2 text-sm text-slate-400 grid gap-2">
          <div>• No Chrome/Edge: menu ⋮ → <span className="text-slate-200">Instalar app</span>.</div>
          <div>• No iOS Safari: Compartilhar → <span className="text-slate-200">Adicionar à Tela de Início</span>.</div>
          <div>• O SaltInvest suporta cache offline básico via Workbox (vite-plugin-pwa).</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-slate-100 font-semibold">Privacidade e segurança</div>
        <div className="mt-2 text-sm text-slate-400 grid gap-1">
          <div>• Rotas /app/* são protegidas por sessão (AuthGuard).</div>
          <div>• As tabelas usam RLS e políticas por <span className="text-slate-200">user_id</span>.</div>
          <div>• A chave anon do Supabase fica no cliente (padrão Supabase). Evite expor service_role.</div>
        </div>
      </Card>
    </div>
  );
}
