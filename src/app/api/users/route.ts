import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ROLES = ["admin", "editor", "viewer"];

// Crea un usuario nuevo (Supabase Auth + perfil RBAC). Solo admin.
export async function POST(request: Request) {
  const guard = await apiGuard("admin");
  if (!guard.ok) return guard.response;

  const b = await request.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const role = typeof b.role === "string" ? b.role : "viewer";

  if (!email || !email.includes("@"))
    return NextResponse.json({ error: "Correo invalido" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json(
      { error: "La contrasena debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  if (!ROLES.includes(role))
    return NextResponse.json({ error: "Rol invalido" }, { status: 400 });

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email },
  });
  if (error || !data.user)
    return NextResponse.json(
      { error: error?.message || "No se pudo crear el usuario" },
      { status: 400 }
    );

  // El trigger on_auth_user_created ya crea el perfil; fijamos el rol y nombre elegidos.
  const profile = await prisma.profile.upsert({
    where: { id: data.user.id },
    update: { role, fullName: fullName || null, email, updatedAt: new Date() },
    create: { id: data.user.id, email, fullName: fullName || null, role },
  });

  return NextResponse.json(profile);
}
