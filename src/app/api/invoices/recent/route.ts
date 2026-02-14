// src/app/api/invoices/recent/route.ts
import { NextResponse } from "next/server";
import { readRows } from "@/lib/sheets";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type RowStatus = "FINAL" | "DRAFT" | "VOID";

export async function GET(request: Request) {
  const session = await getSession();
  const role = session.user?.role;
  if (!session.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "ADMIN" && role !== "ACCOUNTS" && role !== "CASHIER") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // ✅ read only A..W (skip RawJson X)
  const rows = await readRows("Invoices!A2:W");

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

  const mapped = rows
    .map((r: any[]) => {
      const billNo = String(r?.[0] || "").trim();
      const id = String(r?.[1] || "").trim();
      if (!billNo && !id) return null;

      let status = String(r?.[22] || "").trim().toUpperCase();
      if (!status) status = billNo ? "FINAL" : "DRAFT";

      const dateISO = String(r?.[2] || "").trim();
      const ts = Date.parse(dateISO);

      return {
        billNo,
        id,
        dateISO,
        customer: String(r?.[3] || ""),
        grandTotal: Number(r?.[15] || 0),
        status: status as RowStatus,
        ts: Number.isFinite(ts) ? ts : 0,
      };
    })
    .filter(Boolean) as any[];

  const filtered = mapped.filter((it) => it.status !== "VOID");
  filtered.sort((a, b) => b.ts - a.ts);

  const items = filtered.slice(0, limit).map((r) => ({
    billNo: r.billNo,
    id: r.id,
    dateISO: r.dateISO,
    customer: r.customer,
    grandTotal: r.grandTotal,
    status: r.status,
  }));

  const res = NextResponse.json({ ok: true, items });
  res.headers.set("Cache-Control", "no-store");
  return res;
}