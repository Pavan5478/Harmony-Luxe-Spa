// src/app/api/reports/monthly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readRows } from "@/lib/sheets";

// Attempt to locate indices by header names; fall back to common positions.
function indexMap(header: string[]) {
  const find = (name: string, fallback: number) => {
    const ix = header.findIndex(h => String(h).trim().toLowerCase() === name);
    return ix >= 0 ? ix : fallback;
  };

  return {
    BILLNO:    find("billno", 0),
    DATEISO:   find("dateiso", 1),            // fallback to column B
    CUSTOMER:  find("customer", 2),
    GSTPCT:    find("gstpct", 6),
    INTERSTATE:find("isinterstate", 7),
    SUBTOTAL:  find("subtotal", 8),
    DISCOUNT:  find("discount", 9),
    TAXBASE:   find("taxablebase", 10),
    CGST:      find("cgst", 11),
    SGST:      find("sgst", 12),
    IGST:      find("igst", 13),
    ROUNDOFF:  find("roundoff", 14),
    GRAND:     find("grandtotal", 15),
    PAYMODE:   find("paymentmode", 16),
    CASH:      find("cash", 17),
    CARD:      find("card", 18),
    UPI:       find("upi", 19),
  };
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  if (!month) {
    return NextResponse.json({ ok: false, error: "month=YYYY-MM required" }, { status: 400 });
  }

  // Include header row to map columns robustly
  const all = await readRows("Invoices!A1:Z");
  if (!all.length) return NextResponse.json({ ok: true, month, count: 0, summary: {} });

  const header = all[0].map(String);
  const rows = all.slice(1);
  const COL = indexMap(header);

  const [y, m] = month.split("-").map(Number);

  const inMonth = rows.filter((r) => {
    const d = new Date(r[COL.DATEISO] || "");
    return Number.isFinite(+d) && d.getFullYear() === y && (d.getMonth() + 1) === m;
  });

  const summary = {
    count: 0,
    subtotal: 0, discount: 0, taxbase: 0,
    cgst: 0, sgst: 0, igst: 0,
    roundoff: 0, grand: 0,
    cash: 0, card: 0, upi: 0,
  };

  for (const r of inMonth) {
    summary.count++;
    summary.subtotal += +r[COL.SUBTOTAL] || 0;
    summary.discount += +r[COL.DISCOUNT] || 0;
    summary.taxbase  += +r[COL.TAXBASE]  || 0;
    summary.cgst     += +r[COL.CGST]     || 0;
    summary.sgst     += +r[COL.SGST]     || 0;
    summary.igst     += +r[COL.IGST]     || 0;
    summary.roundoff += +r[COL.ROUNDOFF] || 0;
    summary.grand    += +r[COL.GRAND]    || 0;
    summary.cash     += +r[COL.CASH]     || 0;
    summary.card     += +r[COL.CARD]     || 0;
    summary.upi      += +r[COL.UPI]      || 0;
  }

  // round to 2 decimals
  (Object.keys(summary) as (keyof typeof summary)[]).forEach((k) => {
    const v = summary[k];
    // @ts-ignore
    if (typeof v === "number") summary[k] = +v.toFixed(2);
  });

  return NextResponse.json({ ok: true, month, count: summary.count, summary });
}