// src/app/api/bills/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getBill,
  updateBill,
  finalizeDraft,
  markPrinted,
  voidBill,
} from "@/store/bills";
import { moveInvoiceToDeleted } from "@/lib/sheets";

// Next 15+/16: params is a Promise
type RouteContext = {
  params: Promise<{ id: string }>;
};

async function decodeId(ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export const dynamic = "force-dynamic";

// GET single bill (by draft id or billNo)
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const idOrNo = await decodeId(ctx);
  const bill = await getBill(idOrNo);
  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ bill });
}

// PUT – update existing bill (DRAFT only; FINAL/VOID are read-only)
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role === "ACCOUNTS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const idOrNo = await decodeId(ctx);
  const existing = await getBill(idOrNo);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = (existing as any).status as
    | "DRAFT"
    | "FINAL"
    | "VOID"
    | undefined;

  if (status === "FINAL" || status === "VOID") {
    return NextResponse.json(
      {
        error:
          "Final / void invoices are read-only. Please create a new bill if you need changes.",
      },
      { status: 400 }
    );
  }

  const patch = (await req.json().catch(() => ({}))) as any;

  try {
    const updated = await updateBill(idOrNo, patch);
    return NextResponse.json({ bill: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update" },
      { status: 404 }
    );
  }
}

// PATCH – finalize draft OR mark printed
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idOrNo = await decodeId(ctx);
  const body = (await req.json().catch(() => ({}))) as any;

  // 1) mark printed (used from invoice screen)
  if (body?.markPrinted) {
    try {
      const b = await markPrinted(idOrNo);
      return NextResponse.json({ bill: b });
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : "Not found";
      return NextResponse.json({ error: msg }, { status: 404 });
    }
  }

  // 2) finalize draft -> FINAL (Sheets is updated inside finalizeDraft)
  const cashierEmail: string =
    body?.cashierEmail ||
    session.user.email ||
    "unknown@example.com";

  try {
    const fin = await finalizeDraft(idOrNo, cashierEmail);
    return NextResponse.json({ bill: fin, savedToSheets: true });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Failed to finalize";
    const statusCode = msg.includes("Draft not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status: statusCode });
  }
}

// DELETE – admin only, void invoice + move to Deleted sheet
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const idOrNo = await decodeId(ctx);
  const bill = await getBill(idOrNo);
  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Mark status = VOID in store / Sheets (for audit history)
    const voided = await voidBill(idOrNo);

    // Key used to locate row in Invoices sheet
    const key =
      (bill as any).billNo ||
      (bill as any).id ||
      idOrNo;

    // Move the row to Deleted sheet and remove from Invoices
    await moveInvoiceToDeleted(key);

    return NextResponse.json({ ok: true, bill: voided });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to delete" },
      { status: 400 }
    );
  }
}