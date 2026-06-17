import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/auth";
import { EditableValue, DeleteButton } from "@/components/actions";

export const dynamic = "force-dynamic";

export default async function ParametersPage() {
  const user = await requireUser();
  const editable = canEdit(user.role);

  const parameters = await prisma.parameter.findMany({
    orderBy: [{ reportId: "asc" }, { paramKey: "asc" }],
    include: { report: { select: { id: true, name: true } } },
  });

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Parametros editables ({parameters.length})
        </h2>
        <p className="text-xs text-slate-400">
          Variables por reporte (fechas, IDs, rutas). Editar no requiere tocar codigo.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Reporte</th>
              <th className="th">Clave</th>
              <th className="th">Valor</th>
              <th className="th">Tipo</th>
              <th className="th">Descripcion</th>
              {editable && <th className="th"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parameters.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td">
                  <Link href={`/reports/${p.report?.id}`} className="text-slate-700 hover:text-avante-navy">
                    {p.report?.name}
                  </Link>
                </td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
