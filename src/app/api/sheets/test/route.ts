import { NextResponse } from "next/server";
import { appendRows, readRows } from "@/lib/sheets";
import { getSession } from "@/lib/session";

export async function GET() {
  // Safety: this endpoint should never be callable in production.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // write one tiny test row to Invoices
  await appendRows("Invoices!A2:Z", [[
    "TEST-000", "DTEST", now, "Test Customer", "9999999999",
    18, "N", 1000, 0, 847.46, 76.27, 76.27, 0, 0, 1000, "CASH", 1000, 0, 0, "hello", "dev@harmoneyluxe.com"
  ]]);

  // read last few rows back
  const rows = await readRows("Invoices!A2:U");
  return NextResponse.json({ ok: true, last: rows.slice(-3) });
}