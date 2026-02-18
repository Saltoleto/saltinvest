import React from "react";
import { NavLink } from "react-router-dom";
import Card from "../primitives/Card";
import Button from "../primitives/Button";
import { navItems } from "./nav";
import { Icon } from "./icons";
import { useAuth } from "@/state/auth/AuthContext";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="h-10 w-10 rounded-xl2 bg-gradient-to-br from-emerald-500/90 to-sky-400/90 flex items-center justify-center text-slate-950 font-black">
        SI
      </div>
      <div>
        <div className="font-semibold text-slate-100 leading-tight">SaltInvest</div>
        <div className="text-xs text-slate-400">Gestão premium</div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <div className="sticky top-6">
      <Card className="p-3">
        <Brand />

        <div className="mt-3 grid gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-sm transition border",
                  isActive ? "bg-white/10 border-white/15 text-white" : "border-transparent hover:bg-white/6 text-slate-200"
                ].join(" ")
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4 px-2">
          <div className="text-xs text-slate-400">Logado como</div>
          <div className="text-sm text-slate-200 truncate">{user?.email ?? "—"}</div>

          <Button
            variant="secondary"
            className="mt-3 w-full justify-center"
            onClick={() => void signOut()}
          >
            <Icon name="logout" className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}
