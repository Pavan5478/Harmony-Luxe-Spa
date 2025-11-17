import { NextResponse } from "next/server";
import { appendRows } from "@/lib/sheets";
import { getBill } from "@/store/bills";

export async function POST(req: Request) {
  const { billNo } = await req.json();
  const bill = getBill(billNo);
  if (!bill || bill.status !== "FINAL") {
    return NextResponse.json({ ok: false, error: "Bill not found or not final" }, { status: 400 });
  }

  const hdr = [
    (bill as any).billNo,
    bill.id,
    bill.createdAt,
    bill.customer?.name ?? "",
    bill.customer?.phone ?? "",
    bill.customer?.email ?? "", // make sure your payload captured this
    Math.round(((bill as any).gstRate ?? 0) * 100),
    (bill as any).isIGST ? "Y" : "N",
    bill.totals.subtotal,
    bill.totals.discount,
    bill.totals.taxableBase,
    !(bill as any).isIGST ? (bill as any).tax / 2 : 0,
    !(bill as any).isIGST ? (bill as any).tax / 2 : 0,
    (bill as any).isIGST ? (bill as any).tax : 0,
    bill.totals.roundOff,
    bill.totals.grandTotal,
    (bill as any).paymentMode ?? "CASH",
    bill.totals.grandTotal,
    0,
    0,
    bill.notes ?? "",
    (bill as any).cashierEmail ?? "",
  ];

  const lines =
    (bill as any).lines?.map((l: any, idx: number) => [
      (bill as any).billNo,
      idx + 1,
      l.id ?? "",
      l.name,
      l.variant ?? "",
      l.qty,
      l.rate,
      l.qty * l.rate,
    ]) ?? [];

  try {
    await appendRows("Invoices!A2:Z", [hdr]);
    if (lines.length) await appendRows("Lines!A2:Z", lines);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}