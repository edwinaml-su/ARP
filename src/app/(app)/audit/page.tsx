import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTION_CLS: Record<string, string> = {
  INSERT: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

const TABLE_LABEL: Record<string, string> = {
  recipients: "Destinatarios",
  parameters: "Parametros",
  schedules: "Horarios",
};

export default async function AuditPage() {
  await requireUser();
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { changedAt: "desc" },
  });

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">Auditoria de cambios</h2>
        <p className="text-xs text-slate-400">
          Registro automatico de INSERT/UPDATE/DELETE en destinatarios, parametros y horarios.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Cuando</th>
              <th className="th">Tabla</th>
              <th className="th">Accion</th>
              <th className="th">Registro</th>
              <th className="th">Usuario</th>
              <th className="th">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={String(l.id)} className="hover:bg-slate-50 align-top">
                <td className="td whitespace-nowrap">{formatDateTime(l.changedAt)}</td>
                <td className="td">{TABLE_LABEL[l.tableName] ?? l.tableName}</td>
                <td className="td">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_CLS[l.action ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                    {l.action}
                  </span>
                </td>
                <td className="td">#{l.recordId}</td>
                <td className="td text-xs text-slate-500">{l.changedBy ?? "—"}</td>
                <td className="td">
                  <details>
                    <summary className="cursor-pointer text-xs text-avante-navy">Ver valores</summary>
                    <pre className="mt-1 max-w-md overflow-x-auto rounded bg-slate-50 p-2 text-[11px] leading-tight text-slate-600">
{JSON.stringify(l.newValues ?? l.oldValues, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="td text-slate-400" colSpan={6}>
                  Sin cambios registrados todavia. Edita un destinatario, parametro u horario para ver el rastro aqui.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
