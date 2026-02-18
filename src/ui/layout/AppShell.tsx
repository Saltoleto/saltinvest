import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import TopBar from "./TopBar";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    // simple guard for trailing /app
    if (location.pathname === "/app") navigate("/app/dashboard", { replace: true });
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6 py-4 lg:py-6">
          <aside className="hidden lg:block">
            <Sidebar />
          </aside>

          <main className="min-h-[calc(100vh-2rem)]">
            <TopBar />
            <div className="mt-4 pb-24 lg:pb-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
