import React from "react";
import { Link } from "react-router-dom";
import Card from "@/ui/primitives/Card";
import Button from "@/ui/primitives/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-6 max-w-md w-full text-center">
        <div className="text-2xl font-semibold">Página não encontrada</div>
        <div className="mt-2 text-slate-400 text-sm">O caminho que você tentou acessar não existe.</div>
        <div className="mt-5">
          <Link to="/app/dashboard">
            <Button>Ir para o Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
