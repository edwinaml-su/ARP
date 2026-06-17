import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/auth";
import { ActiveBadge } from "@/components/StatusBadge";
import { RunButton } from "@/components/RunButton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const editable = canEdit(user.role);

  const reports = await prisma.reportDefinition.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { schedules: true, recipients: true, parameters: true } },
    },
  });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Catalogo de reportes ({reports.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Codigo</th>
              <th className="th">Nombre</th>
              <th className="th">Area</th>
              <th className="th">Runtime</th>
              <th className="th text-center">Horarios</th>
              <th className="th text-center">Dest.</th>
              <th className="th text-center">Param.</th>
              <th className="th text-center">Estado</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                    {r.code}
                  </code>
                </td>
                <td className="td">
                  <Link
                    href={`/reports/${r.id}`}
                    className="font-medium text-slate-800 hover:text-avante-navy"
                  >
                    {r.name}
                  </Link>
                  <p className="text-xs text-slate-400">{r.description}</p>
                </td>
                <td className="td">{r.businessUnit}</td>
                <td className="td capitalize">{r.runtime}</td>
                <td className="td text-center">{r._count.schedules}</td>
                <td className="td text-center">{r._count.recipients}</td>
                <td className="td text-center">{r._count.parameters}</td>
                <td className="td text-center"><ActiveBadge active={r.active} /></td>
                <td className="td">
                  <div className="flex items-center justify-end gap-2">
                    {editable && <RunButton reportId={r.id} size="sm" />}
                    <Link
                      href={`/reports/${r.id}`}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-avante-navy"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
