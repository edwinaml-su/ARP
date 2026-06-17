import { NextResponse } from "next/server";
import { getSessionUser, type Role, type SessionUser } from "@/lib/auth";

type GuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/** Guarda para route handlers: valida sesion y rol minimo. */
export async function apiGuard(min: Role = "viewer"): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }
  const allowed =
    min === "viewer"
      ? true
      : min === "editor"
      ? user.role === "admin" || user.role === "editor"
      : user.role === "admin";
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tienes permisos para esta accion" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user };
}
