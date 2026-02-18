// src/components/invoice/InvoicePaper.tsx
import Image from "next/image";
import { inr } from "@/lib/format";
import type { BillLine, PaymentSplit } from "@/types/billing";

type InvoiceBill = {
  billNo?: string;
  id?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  lines?: BillLine[];
  totals?: {
    subtotal?: number;
    discount?: number;
    taxableBase?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    roundOff?: number;
    grandTotal?: number;
  };
  notes?: string;
  paymentMode?: string;
  split?: PaymentSplit;
};

function toPaise(v: number): number {
  return Math.round((Number(v) || 0) * 100);
}
function fromPaise(p: number): number {
  return p / 100;
}
function calcLineAmount(rate: number, qty: number): number {
  const ratePaise = toPaise(rate);
  const q = Number(qty) || 0;
  const linePaise = Math.round(ratePaise * q);
  return fromPaise(linePaise);
}

export default function InvoicePaper({
  bill,
  spaName,
  spaAddress,
  spaPhone,
  spaEmail,
  billDate,
}: {
  bill: InvoiceBill;
  spaName: string;
  spaAddress: string[];
  spaPhone: string;
  spaEmail: string;
  billDate: Date;
}) {
  const customer = bill.customer || {};
  const lines = Array.isArray(bill.lines) ? bill.lines : [];

  const t = bill.totals || {};
  const discount = Number(t.discount || 0);
  const hasDiscount = discount > 0.005;

  const notes = String(bill.notes || "").trim();
  const hasNotes = notes.length > 0;

  const billNo = String(bill.billNo || bill.id || "").trim() || "--";

  const dateStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(billDate);

  return (
    <div
      className={[
        "invoice-paper mx-auto bg-white p-[2mm] text-slate-900",
        "w-full max-w-[210mm]",
        "min-h-[297mm] print:min-h-0",
        "print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <Image
            src="/harmony_luxe.png"
            alt={spaName}
            width={56}
            height={56}
            priority
            className="h-12 w-12 rounded-xl object-contain"
          />
        </div>

        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Tax invoice
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">Bill #{billNo}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">{dateStr}</div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <div className="text-base font-semibold text-slate-900">{spaName}</div>
          <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
            {spaAddress.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            <div className="pt-1">
              Phone: {spaPhone} | Email: {spaEmail}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right print:text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Billed to
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {customer.name || "Walk-in customer"}
          </div>

          <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
            {customer.phone ? <div>Phone: {customer.phone}</div> : null}
            {customer.email ? <div>Email: {customer.email}</div> : null}

            <div className="pt-1">
              <span className="font-medium text-slate-900">Payment:</span>{" "}
              {bill.paymentMode || "--"}
            </div>

            {bill.split && bill.paymentMode === "SPLIT" ? (
              <div className="space-y-0.5">
                <div>
                  Cash: <span className="font-medium text-slate-900">{inr(bill.split.cash || 0)}</span>
                </div>
                <div>
                  Card: <span className="font-medium text-slate-900">{inr(bill.split.card || 0)}</span>
                </div>
                <div>
                  UPI: <span className="font-medium text-slate-900">{inr(bill.split.upi || 0)}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 h-px bg-slate-200" />

      {/* Items */}
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
            <th className="py-2 text-left">#</th>
            <th className="py-2 text-left">Service / Item</th>
            <th className="py-2 text-left">Variant</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Rate</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>

        <tbody>
          {lines.map((l: BillLine, idx: number) => {
            const qty = Number(l.qty || 0);
            const rate = Number(l.rate || 0);

            // accept stored amount even if it comes as string from sheets
            const storedAmount = Number(l.amount);
            const amount = Number.isFinite(storedAmount)
              ? storedAmount
              : calcLineAmount(rate, qty);

            return (
              <tr
                key={`${l.itemId || "x"}-${l.variant || "v"}-${idx}`}
                className="border-b border-slate-100 align-top"
              >
                <td className="py-2 pr-2">{idx + 1}</td>

                <td className="py-2 pr-2">
                  <div className="font-medium text-slate-900">{l.name || "--"}</div>
                  {l.itemId ? <div className="text-[10px] text-slate-500">Code: {l.itemId}</div> : null}
                </td>

                <td className="py-2 pr-2">
                  {l.variant || <span className="text-slate-400">--</span>}
                </td>

                <td className="py-2 pr-2 text-right">{Number.isFinite(qty) ? qty : "--"}</td>
                <td className="py-2 pr-2 text-right">{inr(Number.isFinite(rate) ? rate : 0)}</td>
                <td className="py-2 pl-2 text-right">{inr(amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Notes + totals */}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
        <div className="w-full sm:w-1/2 print:w-1/2">
          {hasNotes ? (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Notes
              </div>
              <div className="mt-1 whitespace-pre-line text-[11px] text-slate-700">{notes}</div>
            </>
          ) : null}
        </div>

        <div className="w-full sm:ml-auto sm:w-[78mm] print:ml-auto print:w-[78mm] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="py-1 pr-2 text-slate-600">Subtotal</td>
                <td className="py-1 pl-2 text-right text-slate-900">{inr(t.subtotal || 0)}</td>
              </tr>

              {hasDiscount ? (
                <tr>
                  <td className="py-1 pr-2 text-slate-600">Discount</td>
                  <td className="py-1 pl-2 text-right text-slate-900">-{inr(discount)}</td>
                </tr>
              ) : null}

              <tr>
                <td className="py-1 pr-2 text-slate-600">Taxable</td>
                <td className="py-1 pl-2 text-right text-slate-900">{inr(t.taxableBase || 0)}</td>
              </tr>

              {(t.cgst || 0) > 0 ? (
                <tr>
                  <td className="py-1 pr-2 text-slate-600">CGST</td>
                  <td className="py-1 pl-2 text-right text-slate-900">{inr(t.cgst || 0)}</td>
                </tr>
              ) : null}
              {(t.sgst || 0) > 0 ? (
                <tr>
                  <td className="py-1 pr-2 text-slate-600">SGST</td>
                  <td className="py-1 pl-2 text-right text-slate-900">{inr(t.sgst || 0)}</td>
                </tr>
              ) : null}
              {(t.igst || 0) > 0 ? (
                <tr>
                  <td className="py-1 pr-2 text-slate-600">IGST</td>
                  <td className="py-1 pl-2 text-right text-slate-900">{inr(t.igst || 0)}</td>
                </tr>
              ) : null}

              {(t.roundOff || 0) !== 0 ? (
                <tr>
                  <td className="py-1 pr-2 text-slate-600">Round off</td>
                  <td className="py-1 pl-2 text-right text-slate-900">{inr(t.roundOff || 0)}</td>
                </tr>
              ) : null}

              <tr>
                <td className="pt-2 pr-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Grand total
                </td>
                <td className="pt-2 pl-2 text-right text-base font-semibold text-slate-900">
                  {inr(t.grandTotal || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-medium text-slate-700">{spaName}</div>
            <div className="mt-0.5">{spaAddress.join(" | ")}</div>
          </div>
          <div className="shrink-0 text-right">
            <div>{spaPhone}</div>
            <div>{spaEmail}</div>
          </div>
        </div>

        <div className="hidden print:block pt-1 text-[9px] text-slate-500">
          Computer-generated invoice.
        </div>
      </div>
    </div>
  );
}
