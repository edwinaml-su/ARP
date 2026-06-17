import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, canEdit } from "@/lib/auth";
import { InlineToggle, DeleteButton } from "@/components/actions";
import { TypeBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

interface MatrixRow {
  email: string;
  full_name: string | null;
  role: string | null;
  reports_received: number;
  report_codes: string;
}

export default async function RecipientsPage() {
  const user = await requireUser();
  const editable = canEdit(user.role);

  const [matrix, recipients] = await Promise.all([
    prisma.$queryRawUnsafe<MatrixRow[]>(
      "SELECT email, full_name, role, reports_received::int AS reports_received, report_codes FROM avante.v_recipients_matrix"
    ),
    prisma.recipient.findMany({
      orderBy: [{ reportId: "asc" }, { type: "asc" }],
      include: { report: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Matriz de destinatarios ({matrix.length} personas)
          </h2>
          <p className="text-xs text-slate-400">Cuantos reportes recibe cada persona.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Correo</th>
                <th className="th">Nombre</th>
                <th className="th">Area</th>
                <th className="th text-center"># Reportes</th>
                <th className="th">Codigos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.map((m) => (
                <tr key={m.email} className="hover:bg-slate-50">
                  <td className="td font-medium">{m.email}</td>
                  <td className="td">{m.full_name}</td>
                  <td className="td text-slate-500">{m.role}</td>
                  <td className="td text-center">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-avante-navy px-2 text-xs font-bold text-white">
                      {m.reports_received}
                    </span>
                  </td>
                  <td className="td text-xs text-slate-500">{m.report_codes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Todos los destinatarios ({recipients.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Reporte</th>
                <th className="th">Tipo</th>
                <th className="th">Correo</th>
                <th className="th">Nombre</th>
                <th className="th text-center">Solo prod</th>
                <th className="th text-center">Activo</th>
                {editable && <th className="th"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recipients.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/reports/${r.report?.id}`} className="text-slate-700 hover:text-avante-navy">
                      {r.report?.name}
                    </Link>
                  </td>
                  <td className="td"><TypeBadge type={r.type} /></td>
                  <td className="td">{r.email}</td>
                  <td className="td">{r.fullName}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
