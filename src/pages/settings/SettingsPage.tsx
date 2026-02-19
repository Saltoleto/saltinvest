import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import { Icon } from "@/ui/layout/icons";
import Button from "@/ui/primitives/Button";
import Modal from "@/ui/primitives/Modal";
import { useAuth } from "@/state/auth/AuthContext";

export default function SettingsPage() {
  const nav = useNavigate();
  const { signOut, user } = useAuth();
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  async function doLogout() {
    await signOut();
    nav("/login");
  }

  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="text-slate-100 font-semibold">Cadastros</div>
        <div className="mt-1 text-sm text-slate-400">Acesse configurações avançadas do seu portfólio.</div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/app/targets"
            className="rounded-xl2 border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon name="pie" className="h-5 w-5 text-slate-200" />
              <div>
                <div className="text-slate-100 font-medium">Alvos</div>
                <div className="text-xs text-slate-400">Percentual por classe</div>
              </div>
            </div>
          </Link>

          <Link
            to="/app/classes"
            className="rounded-xl2 border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon name="layers" className="h-5 w-5 text-slate-200" />
              <div>
                <div className="text-slate-100 font-medium">Classes</div>
                <div className="text-xs text-slate-400">Categorias de ativos</div>
              </div>
            </div>
          </Link>

          <Link
            to="/app/institutions"
            className="rounded-xl2 border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon name="bank" className="h-5 w-5 text-slate-200" />
              <div>
                <div className="text-slate-100 font-medium">Instituições</div>
                <div className="text-xs text-slate-400">Bancos e corretoras</div>
              </div>
            </div>
          </Link>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-slate-100 font-semibold">Instalação</div>
        <div className="mt-2 text-sm text-slate-400 grid gap-2">
          <div>
            • No Chrome/Edge: menu ⋮ → <span className="text-slate-200">Instalar app</span>.
          </div>
          <div>
            • No iOS Safari: Compartilhar → <span className="text-slate-200">Adicionar à Tela de Início</span>.
          </div>
        </div>
      </Card>
    
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-100 font-semibold">Sessão</div>
            <div className="mt-1 text-sm text-slate-400">Saia com segurança da sua conta.</div>
          </div>
          <Button variant="secondary" onClick={() => setConfirmLogout(true)} className="shrink-0">
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </Card>

      <Modal
        open={confirmLogout}
        title="Sair do SaltInvest"
        onClose={() => setConfirmLogout(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLogout(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={doLogout}>
              Sair
            </Button>
          </>
        }
      >
        <div className="text-sm text-slate-300">
          Você está conectado como <span className="text-slate-100 font-medium">{user?.email ?? "—"}</span>.
          <div className="mt-2 text-slate-400">Tem certeza que deseja encerrar a sessão?</div>
        </div>
      </Modal>

    </div>
  );
}
