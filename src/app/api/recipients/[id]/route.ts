import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-auth";
import { withAuditUser } from "@/lib/db";

const FIELDS = ["email", "type", "fullName", "role", "onlyInProd", "active"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const id = Number(params.id);
  const b = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) if (f in b) data[f] = b[f];
  try {
    const updated = await withAuditUser(guard.user.email, (tx) =>
      tx.recipient.update({ where: { id }, data })
    );
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const id = Number(params.id);
  try {
    await withAuditUser(guard.user.email, (tx) => tx.recipient.delete({ where: { id } }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
