import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/state/auth/ProtectedRoute";
import AppShell from "@/ui/layout/AppShell";

import LoginPage from "@/pages/auth/LoginPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

import DashboardPage from "@/pages/dashboard/DashboardPage";
import MonthlyPlanPage from "@/pages/monthly/MonthlyPlanPage";
import InvestmentsPage from "@/pages/investments/InvestmentsPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import ClassesPage from "@/pages/classes/ClassesPage";
import TargetsPage from "@/pages/targets/TargetsPage";
import InstitutionsPage from "@/pages/institutions/InstitutionsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotFoundPage from "@/pages/system/NotFoundPage";

import { useAuth } from "@/state/auth/AuthContext";
import FullScreenLoader from "@/ui/feedback/FullScreenLoader";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Inicializando..." />;
  return <Navigate to={user ? "/app/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/reset" element={<ResetPasswordPage />} />

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

          <Route path="investments" element={<InvestmentsPage />} />


          <Route path="goals" element={<GoalsPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="targets" element={<TargetsPage />} />
          <Route path="institutions" element={<InstitutionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
