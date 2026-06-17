import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, RefreshCw, FileCode2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/auth";
import { ActiveBadge, StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { RunButton } from "@/components/RunButton";
import { InlineToggle, DeleteButton, EditableValue } from "@/components/actions";
import { AddSchedule, AddRecipient, AddParameter } from "@/components/forms";
import { describeCron } from "@/lib/cron";
import { formatDateTime, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const editable = canEdit(user.role);
  const id = Number(params.id);

  const report = await prisma.reportDefinition.findUnique({
    where: { id },
    include: {
      schedules: { orderBy: { id: "asc" } },
      recipients: { orderBy: [{ type: "asc" }, { email: "asc" }] },
      parameters: { orderBy: { paramKey: "asc" } },
      dependencies: { orderBy: { depName: "asc" } },
      executions: { orderBy: { startedAt: "desc" }, take: 8 },
    },
  });

  if (!report) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-avante-navy"
        >
          <ArrowLeft size={15} /> Reportes
        </Link>
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {report.code}
                </code>
                <ActiveBadge active={report.active} />
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold capitalize text-avante-navy">
                  {report.runtime}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{report.name}</h2>
              <p className="text-sm text-slate-500">{report.description}</p>
            </div>
            {editable && <RunButton reportId={report.id} />}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm md:grid-cols-4">
            <Detail icon={<FileCode2 size={15} />} label="Script" value={report.scriptPath} mono />
            <Detail icon={<Clock size={15} />} label="Timeout" value={`${report.timeoutMinutes} min`} />
            <Detail icon={<RefreshCw size={15} />} label="Reintentos" value={`${report.retryCount} · ${report.retryDelaySec}s`} />
            <Detail label="Area / Owner" value={`${report.businessUnit ?? "—"}`} sub={report.ownerEmail ?? ""} />
          </div>
        </div>
      </div>

      {/* HORARIOS */}
      <Section title="Horarios" count={report.schedules.length} action={editable && <AddSchedule reportId={report.id} />}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Cron</th>
              <th className="th">Frecuencia</th>
              <th className="th">Zona</th>
              <th className="th">Descripcion</th>
              <th className="th text-center">Activo</th>
              {editable && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.schedules.map((s) => (
              <tr key={s.id}>
                <td className="td"><code className="text-xs">{s.cronExpression}</code></td>
                <td className="td">{describeCron(s.cronExpression)}</td>
                <td className="td text-xs text-slate-500">{s.timezone}</td>
                <td className="td">{s.description}</td>
                <td className="td text-center">
                  <InlineToggle endpoint="/api/schedules" id={s.id} value={!!s.active} disabled={!editable} />
                </td>
                {editable && (
                  <td className="td text-right">
                    <DeleteButton endpoint="/api/schedules" id={s.id} />
                  </td>
                )}
              </tr>
            ))}
            {report.schedules.length === 0 && <Empty cols={editable ? 6 : 5} />}
          </tbody>
        </table>
      </Section>

      {/* DESTINATARIOS */}
      <Section title="Destinatarios" count={report.recipients.length} action={editable && <AddRecipient reportId={report.id} />}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Tipo</th>
              <th className="th">Correo</th>
              <th className="th">Nombre</th>
              <th className="th">Area</th>
              <th className="th text-center">Solo prod</th>
              <th className="th text-center">Activo</th>
              {editable && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.recipients.map((r) => (
              <tr key={r.id}>
                <td className="td"><TypeBadge type={r.type} /></td>
                <td className="td">{r.email}</td>
                <td className="td">{r.fullName}</td>
                <td className="td text-slate-500">{r.role}</td>
                <td className="td text-center">{r.onlyInProd ? "Si" : "—"}</td>
                <td className="td text-center">
                  <InlineToggle endpoint="/api/recipients" id={r.id} value={!!r.active} disabled={!editable} />
                </td>
                {editable && (
                  <td className="td text-right">
                    <DeleteButton endpoint="/api/recipients" id={r.id} />
                  </td>
                )}
              </tr>
            ))}
            {report.recipients.length === 0 && <Empty cols={editable ? 7 : 6} />}
          </tbody>
        </table>
      </Section>

      {/* PARAMETROS */}
      <Section title="Parametros" count={report.parameters.length} action={editable && <AddParameter reportId={report.id} />}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Clave</th>
              <th className="th">Valor</th>
              <th className="th">Tipo</th>
              <th className="th">Descripcion</th>
              {editable && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.parameters.map((p) => (
              <tr key={p.id}>
                <td className="td"><code className="text-xs font-semibold">{p.paramKey}</code></td>
                <td className="td">
                  <EditableValue endpoint="/api/parameters" id={p.id} field="paramValue" value={p.paramValue ?? ""} disabled={!editable} />
                </td>
                <td className="td"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{p.paramType}</span></td>
                <td className="td text-slate-500">{p.description}</td>
                {editable && (
                  <td className="td text-right">
                    <DeleteButton endpoint="/api/parameters" id={p.id} />
                  </td>
                )}
              </tr>
            ))}
            {report.parameters.length === 0 && <Empty cols={editable ? 5 : 4} />}
          </tbody>
        </table>
      </Section>

      {/* DEPENDENCIAS */}
      <Section title="Dependencias" count={report.dependencies.length}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Tipo</th>
              <th className="th">Paquete</th>
              <th className="th">Version</th>
              <th className="th">Proposito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.dependencies.map((d) => (
              <tr key={d.id}>
                <td className="td capitalize">{d.depType}</td>
                <td className="td font-mono text-xs">{d.depName}</td>
                <td className="td text-xs">{d.depVersion}</td>
                <td className="td text-slate-500">{d.purpose}</td>
              </tr>
            ))}
            {report.dependencies.length === 0 && <Empty cols={4} />}
          </tbody>
        </table>
      </Section>

      {/* EJECUCIONES */}
      <Section title="Ejecuciones recientes" count={report.executions.length}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Inicio</th>
              <th className="th">Estado</th>
              <th className="th">Duracion</th>
              <th className="th">Filas</th>
              <th className="th">Correos</th>
              <th className="th">Disparo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.executions.map((e) => (
              <tr key={String(e.id)}>
                <td className="td whitespace-nowrap">{formatDateTime(e.startedAt)}</td>
                <td className="td"><StatusBadge status={e.status} /></td>
                <td className="td">{formatDuration(e.durationSec)}</td>
                <td className="td">{e.rowsProcessed ?? "—"}</td>
                <td className="td">{e.emailsSent ?? "—"}</td>
                <td className="td capitalize">{e.triggeredBy}</td>
              </tr>
            ))}
            {report.executions.length === 0 && <Empty cols={6} />}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  sub,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <p className={`mt-1 text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">
          {title} <span className="text-slate-400">({count})</span>
        </h3>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty({ cols }: { cols: number }) {
  return (
    <tr>
      <td className="td text-slate-400" colSpan={cols}>
        Sin registros.
      </td>
    </tr>
  );
}
