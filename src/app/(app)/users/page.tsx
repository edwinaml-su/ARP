import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { RoleSelect, AddUser, SetPassword } from "@/components/forms";
import { InlineToggle } from "@/components/actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireRole("admin");
  const users = await prisma.profile.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">Agregar usuario</h2>
          <p className="text-xs text-slate-400">
            Crea una cuenta con correo, contrasena y rol. Queda lista para entrar
            de inmediato (sin correo de confirmacion).
          </p>
        </div>
        <AddUser />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Usuarios y roles ({users.length})
          </h2>
          <p className="text-xs text-slate-400">
            Admin: todo · Editor: horarios/destinatarios/parametros · Lector: solo
            lectura.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Correo</th>
                <th className="th">Nombre</th>
                <th className="th">Rol</th>
                <th className="th text-center">Activo</th>
                <th className="th">Alta</th>
                <th className="th">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="td font-medium">
                    {u.email}
                    {u.id === me.id && (
                      <span className="ml-2 text-xs text-slate-400">(tu)</span>
                    )}
                  </td>
                  <td className="td">{u.fullName ?? "—"}</td>
                  <td className="td">
                    <RoleSelect id={u.id} value={u.role} disabled={u.id === me.id} />
                  </td>
                  <td className="td text-center">
                    <InlineToggle
                      endpoint="/api/users"
                      id={u.id}
                      value={!!u.active}
                      disabled={u.id === me.id}
                    />
                  </td>
                  <td className="td text-xs text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="td">
                    <SetPassword id={u.id} email={u.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
