import React from "react";
import { NavLink } from "react-router-dom";
import { navItems } from "./nav";
import { Icon } from "./icons";

const mobileItems = navItems.filter((x) => ["/app/dashboard", "/app/investments", "/app/goals", "/app/monthly-plan", "/app/settings"].includes(x.to));

export default function MobileNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 py-2">
        <div className="grid grid-cols-5 gap-1">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center gap-1 rounded-xl2 px-2 py-2 text-[11px] transition",
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                ].join(" ")
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span className="leading-none">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
