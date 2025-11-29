﻿// src/app/(app)/invoices/[...id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import { inr } from "@/lib/format";
import InvoiceActions from "@/components/invoice/Actions";

type PageProps = {
  // Next 16 passes these as Promises
  params: Promise<{ id: string[] | string }>;
  searchParams?: Promise<{ print?: string }>;
};

export const dynamic = "force-dynamic";

export default async function InvoicePage(props: PageProps) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const params = await props.params;
  const sp = (await props.searchParams) || {};
  const autoPrint = sp.print === "1" || sp.print === "true";

  // ── Robust key handling (works with encoded / and multi-segment URLs) ──
  const idParam = params.id;
  const segments = Array.isArray(idParam) ? idParam : [idParam];
  const key = decodeURIComponent(segments.join("/")).trim();

  const bills = await listBills();

  const found =
    bills.find((b: any) => String(b.billNo || "").trim() === key) ||
    bills.find((b: any) => String(b.id || "").trim() === key);

  if (!found) {
    // helpful in Vercel logs if something is wrong with data/env
    console.error("Invoice not found in detail page", {
      key,
      billsCount: bills.length,
    });
    notFound();
  }

  const bill: any = found;

  const t = bill.totals || {};
  const discount = Number(t.discount || 0);
  const hasDiscount = discount > 0;
  const notes = (bill.notes || "").trim();
  const hasNotes = notes.length > 0;

  const billDateISO = bill.billDate || bill.finalizedAt || bill.createdAt;
  const billDate = billDateISO ? new Date(billDateISO) : new Date();

  const customer = bill.customer || {};
  const status: "DRAFT" | "FINAL" | "VOID" =
    (bill.status as "DRAFT" | "FINAL" | "VOID") || "FINAL";
  const printedAt: string | null = bill.printedAt || null;
  const idOrNo: string = (bill.billNo as string) || (bill.id as string) || key;

  // TODO: later load this from Settings sheet
  const spaName = "XiphiasSpa";
  const spaAddress = [
    "123, Sample Street",
    "Some Area, City - 600001",
    "GSTIN: 33AAAAA0000A1Z5",
  ];
  const spaPhone = "+91 98765 43210";
  const spaEmail = "info@xiphiaspa.com";

  const baseBadge =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium";
  let statusClass = "";
  let statusLabel = "";
  if (status === "FINAL") {
    statusClass = `${baseBadge} bg-emerald-50 text-emerald-700 border border-emerald-100`;
    statusLabel = "Final";
  } else if (status === "VOID") {
    statusClass = `${baseBadge} bg-danger/5 text-danger border border-danger/30`;
    statusLabel = "Void";
  } else {
    statusClass = `${baseBadge} bg-amber-50 text-amber-800 border border-amber-100`;
    statusLabel = "Draft";
  }

  return (
    <div className="invoice-shell mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      {/* ── Top header (screen only) ─────────────────────────────── */}
      <div className="no-print mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Invoice
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Bill #{bill.billNo || bill.id}
          </h1>
          <p className="mt-1 text-xs text-muted text-foreground sm:text-sm">
            Official tax invoice. Use{" "}
            <span className="font-medium text-foreground">Print</span> or{" "}
            <span className="font-medium text-foreground">Save as PDF</span> for
            an A4 copy.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-[11px] text-muted sm:text-xs">
          <span className={statusClass}>
            <span className="h-1.5 w-1.5 rounded-full bg-current text-foreground" />
            {statusLabel}
          </span>
          <a
            href="/invoices"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-background"
          >
            ← Back to invoices
          </a>
        </div>
      </div>

      {/* ── Action bar (screen only) ─────────────────────────────── */}
      <div className="no-print mb-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
        <InvoiceActions
          idOrNo={idOrNo}
          printedAt={printedAt}
          status={status}
          autoPrint={autoPrint && status === "FINAL"}
        />
      </div>

      {/* ── Printable A4 invoice (white) ─────────────────────────── */}
      <div className="invoice-print">
        {/* Letterhead / logo section – always printed */}
        {/* NOTE: replace the XS block with your actual logo:
             <img src="/logo-invoice.png" alt="XiphiasSpa" className="h-10 w-auto" />
             Put the file under /public/logo-invoice.png
        */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-black text-lg font-semibold text-white sm:h-16 sm:w-16">
              XS
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {spaName}
              </h2>
              <div className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                {spaAddress.map((line: string, idx: number) => (
                  <div key={idx}>{line}</div>
                ))}
                <div className="mt-1">
                  Phone: {spaPhone} · Email: {spaEmail}
                </div>
              </div>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-600 sm:text-xs">
            <div className="text-xs font-semibold text-slate-900">
              Tax invoice
            </div>
            <div className="mt-1">
              <span className="font-medium text-slate-900">Bill #</span>{" "}
              {bill.billNo || bill.id}
            </div>
            <div>
              <span className="font-medium text-slate-900">Date:</span>{" "}
              {billDate.toLocaleDateString()}
            </div>
            {bill.cashierEmail && (
              <div>
                <span className="font-medium text-slate-900">Cashier:</span>{" "}
                {bill.cashierEmail}
              </div>
            )}
            <div>
              <span className="font-medium text-slate-900">Status:</span>{" "}
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Billed to + payment details */}
        <section className="mt-4 grid gap-4 border-b border-slate-200 pb-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Billed to
            </p>
            <div className="mt-1 text-sm font-medium text-slate-900">
              {customer.name || "Walk-in customer"}
            </div>
            <div className="mt-1 text-[11px] text-slate-600 sm:text-xs">
              {customer.phone && <div>Phone: {customer.phone}</div>}
              {customer.email && <div>Email: {customer.email}</div>}
            </div>
          </div>

          <div className="text-[11px] text-slate-600 sm:text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Payment details
            </p>
            <div className="mt-1">
              Payment mode:{" "}
              <span className="font-medium text-slate-900">
                {bill.paymentMode || "—"}
              </span>
            </div>
            {bill.split && bill.paymentMode === "SPLIT" && (
              <div className="mt-1 space-y-0.5">
                <div>
                  Cash:{" "}
                  <span className="font-medium text-slate-900">
                    {inr(bill.split.cash || 0)}
                  </span>
                </div>
                <div>
                  Card:{" "}
                  <span className="font-medium text-slate-900">
                    {inr(bill.split.card || 0)}
                  </span>
                </div>
                <div>
                  UPI:{" "}
                  <span className="font-medium text-slate-900">
                    {inr(bill.split.upi || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Line items */}
        <section className="mt-4">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-left">#</th>
                <th className="py-2 text-left">Service / item</th>
                <th className="py-2 text-left">Variant</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(bill.lines || []).map((l: any, idx: number) => {
                const qty = Number(l.qty || 0);
                const rate = Number(l.rate || 0);
                const amount = qty * rate;
                return (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 align-top"
                  >
                    <td className="py-1 pr-2">{idx + 1}</td>
                    <td className="py-1 pr-2">
                      <div className="font-medium text-slate-900">
                        {l.name || "-"}
                      </div>
                      {l.itemId && (
                        <div className="text-[10px] text-slate-500">
                          Code: {l.itemId}
                        </div>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      {l.variant || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-1 pr-2 text-right">{qty}</td>
                    <td className="py-1 pr-2 text-right">{inr(rate)}</td>
                    <td className="py-1 pl-2 text-right">{inr(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Totals + notes */}
        <section className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Notes (only if present) */}
          <div className="flex-1 text-[11px] text-slate-600 sm:text-xs">
            {hasNotes && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-line text-slate-900">
                  {notes}
                </p>
              </>
            )}
          </div>

          <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="py-1 pr-2 text-slate-600">Subtotal</td>
                  <td className="py-1 pl-2 text-right">
                    {inr(t.subtotal || 0)}
                  </td>
                </tr>

                {hasDiscount && (
                  <tr>
                    <td className="py-1 pr-2 text-slate-600">Discount</td>
                    <td className="py-1 pl-2 text-right">
                      −{inr(discount)}
                    </td>
                  </tr>
                )}

                <tr>
                  <td className="py-1 pr-2 text-slate-600">Taxable value</td>
                  <td className="py-1 pl-2 text-right">
                    {inr(t.taxableBase || 0)}
                  </td>
                </tr>

                {(t.cgst || 0) > 0 && (
                  <tr>
                    <td className="py-1 pr-2 text-slate-600">CGST</td>
                    <td className="py-1 pl-2 text-right">
                      {inr(t.cgst || 0)}
                    </td>
                  </tr>
                )}
                {(t.sgst || 0) > 0 && (
                  <tr>
                    <td className="py-1 pr-2 text-slate-600">SGST</td>
                    <td className="py-1 pl-2 text-right">
                      {inr(t.sgst || 0)}
                    </td>
                  </tr>
                )}
                {(t.igst || 0) > 0 && (
                  <tr>
                    <td className="py-1 pr-2 text-slate-600">IGST</td>
                    <td className="py-1 pl-2 text-right">
                      {inr(t.igst || 0)}
                    </td>
                  </tr>
                )}
                {(t.roundOff || 0) !== 0 && (
                  <tr>
                    <td className="py-1 pr-2 text-slate-600">Round off</td>
                    <td className="py-1 pl-2 text-right">
                      {inr(t.roundOff || 0)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 pr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    Grand total
                  </td>
                  <td className="py-2 pl-2 text-right text-lg font-semibold tracking-tight text-slate-900">
                    {inr(t.grandTotal || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer note */}
        <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 print:text-[9px]">
          <div>
            Thank you for choosing {spaName}. Relax, refresh, rejuvenate.
          </div>
          <div className="mt-1">
            This is a computer-generated invoice. No signature required.
          </div>
        </footer>
      </div>
    </div>
  );
}