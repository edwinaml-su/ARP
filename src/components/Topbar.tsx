"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { ROLE_LABELS, type Role } from "@/lib/roles";

const ROLE_CLS: Record<Role, string> = {
  admin: "bg-avante-accent text-white",
  editor: "bg-avante-gold text-avante-navy",
  viewer: "bg-slate-200 text-slate-600",
};

const TITLES: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Panel de control" },
  { prefix: "/reports", label: "Reportes" },
  { prefix: "/schedules", label: "Horarios" },
  { prefix: "/recipients", label: "Destinatarios" },
  { prefix: "/parameters", label: "Parametros" },
  { prefix: "/executions", label: "Ejecuciones" },
  { prefix: "/audit", label: "Auditoria de cambios" },
  { prefix: "/users", label: "Usuarios" },
];

export function Topbar({ email, role }: { email: string; role: Role }) {
  const pathname = usePathname();
  const title =
    TITLES.find((t) => pathname.startsWith(t.prefix))?.label ?? "Avante";

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-slate-700">{email}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_CLS[role]}`}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-ghost" title="Cerrar sesion">
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
