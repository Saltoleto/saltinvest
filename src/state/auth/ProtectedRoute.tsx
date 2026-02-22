import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import FullScreenLoader from "@/ui/feedback/FullScreenLoader";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, configError } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader label="Validando sessão..." />;

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-xl2 border border-amber-200 bg-amber-50 p-6">
          <div className="text-slate-900 font-semibold">Configuração do Supabase necessária</div>
          <div className="mt-2 text-sm text-amber-900">{configError}</div>
          <div className="mt-4 text-sm text-slate-700">
            Depois de configurar o .env.local, reinicie o dev server.
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}
