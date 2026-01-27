// src/app/api/bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createDraft, listBills } from "@/store/bills";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function jsonNoStore(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * GET – List all bills (used by Invoices / Dashboard, etc.)
 * ✅ Protected (must be logged in)
 */
export async function GET(_req: NextRequest) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "ADMIN" && role !== "ACCOUNTS" && role !== "CASHIER") {
    return jsonNoStore({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const bills = await listBills();
  return jsonNoStore({ ok: true, bills });
}

/**
 * POST – Create a new DRAFT bill
 * ✅ Protected + role-based
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return jsonNoStore({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "ADMIN" && role !== "CASHIER") {
    return jsonNoStore({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let data: any = {};
  try {
    data = await req.json();
  } catch {
    data = {};
  }

  const draft = await createDraft(data);
  return jsonNoStore({ ok: true, id: draft.id, bill: draft });
}