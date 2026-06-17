import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-auth";
import { withAuditUser } from "@/lib/db";

export async function POST(request: Request) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => null);
  if (!b?.reportId || !b?.email || !b?.type)
    return NextResponse.json(
      { error: "Faltan campos: reportId, email, type" },
      { status: 400 }
    );
  if (!["TO", "CC", "BCC"].includes(b.type))
    return NextResponse.json({ error: "type debe ser TO, CC o BCC" }, { status: 400 });
  try {
    const created = await withAuditUser(guard.user.email, (tx) =>
      tx.recipient.create({
        data: {
          reportId: Number(b.reportId),
          email: b.email,
          type: b.type,
          fullName: b.fullName ?? null,
          role: b.role ?? null,
          onlyInProd: b.onlyInProd ?? false,
          active: b.active ?? true,
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
