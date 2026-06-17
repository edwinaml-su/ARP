import Link from "next/link";
import {
  FileBarChart,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/auth";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { RunButton } from "@/components/RunButton";
import { formatDateTime, formatRelative, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const editable = canEdit(user.role);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [reports, activeReports, schedulesCount, recipientsCount, recent, last24, lastPerReport] =
    await Promise.all([
      prisma.reportDefinition.count(),
      prisma.reportDefinition.count({ where: { active: true } }),
      prisma.schedule.count({ where: { active: true } }),
      prisma.recipient.count({ where: { active: true } }),
      prisma.execution.findMany({
        take: 8,
        orderBy: { startedAt: "desc" },
        include: { report: { select: { code: true, name: true } } },
      }),
      prisma.execution.groupBy({
        by: ["status"],
        where: { startedAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.execution.findMany({
        orderBy: [{ reportId: "asc" }, { startedAt: "desc" }],
        distinct: ["reportId"],
        include: { report: { select: { id: true, code: true, name: true } } },
      }),
    ]);

  const countBy = (s: string) =>
    last24.find((r) => r.status === s)?._count._all ?? 0;
  const total24 = last24.reduce((a, r) => a + r._count._all, 0);

  const allReports = await prisma.reportDefinition.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, active: true, businessUnit: true },
  });
  const lastMap = new Map(lastPerReport.map((e) => [e.reportId, e]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Reportes activos"
          value={`${activeReports}/${reports}`}
          sub={`${schedulesCount} horarios · ${recipientsCount} destinatarios`}
          icon={<FileBarChart size={22} />}
          tone="navy"
        />
        <KpiCard
          label="Ejecuciones (24h)"
          value={total24}
          icon={<Activity size={22} />}
          tone="gold"
        />
        <KpiCard
          label="Exitosas (24h)"
          value={countBy("success")}
          icon={<CheckCircle2 size={22} />}
          tone="green"
        />
        <KpiCard
          label="Fallidas (24h)"
          value={countBy("failed") + countBy("timeout")}
          icon={<XCircle size={22} />}
          tone="red"
        />
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Estado por reporte</h2>
          <Link href="/reports" className="text-sm font-medium text-avante-navy hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {allReports.map((r) => {
            const last = lastMap.get(r.id);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/reports/${r.id}`}
                    className="block truncate text-sm font-semibold text-slate-800 hover:text-avante-navy"
                  >
                    {r.name}
                  </Link>
                  <p className="truncate text-xs text-slate-400">
                    {r.businessUnit} ·{" "}
                    {last ? formatRelative(last.startedAt) : "sin ejecuciones"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-2">
                  <StatusBadge status={last?.status} />
                  {editable && <RunButton reportId={r.id} size="sm" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Ejecuciones recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Reporte</th>
                <th className="th">Inicio</th>
                <th className="th">Estado</th>
                <th className="th">Duracion</th>
                <th className="th">Correos</th>
                <th className="th">Disparo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((e) => (
                <tr key={String(e.id)} className="hover:bg-slate-50">
                  <td className="td font-medium">{e.report?.name ?? "—"}</td>
                  <td className="td whitespace-nowrap">{formatDateTime(e.startedAt)}</td>
                  <td className="td"><StatusBadge status={e.status} /></td>
                  <td className="td">{formatDuration(e.durationSec)}</td>
                  <td className="td">{e.emailsSent ?? "—"}</td>
                  <td className="td capitalize">{e.triggeredBy}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td className="td text-slate-400" colSpan={6}>
                    Sin ejecuciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
