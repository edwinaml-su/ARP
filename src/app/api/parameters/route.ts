import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-auth";
import { withAuditUser } from "@/lib/db";

export async function POST(request: Request) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => null);
  if (!b?.reportId || !b?.paramKey)
    return NextResponse.json(
      { error: "Faltan campos: reportId, paramKey" },
      { status: 400 }
    );
  try {
    const created = await withAuditUser(guard.user.email, (tx) =>
      tx.parameter.create({
        data: {
          reportId: Number(b.reportId),
          paramKey: b.paramKey,
          paramValue: b.paramValue ?? null,
          paramType: b.paramType ?? "string",
          description: b.description ?? null,
          isSecret: b.isSecret ?? false,
        },
      })
    );
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error (posible duplicado)" },
      { status: 400 }
    );
  }
}
