import React from "react";
import PwaPrompts from "@/pwa/PwaPrompts";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/routes/ScrollToTop";
import ProtectedRoute from "@/state/auth/ProtectedRoute";
import AppShell from "@/ui/layout/AppShell";

// PERF: code-splitting por rota.
// Isso reduz drasticamente o bundle inicial (principalmente no mobile).
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const SignUpPage = React.lazy(() => import("@/pages/auth/SignUpPage"));
const ResetPasswordPage = React.lazy(() => import("@/pages/auth/ResetPasswordPage"));
const NewPasswordPage = React.lazy(() => import("@/pages/auth/NewPasswordPage"));

const DashboardPage = React.lazy(() => import("@/pages/dashboard/DashboardPage"));
const MonthlyPlanPage = React.lazy(() => import("@/pages/monthly/MonthlyPlanPage"));
const ExposureInvestmentsPage = React.lazy(() => import("@/pages/exposure/ExposureInvestmentsPage"));
const InvestmentsPage = React.lazy(() => import("@/pages/investments/InvestmentsPage"));
const GoalsPage = React.lazy(() => import("@/pages/goals/GoalsPage"));
const GoalsYearPage = React.lazy(() => import("@/pages/goals/GoalsYearPage"));
const ClassesPage = React.lazy(() => import("@/pages/classes/ClassesPage"));
const TargetsPage = React.lazy(() => import("@/pages/targets/TargetsPage"));
const InstitutionsPage = React.lazy(() => import("@/pages/institutions/InstitutionsPage"));
const SettingsPage = React.lazy(() => import("@/pages/settings/SettingsPage"));
const NotFoundPage = React.lazy(() => import("@/pages/system/NotFoundPage"));

import { useAuth } from "@/state/auth/AuthContext";
import FullScreenLoader from "@/ui/feedback/FullScreenLoader";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Inicializando..." />;
  return <Navigate to={user ? "/app/dashboard" : "/login"} replace />;
}

export default function App() {
  React.useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = (t.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((t as any).isContentEditable) return true;
      if (t.closest?.('[data-allow-select="true"]')) return true;
      return false;
    };

    const onCopy = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const onCut = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    const onContextMenu = (e: MouseEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const onSelectStart = (e: Event) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);

    };
  }, []);

  return (
    <BrowserRouter>
      <PwaPrompts />
      <ScrollToTop />
      <React.Suspense fallback={<FullScreenLoader label="Carregando..." />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/login" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />
          <Route path="/reset" element={<ResetPasswordPage />} />
          <Route path="/auth/reset" element={<Navigate to="/reset" replace />} />
          {/* Compat: mantém /reset-password, mas o app inteiro usa o prefixo /app */}
          <Route path="/reset-password" element={<Navigate to="/app/reset-password" replace />} />
          <Route path="/app/reset-password" element={<NewPasswordPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="monthly-plan" element={<MonthlyPlanPage />} />
            <Route path="exposure" element={<ExposureInvestmentsPage />} />
            <Route path="investments" element={<InvestmentsPage />} />

            <Route path="goals" element={<GoalsPage />} />
            {/* Rotas premium: visão anual detalhada */}
            <Route path="goals/year" element={<GoalsYearPage />} />
            <Route path="metas/ano" element={<GoalsYearPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="targets" element={<TargetsPage />} />
            <Route path="institutions" element={<InstitutionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
