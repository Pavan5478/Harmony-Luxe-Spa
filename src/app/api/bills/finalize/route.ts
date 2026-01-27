// src/app/api/bills/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createFinal } from "@/store/bills";

export const dynamic = "force-dynamic";

function jsonNoStore(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * POST – create a new invoice directly as FINAL (single Sheets write)
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

  const cashierEmail: string =
    data?.cashierEmail || session.user.email || "unknown@harmonyluxe.com";

  try {
    const bill = await createFinal(data, cashierEmail);
    return jsonNoStore({ ok: true, bill });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : "Failed to finalize";
    return jsonNoStore({ ok: false, error: msg }, { status: 400 });
  }
}
