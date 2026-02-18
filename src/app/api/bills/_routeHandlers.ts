import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBill, updateBill, finalizeDraft, markPrinted, voidBill } from "@/store/bills";
import { moveInvoiceToDeleted } from "@/lib/sheets";

type RouteContext = { params: Promise<{ id: string | string[] }> };

async function decodeId(ctx: RouteContext) {
  const { id } = await ctx.params;
  const parts = Array.isArray(id) ? id : [id];
  const decoded = parts.map((p) => {
    try {
      return decodeURIComponent(String(p));
    } catch {
      return String(p);
    }
  });
  return decoded.join("/");
}

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function handleGet(_req: NextRequest, ctx: RouteContext) {
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

export async function handlePut(req: NextRequest, ctx: RouteContext) {
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

  const status = (existing as { status?: "DRAFT" | "FINAL" | "VOID" }).status;
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

  let patch: unknown = {};
  try {
    patch = await req.json();
  } catch {
    patch = {};
  }

  try {
    const updated = await updateBill(idOrNo, (patch as object) || {});
    return jsonNoStore({ ok: true, bill: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update";
    const code = msg.toLowerCase().includes("not found") ? 404 : 400;
    return jsonNoStore({ ok: false, error: msg }, { status: code });
  }
}

export async function handlePatch(req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const idOrNo = await decodeId(ctx);

  let body: { markPrinted?: boolean; cashierEmail?: string } = {};
  try {
    body = (await req.json()) as { markPrinted?: boolean; cashierEmail?: string };
  } catch {
    body = {};
  }

  if (body?.markPrinted) {
    try {
      const b = await markPrinted(idOrNo);
      return jsonNoStore({ ok: true, bill: b });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Not found";
      return jsonNoStore({ ok: false, error: msg }, { status: 404 });
    }
  }

  if (role === "ACCOUNTS") {
    return jsonNoStore({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const cashierEmail: string = body?.cashierEmail || session.user.email || "unknown@harmonyluxe.com";

  try {
    const fin = await finalizeDraft(idOrNo, cashierEmail);
    return jsonNoStore({ ok: true, bill: fin, savedToSheets: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to finalize";
    const statusCode = msg.includes("Draft not found") ? 404 : 400;
    return jsonNoStore({ ok: false, error: msg }, { status: statusCode });
  }
}

export async function handleDelete(_req: NextRequest, ctx: RouteContext) {
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

  if ((bill as { status?: string }).status === "VOID") {
    return jsonNoStore({ ok: false, error: "This invoice is already void." }, { status: 400 });
  }

  try {
    const voided = await voidBill(idOrNo);
    const key = ((bill as { billNo?: string }).billNo || (bill as { id?: string }).id || idOrNo).trim();
    await moveInvoiceToDeleted(key);
    return jsonNoStore({ ok: true, bill: voided });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete";
    return jsonNoStore({ ok: false, error: msg }, { status: 400 });
  }
}
