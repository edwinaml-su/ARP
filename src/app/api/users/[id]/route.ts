import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-auth";

const ROLES = ["admin", "editor", "viewer"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("admin");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (b.role) {
    if (!ROLES.includes(b.role))
      return NextResponse.json({ error: "Rol invalido" }, { status: 400 });
    data.role = b.role;
  }
  if (typeof b.active === "boolean") data.active = b.active;
  try {
    const updated = await prisma.profile.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    );
  }
}
