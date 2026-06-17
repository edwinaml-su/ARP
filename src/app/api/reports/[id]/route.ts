import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-auth";

const FIELDS = [
  "name",
  "description",
  "scriptPath",
  "runtime",
  "timeoutMinutes",
  "retryCount",
  "retryDelaySec",
  "active",
  "ownerEmail",
  "businessUnit",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("admin");
  if (!guard.ok) return guard.response;
  const id = Number(params.id);
  const b = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of FIELDS) if (f in b) data[f] = b[f];
  try {
    const updated = await prisma.reportDefinition.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("admin");
  if (!guard.ok) return guard.response;
  const id = Number(params.id);
  try {
    await prisma.reportDefinition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    );
  }
}
