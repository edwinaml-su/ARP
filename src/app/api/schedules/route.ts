import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-auth";
import { withAuditUser } from "@/lib/db";

export async function POST(request: Request) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => null);
  if (!b?.reportId || !b?.cronExpression)
    return NextResponse.json(
      { error: "Faltan campos: reportId, cronExpression" },
      { status: 400 }
    );
  try {
    const created = await withAuditUser(guard.user.email, (tx) =>
      tx.schedule.create({
        data: {
          reportId: Number(b.reportId),
          cronExpression: b.cronExpression,
          timezone: b.timezone || "America/El_Salvador",
          description: b.description ?? null,
          active: b.active ?? true,
        },
      })
    );
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    );
  }
}
