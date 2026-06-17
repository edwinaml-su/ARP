import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiGuard } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const id = Number(params.id);

  const report = await prisma.reportDefinition.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }

  // Registra la ejecucion en estado "queued".
  const exec = await prisma.execution.create({
    data: { reportId: id, triggeredBy: "manual", status: "queued", startedAt: new Date() },
  });

  // Si hay un worker externo configurado, lo dispara via webhook.
  const url = process.env.WORKER_WEBHOOK_URL;
  let dispatched = false;
  if (url) {
    try {
      const token = process.env.WORKER_WEBHOOK_TOKEN;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportCode: report.code,
          executionId: Number(exec.id),
          triggeredBy: guard.user.email,
        }),
      });
      dispatched = res.ok;
    } catch {
      dispatched = false;
    }
  }

  return NextResponse.json({
    ok: true,
    executionId: Number(exec.id),
    dispatched,
    message: url
      ? dispatched
        ? "Ejecucion encolada y enviada al worker."
        : "Ejecucion registrada; el worker no respondio."
      : "Ejecucion registrada (sin worker configurado).",
  });
}
