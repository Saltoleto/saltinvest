import React from "react";
import { NavLink } from "react-router-dom";
import { navMainItems } from "./nav";
import { Icon } from "./icons";
import { cn } from "@/ui/utils/cn";

const mobileItems = navMainItems.filter((x) =>
  ["/app/dashboard", "/app/investments", "/app/exposure", "/app/goals", "/app/monthly-plan", "/app/settings"].includes(x.to)
);

export default function MobileNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 py-2">
        <div className="grid grid-cols-6 gap-0">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center rounded-xl2 px-2 py-2 transition",
                  isActive ? "text-blue-600" : "text-slate-600 hover:text-slate-900"
                )
              }
            >
              {({ isActive }) => (
                <span className="relative flex items-center justify-center">
                  <Icon name={item.icon} className="h-6 w-6" />
                  {isActive ? <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-blue-600" /> : null}
                  <span className="sr-only">{item.label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
