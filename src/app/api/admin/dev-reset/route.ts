// src/app/api/admin/dev-reset/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { clearBills } from "@/store/bills";
import { resetCounter } from "@/lib/billno";
import { truncateInvoiceData } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  const role = session.user?.role;

  if (process.env.ALLOW_DEV_RESET !== "true") {
    return NextResponse.json(
      { error: "Dev reset disabled (set ALLOW_DEV_RESET=true)" },
      { status: 403 }
    );
  }

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // clearBills is now a no-op (primary data is Sheets) – kept for compatibility
  clearBills();
  await truncateInvoiceData();
  await resetCounter();

  return NextResponse.json({ ok: true });
}