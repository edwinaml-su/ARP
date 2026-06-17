import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["success", "running", "queued", "failed", "timeout"];

export default async function ExecutionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireUser();
  const status = searchParams.status;
  const where = status && STATUSES.includes(status) ? { status } : {};

  const executions = await prisma.execution.findMany({
    where,
    take: 100,
    orderBy: { startedAt: "desc" },
    include: { report: { select: { id: true, code: true, name: true } } },
  });

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Historial de ejecuciones
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="Todas" href="/executions" active={!status} />
          {STATUSES.map((s) => (
            <FilterChip key={s} label={s} href={`/executions?status=${s}`} active={status === s} />
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Reporte</th>
              <th className="th">Inicio</th>
              <th className="th">Fin</th>
              <th className="th">Estado</th>
              <th className="th">Duracion</th>
              <th className="th">Filas</th>
              <th className="th">Correos</th>
              <th className="th">Disparo</th>
              <th className="th">Archivos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {executions.map((e) => {
              const files =
                e.outputFiles && typeof e.outputFiles === "object"
                  ? Object.values(e.outputFiles as Record<string, string>)
                  : [];
              return (
                <tr key={String(e.id)} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/reports/${e.report?.id}`} className="font-medium text-slate-800 hover:text-avante-navy">
                      {e.report?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="td whitespace-nowrap">{formatDateTime(e.startedAt)}</td>
                  <td className="td whitespace-nowrap">{formatDateTime(e.finishedAt)}</td>
                  <td className="td"><StatusBadge status={e.status} /></td>
                  <td className="td">{formatDuration(e.durationSec)}</td>
                  <td className="td">{e.rowsProcessed ?? "—"}</td>
                  <td className="td">{e.emailsSent ?? "—"}</td>
                  <td className="td capitalize">{e.triggeredBy}</td>
                  <td className="td text-xs text-slate-500">
                    {files.length ? files.join(", ") : e.errorMessage ? <span className="text-avante-accent">{e.errorMessage}</span> : "—"}
                  </td>
                </tr>
              );
            })}
            {executions.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={9}>Sin ejecuciones.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
        active ? "bg-avante-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}
