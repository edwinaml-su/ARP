"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileBarChart,
  CalendarClock,
  Users,
  Sliders,
  History,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { Role } from "@/lib/roles";

const NAV = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
  { href: "/schedules", label: "Horarios", icon: CalendarClock },
  { href: "/recipients", label: "Destinatarios", icon: Users },
  { href: "/parameters", label: "Parametros", icon: Sliders },
  { href: "/executions", label: "Ejecuciones", icon: History },
  { href: "/audit", label: "Auditoria", icon: ShieldCheck },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = [...NAV];
  if (role === "admin")
    items.push({ href: "/users", label: "Usuarios", icon: UserCog });

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-avante-navy text-slate-200">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-avante-accent font-bold text-white">
          A
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Avante</p>
          <p className="text-[11px] text-slate-400">Reports Platform</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-slate-500">
        13 reportes · v1.0
      </div>
    </aside>
  );
}
