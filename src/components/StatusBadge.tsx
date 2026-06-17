const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "Exito", cls: "bg-emerald-100 text-emerald-700" },
  running: { label: "En curso", cls: "bg-blue-100 text-blue-700" },
  queued: { label: "En cola", cls: "bg-slate-100 text-slate-600" },
  failed: { label: "Fallo", cls: "bg-red-100 text-red-700" },
  timeout: { label: "Timeout", cls: "bg-amber-100 text-amber-700" },
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = (status && STATUS[status]) || {
    label: status ?? "—",
    cls: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

export function ActiveBadge({ active }: { active?: boolean | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    TO: "bg-avante-navy text-white",
    CC: "bg-sky-100 text-sky-700",
    BCC: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={`inline-flex w-10 justify-center rounded px-1.5 py-0.5 text-xs font-bold ${
        map[type] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {type}
    </span>
  );
}
