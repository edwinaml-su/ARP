import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ROLES = ["admin", "editor", "viewer"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("admin");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => ({}));

  // 1. Cambio de contrasena via Supabase Auth admin (requiere service_role).
  if (typeof b.password === "string" && b.password.length > 0) {
    if (b.password.length < 6)
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    try {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.auth.admin.updateUserById(params.id, {
        password: b.password,
      });
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error" },
        { status: 500 }
      );
    }
  }

  // 2. Cambios de perfil (rol / activo).
  const data: Record<string, unknown> = {};
  if (b.role) {
    if (!ROLES.includes(b.role))
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    data.role = b.role;
  }
  if (typeof b.active === "boolean") data.active = b.active;

  if (Object.keys(data).length > 0) {
    data.updatedAt = new Date();
    try {
      const updated = await prisma.profile.update({
        where: { id: params.id },
        data,
      });
      return NextResponse.json(updated);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error" },
        { status: 400 }
      );
    }
  }

  // Solo se cambio la contrasena: devolver el perfil actual.
  const profile = await prisma.profile.findUnique({ where: { id: params.id } });
  return NextResponse.json(profile ?? { ok: true });
}
