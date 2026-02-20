import React from "react";
import { NavLink } from "react-router-dom";
import Card from "../primitives/Card";
import Button from "../primitives/Button";
import Modal from "../primitives/Modal";
import { navMainItems } from "./nav";
import { Icon } from "./icons";
import { useAuth } from "@/state/auth/AuthContext";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="h-10 w-10 rounded-xl2 bg-gradient-to-br from-emerald-500/90 to-sky-400/90 flex items-center justify-center text-slate-950 font-black">
        SI
      </div>
      <div>
        <div className="font-semibold text-slate-900 leading-tight">SaltInvest</div>
        <div className="text-xs text-slate-600">Gestão premium</div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div className="sticky top-6">
      <Card className="p-3">
        <Brand />

        <div className="mt-3 grid gap-1">
          {navMainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-sm transition border",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600/20 shadow-soft"
                    : "border-transparent hover:bg-slate-50 text-slate-700"
                ].join(" ")
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200/70 pt-4 px-2">
          <div className="text-xs text-slate-600">Logado como</div>
          <div className="text-sm text-slate-800 truncate">{user?.email ?? "—"}</div>

          <Button variant="secondary" className="mt-3 w-full justify-center" onClick={() => setConfirmOpen(true)}>
            <Icon name="logout" className="h-4 w-4" />
            Sair
          </Button>
        </div>
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
        <div className="text-slate-800">Tem certeza que deseja sair?</div>
        <div className="mt-2 text-sm text-slate-600">Você precisará fazer login novamente para acessar seus dados.</div>
      </Modal>
    </div>
  );
}
