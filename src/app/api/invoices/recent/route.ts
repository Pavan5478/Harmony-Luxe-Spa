// src/app/api/invoices/recent/route.ts
import { NextResponse } from "next/server";
import { readRows } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  // A..X (24 columns) – we only care about a few
  const rows = await readRows("Invoices!A2:X");

  // Only FINAL invoices for dashboard
  const finalRows = rows.filter((r: any[]) => {
    const status = String(r[22] || "FINAL").toUpperCase();
    return status === "FINAL";
  });

  const last10 = finalRows.slice(-10).reverse();

  const items = last10.map((r: any[]) => ({
    billNo: r[0] || "",
    id: r[1] || "",
    dateISO: r[2] || "",
    customer: r[3] || "",
    grandTotal: Number(r[15] || 0),
  }));

  return NextResponse.json({ items });
}