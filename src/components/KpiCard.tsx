import { type ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "navy",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: "navy" | "green" | "red" | "gold";
}) {
  const tones: Record<string, string> = {
    navy: "text-avante-navy bg-blue-50",
    green: "text-emerald-600 bg-emerald-50",
    red: "text-avante-accent bg-red-50",
    gold: "text-amber-600 bg-amber-50",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        {icon && (
          <div className={`rounded-lg p-2.5 ${tones[tone]}`}>{icon}</div>
        )}
      </div>
    </div>
  );
}
