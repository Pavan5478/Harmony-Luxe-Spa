// src/app/api/invoices/recent/route.ts
import { NextResponse } from "next/server";
import { readRows } from "@/lib/sheets";

export const dynamic = "force-dynamic";

type RowStatus = "FINAL" | "DRAFT" | "VOID";

export async function GET(request: Request) {
  // A..X (24 columns)
  const rows = await readRows("Invoices!A2:X");

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

  const mapped = rows.map((r: any[]) => {
    // Col 22 = Status in your sheet
    let status = String(r[22] || "").trim().toUpperCase();

    // Fallbacks if status cell is empty
    if (!status) {
      // If billNo present, treat as FINAL, else DRAFT
      status = r[0] ? "FINAL" : "DRAFT";
    }

    const dateISO = String(r[2] || "").trim();
    const ts = Date.parse(dateISO);

    return {
      billNo: r[0] || "",
      id: r[1] || "",
      dateISO,
      customer: r[3] || "",
      grandTotal: Number(r[15] || 0),
      status: status as RowStatus,
      ts: Number.isFinite(ts) ? ts : 0,
    };
  });

  // Optionally skip VOID from “recent”
  const filtered = mapped.filter((it) => it.status !== "VOID");

  // Sort newest first, same behaviour as main Invoices page
  filtered.sort((a, b) => b.ts - a.ts);

  const items = filtered.slice(0, limit).map((r) => ({
    billNo: r.billNo,
    id: r.id,
    dateISO: r.dateISO,
    customer: r.customer,
    grandTotal: r.grandTotal,
    status: r.status,
  }));

  return NextResponse.json({ items });
}