import React from "react";
import Card from "@/ui/primitives/Card";

export default function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl2 bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-soft">
            SI
          </div>
          <div className="mt-3 text-xl font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
        </div>

        <Card className="p-5 sm:p-6">{children}</Card>

        <div className="mt-5 text-center text-xs text-slate-500">
          <span>SaltInvest • PWA • Supabase</span>
        </div>
      </div>
    </div>
  );
}
