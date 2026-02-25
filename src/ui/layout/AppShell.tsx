import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName?.toLowerCase?.() ?? "";
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as any).isContentEditable) return true;
  return false;
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = React.useState(false);

  // PERF: Prefetch das telas mais prováveis após entrar no app.
  // Isso melhora muito a navegação percebida (principalmente no mobile),
  // sem inflar o bundle inicial (pois continua em chunks separados).
  React.useEffect(() => {
    const run = () => {
      // Prefetch só quando o usuário já entrou no /app.
      if (!location.pathname.startsWith("/app")) return;
      // Rotas mais acessadas.
      import("@/pages/dashboard/DashboardPage");
      import("@/pages/monthly/MonthlyPlanPage");
      import("@/pages/exposure/ExposureInvestmentsPage");
      import("@/pages/investments/InvestmentsPage");
      import("@/pages/goals/GoalsPage");
    };

    const w = window as any;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 350);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  React.useEffect(() => {
    // simple guard for trailing /app
    if (location.pathname === "/app") navigate("/app/dashboard", { replace: true });
  }, [location.pathname, navigate]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl + K: command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        if (isEditable(document.activeElement)) return;
        e.preventDefault();
        setCmdOpen(true);
        return;
      }

      // Quick open with "/" only when not typing in inputs.
      if (!e.ctrlKey && !e.metaKey && e.key === "/") {
        if (isEditable(document.activeElement)) return;
        e.preventDefault();
        setCmdOpen(true);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6 py-4 lg:py-6">
          <aside className="hidden lg:block">
            <Sidebar onOpenCommandPalette={() => setCmdOpen(true)} />
          </aside>

          <main className="min-h-[calc(100vh-2rem)]">
            <TopBar onOpenCommandPalette={() => setCmdOpen(true)} />
            <div className="mt-4 pb-24 lg:pb-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <div className="lg:hidden">
        <MobileNav />
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
