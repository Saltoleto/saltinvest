import React, { useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import { Icon } from "@/ui/layout/icons";
import Button from "@/ui/primitives/Button";
import Modal from "@/ui/primitives/Modal";
import { useAuth } from "@/state/auth/AuthContext";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  return (
    <div className="grid gap-4 lg:gap-6">
      <Card className="p-4">
        <div className="text-slate-900 font-semibold">Cadastros</div>
        <div className="mt-1 text-sm text-slate-600">Acesse configurações avançadas do seu portfólio.</div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/app/targets"
            className="rounded-xl2 border border-slate-200/70 bg-white px-4 py-3 hover:bg-slate-50 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon name="pie" className="h-5 w-5 text-slate-800" />
              <div>
                <div className="text-slate-900 font-medium">Alvos</div>
                <div className="text-xs text-slate-600">Percentual por classe</div>
              </div>
            </div>
          </Link>

          <Link
            to="/app/classes"
            className="rounded-xl2 border border-slate-200/70 bg-white px-4 py-3 hover:bg-slate-50 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon name="layers" className="h-5 w-5 text-slate-800" />
              <div>
                <div className="text-slate-900 font-medium">Classes</div>
                <div className="text-xs text-slate-600">Categorias de ativos</div>
              </div>
            </div>
          </Link>

          <Link
            to="/app/institutions"
            className="rounded-xl2 border border-slate-200/70 bg-white px-4 py-3 hover:bg-slate-50 transition flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon name="bank" className="h-5 w-5 text-slate-800" />
              <div>
                <div className="text-slate-900 font-medium">Instituições</div>
                <div className="text-xs text-slate-600">Bancos e corretoras</div>
              </div>
            </div>
          </Link>
        </div>
      </Card>

      {/* Sessão (somente mobile) */}
      <Card className="p-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-slate-900 font-semibold">Sessão</div>
            <div className="mt-1 text-sm text-slate-600">Logado como {user?.email}</div>
          </div>
          <Button variant="secondary" onClick={() => setConfirmLogout(true)} className="whitespace-nowrap">
            <span className="mr-2 inline-flex">
              <Icon name="logout" className="h-4 w-4" />
            </span>
            Sair
          </Button>
        </div>
      </Card>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Sair da conta">
        <p className="text-sm text-slate-600">Tem certeza que deseja sair? Você precisará fazer login novamente para acessar seus dados.</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmLogout(false)}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              setConfirmLogout(false);
              await signOut();
            }}
          >
            Sair
          </Button>
        </div>
      </Modal>
    </div>
  );
}
