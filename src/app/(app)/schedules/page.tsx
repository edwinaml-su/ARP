import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/auth";
import { InlineToggle, DeleteButton } from "@/components/actions";
import { describeCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const user = await requireUser();
  const editable = canEdit(user.role);

  const schedules = await prisma.schedule.findMany({
    orderBy: [{ reportId: "asc" }, { id: "asc" }],
    include: { report: { select: { id: true, code: true, name: true } } },
  });

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Horarios programados ({schedules.length})
        </h2>
        <p className="text-xs text-slate-400">
          Expresiones cron por reporte. El alta se hace dentro de cada reporte.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Reporte</th>
              <th className="th">Cron</th>
              <th className="th">Frecuencia</th>
              <th className="th">Zona</th>
              <th className="th">Descripcion</th>
              <th className="th text-center">Activo</th>
              {editable && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="td">
                  <Link href={`/reports/${s.report?.id}`} className="font-medium text-slate-800 hover:text-avante-navy">
                    {s.report?.name}
                  </Link>
                </td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
