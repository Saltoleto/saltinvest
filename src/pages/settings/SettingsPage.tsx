import React from "react";
import { Link } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import { Icon } from "@/ui/layout/icons";

export default function SettingsPage() {
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
    </div>
  );
}
