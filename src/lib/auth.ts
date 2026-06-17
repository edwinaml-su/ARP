import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "admin" | "editor" | "viewer";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Lector",
};

export function canEdit(role: Role): boolean {
  return role === "admin" || role === "editor";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}

/** Devuelve el usuario autenticado con su rol, o null si no hay sesion. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) {
    // Respaldo por si el trigger de alta no creo el perfil.
    profile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email ?? "",
        fullName: (user.user_metadata?.full_name as string) ?? null,
        role: "viewer",
      },
    });
  }

  return {
    id: user.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role as Role,
  };
}

/** Para Server Components/paginas: exige sesion o redirige a /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Para paginas que requieren un rol minimo. */
export async function requireRole(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  const ok =
    min === "viewer"
      ? true
      : min === "editor"
      ? canEdit(user.role)
      : isAdmin(user.role);
  if (!ok) redirect("/dashboard");
  return user;
}
