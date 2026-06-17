import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-auth";

export async function GET() {
  const guard = await apiGuard("viewer");
  if (!guard.ok) return guard.response;
  const reports = await prisma.reportDefinition.findMany({
    orderBy: { code: "asc" },
  });
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const guard = await apiGuard("admin");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => null);
  if (!b?.code || !b?.name || !b?.scriptPath || !b?.runtime) {
    return NextResponse.json(
      { error: "Faltan campos: code, name, scriptPath, runtime" },
      { status: 400 }
    );
  }
  try {
    const created = await prisma.reportDefinition.create({
      data: {
        code: b.code,
        name: b.name,
        description: b.description ?? null,
        scriptPath: b.scriptPath,
        runtime: b.runtime,
        timeoutMinutes: b.timeoutMinutes ?? 30,
        retryCount: b.retryCount ?? 3,
        retryDelaySec: b.retryDelaySec ?? 300,
        ownerEmail: b.ownerEmail ?? null,
        businessUnit: b.businessUnit ?? null,
        active: b.active ?? true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear" },
      { status: 400 }
    );
  }
}
