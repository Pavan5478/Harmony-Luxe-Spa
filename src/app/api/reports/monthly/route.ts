// src/app/api/reports/monthly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readRows } from "@/lib/sheets";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function norm(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

function indexMap(header: string[]) {
  const find = (name: string, fallback: number) => {
    const ix = header.findIndex((h) => norm(h) === norm(name));
    return ix >= 0 ? ix : fallback;
  };

  return {
    DATEISO: find("dateiso", 1),
    SUBTOTAL: find("subtotal", 8),
    DISCOUNT: find("discount", 9),
    TAXBASE: find("taxablebase", 10),
    CGST: find("cgst", 11),
    SGST: find("sgst", 12),
    IGST: find("igst", 13),
    ROUNDOFF: find("roundoff", 14),
    GRAND: find("grandtotal", 15),
    CASH: find("cash", 17),
    CARD: find("card", 18),
    UPI: find("upi", 19),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const role = session.user?.role;
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  if (!month) {
    return NextResponse.json({ ok: false, error: "month=YYYY-MM required" }, { status: 400 });
  }

  const all = await readRows("Invoices!A1:Z");
  if (!all.length) {
    return NextResponse.json(
      { ok: true, month, count: 0, summary: {} },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const header = all[0].map(String);
  const rows = all.slice(1);
  const COL = indexMap(header);

  const [y, m] = month.split("-").map(Number);

  const inMonth = rows.filter((r) => {
    const d = new Date(String(r[COL.DATEISO] || ""));
    return Number.isFinite(+d) && d.getFullYear() === y && d.getMonth() + 1 === m;
  });

  const summary = {
    count: 0,
    subtotal: 0,
    discount: 0,
    taxbase: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    roundoff: 0,
    grand: 0,
    cash: 0,
    card: 0,
    upi: 0,
  };

  for (const r of inMonth) {
    summary.count++;
    summary.subtotal += +r[COL.SUBTOTAL] || 0;
    summary.discount += +r[COL.DISCOUNT] || 0;
    summary.taxbase += +r[COL.TAXBASE] || 0;
    summary.cgst += +r[COL.CGST] || 0;
    summary.sgst += +r[COL.SGST] || 0;
    summary.igst += +r[COL.IGST] || 0;
    summary.roundoff += +r[COL.ROUNDOFF] || 0;
    summary.grand += +r[COL.GRAND] || 0;
    summary.cash += +r[COL.CASH] || 0;
    summary.card += +r[COL.CARD] || 0;
    summary.upi += +r[COL.UPI] || 0;
  }

  (Object.keys(summary) as (keyof typeof summary)[]).forEach((k) => {
    const v = summary[k];
    if (typeof v === "number") summary[k] = +v.toFixed(2) as any;
  });

  return NextResponse.json(
    { ok: true, month, count: summary.count, summary },
    { headers: { "Cache-Control": "no-store" } }
  );
}