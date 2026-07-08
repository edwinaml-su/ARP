import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-auth";
import { withAuditUser } from "@/lib/db";

export async function POST(request: Request) {
  const guard = await apiGuard("editor");
  if (!guard.ok) return guard.response;
  const b = await request.json().catch(() => null);

  // --- Alta masiva: { reportId, onlyInProd?, items: [{ email, type, fullName?, role? }] } ---
  if (Array.isArray(b?.items)) {
    const reportId = Number(b?.reportId);
    if (!reportId)
      return NextResponse.json({ error: "Falta reportId" }, { status: 400 });
    const onlyInProd = b.onlyInProd ?? false;
    const seen = new Set<string>();
    const data: {
      reportId: number;
      email: string;
      type: string;
      fullName: string | null;
      role: string | null;
      onlyInProd: boolean;
      active: boolean;
    }[] = [];
    for (const it of b.items) {
      const email = String(it?.email ?? "").trim();
      const type = String(it?.type ?? "").trim().toUpperCase();
      if (!email || !["TO", "CC", "BCC"].includes(type)) continue;
      const key = `${type}::${email.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({
        reportId,
        email,
        type,
        fullName: it?.fullName ? String(it.fullName).trim() : null,
        role: it?.role ? String(it.role).trim() : null,
        onlyInProd,
        active: true,
      });
    }
    if (!data.length)
      return NextResponse.json(
        { error: "No hay correos validos (revisa TO/CC/BCC)" },
        { status: 400 }
      );
    try {
      const result = await withAuditUser(guard.user.email, (tx) =>
        tx.recipient.createMany({ data, skipDuplicates: true })
      );
      return NextResponse.json(
        {
          created: result.count,
          requested: data.length,
          skipped: data.length - result.count,
        },
        { status: 201 }
      );
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error al crear destinatarios" },
        { status: 400 }
      );
    }
  }

  // --- Alta individual (desde el detalle de un reporte) ---
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
