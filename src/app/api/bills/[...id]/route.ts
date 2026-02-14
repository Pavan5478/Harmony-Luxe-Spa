// src/app/api/bills/[...id]/route.ts
// Catch-all route to safely handle BillNos that may contain slashes (e.g. 2025-26/000123).
// Some platforms can decode %2F in the URL path, which would otherwise break a single
// dynamic segment route. This route reconstructs the full key from path segments.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBill, updateBill, finalizeDraft, markPrinted, voidBill } from "@/store/bills";
import { moveInvoiceToDeleted } from "@/lib/sheets";

type RouteContext = { params: Promise<{ id: string[] }> };

async function decodeId(ctx: RouteContext) {
  const { id } = await ctx.params;
  const parts = Array.isArray(id) ? id : [String(id as any)];
  const decoded = parts.map((p) => {
    try {
      return decodeURIComponent(String(p));
    } catch {
      return String(p);
    }
  });
  return decoded.join("/");
}

function jsonNoStore(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const dynamic = "force-dynamic";

/**
 * GET single bill (by draft id or billNo)
 * ✅ Protected (must be logged in)
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const idOrNo = await decodeId(ctx);
  const bill = await getBill(idOrNo);

  if (!bill) {
    return jsonNoStore({ ok: false, error: "Not found" }, { status: 404 });
  }

  return jsonNoStore({ ok: true, bill });
}

/**
 * PUT – update existing bill (DRAFT only; FINAL/VOID are read-only)
 * ✅ Protected + role-based
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (role === "ACCOUNTS") {
    return jsonNoStore({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const idOrNo = await decodeId(ctx);
  const existing = await getBill(idOrNo);

  if (!existing) {
    return jsonNoStore({ ok: false, error: "Not found" }, { status: 404 });
  }

  const status = (existing as any).status as "DRAFT" | "FINAL" | "VOID" | undefined;

  if (status === "FINAL" || status === "VOID") {
    return jsonNoStore(
      {
        ok: false,
        error:
          "Final / void invoices are read-only. Please create a new bill if you need changes.",
      },
      { status: 400 }
    );
  }

  let patch: any = {};
  try {
    patch = await req.json();
  } catch {
    patch = {};
  }

  try {
    const updated = await updateBill(idOrNo, patch);
    return jsonNoStore({ ok: true, bill: updated });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Failed to update";
    const code = msg.toLowerCase().includes("not found") ? 404 : 400;
    return jsonNoStore({ ok: false, error: msg }, { status: code });
  }
}

/**
 * PATCH – finalize draft OR mark printed
 * ✅ Protected + role-based
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (role === "ACCOUNTS") {
    return jsonNoStore({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const idOrNo = await decodeId(ctx);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 1) mark printed
  if (body?.markPrinted) {
    try {
      const b = await markPrinted(idOrNo);
      return jsonNoStore({ ok: true, bill: b });
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : "Not found";
      return jsonNoStore({ ok: false, error: msg }, { status: 404 });
    }
  }

  // 2) finalize draft -> FINAL
  const cashierEmail: string =
    body?.cashierEmail || session.user.email || "unknown@harmonyluxe.com";

  try {
    const fin = await finalizeDraft(idOrNo, cashierEmail);
    return jsonNoStore({ ok: true, bill: fin, savedToSheets: true });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Failed to finalize";
    const statusCode = msg.includes("Draft not found") ? 404 : 400;
    return jsonNoStore({ ok: false, error: msg }, { status: statusCode });
  }
}

/**
 * DELETE – admin only
 * NOTE: your delete is actually "VOID + move row to Deleted sheet"
 * ✅ Protected + role-based
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "ADMIN") {
    return jsonNoStore({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const idOrNo = await decodeId(ctx);
  const bill = await getBill(idOrNo);

  if (!bill) {
    return jsonNoStore({ ok: false, error: "Not found" }, { status: 404 });
  }

  if ((bill as any).status === "VOID") {
    return jsonNoStore({ ok: false, error: "This invoice is already void." }, { status: 400 });
  }

  try {
    const voided = await voidBill(idOrNo);
    const key = (bill as any).billNo || (bill as any).id || idOrNo;
    await moveInvoiceToDeleted(key);
    return jsonNoStore({ ok: true, bill: voided });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Failed to delete";
    return jsonNoStore({ ok: false, error: msg }, { status: 400 });
  }
}
