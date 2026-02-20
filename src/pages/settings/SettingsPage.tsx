import React from "react";
import { Link } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";
import Modal from "@/ui/primitives/Modal";
import { Icon } from "@/ui/layout/icons";
import { useAuth } from "@/state/auth/AuthContext";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

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

      {/* Conta (visível no mobile, onde o sidebar pode ficar oculto) */}
      <Card className="p-4 lg:hidden">
        <div className="text-slate-100 font-semibold">Conta</div>
        <div className="mt-1 text-sm text-slate-400">Gerencie sua sessão com segurança.</div>

        <div className="mt-4 rounded-xl2 border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-xs text-slate-400">Logado como</div>
          <div className="mt-1 text-sm text-slate-200 truncate">{user?.email ?? "—"}</div>
        </div>

        <Button variant="secondary" className="mt-4 w-full justify-center" onClick={() => setConfirmOpen(true)}>
          <Icon name="logout" className="h-4 w-4" />
          Sair
        </Button>
      </Card>

      <Modal
        open={confirmOpen}
        title="Sair da conta"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setConfirmOpen(false);
                await signOut();
              }}
            >
              Sair
            </Button>
          </>
        }
      >
        <div className="text-slate-200">Tem certeza que deseja sair?</div>
        <div className="mt-2 text-sm text-slate-400">Você precisará fazer login novamente para acessar seus dados.</div>
      </Modal>
    </div>
  );
}
