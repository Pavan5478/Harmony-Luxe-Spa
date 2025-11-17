// src/app/(app)/invoices/[...id]/page.tsx
import { getBill } from "@/store/bills";
import { inr } from "@/lib/format";
import InvoiceActions from "@/components/invoice/Actions";
import type { BillDraft, BillFinal } from "@/types/billing";

type AnyBill = BillDraft | BillFinal;
type BillStatus = "DRAFT" | "FINAL" | "VOID";

export default async function InvoiceView({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { id } = await params;
  const billKey = decodeURIComponent((id || []).join("/"));

  // getBill may be sync or async – await works for both
  const bill = (await getBill(billKey)) as AnyBill | undefined;

  if (!bill) {
    return <div className="p-6">Not found</div>;
  }

  const status = ((bill as any).status as BillStatus) || "DRAFT";
  const idOrNo = (bill as any).billNo ?? (bill as any).id;

  const gstRate = (bill as any).gstRate ?? 0.18;
  const t = bill.totals;
  const tax = (t.igst ?? 0) + (t.cgst ?? 0) + (t.sgst ?? 0);
  const isIGST = (t.igst ?? 0) > 0;

  const dateObj = new Date(
    (bill as any).finalizedAt || bill.createdAt
  );

  return (
    <>
      {/* Only invoice-print area is printed */}
      <div className="invoice-print rounded-2xl border border-border bg-card p-6 shadow-card">
        {/* Top header (logo + business + title).
            NOTE: Use <div>, not <header>, so global @media print rules that hide
            <header> (for the app shell) do NOT hide this block. */}
        <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: tax invoice + bill meta */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Tax invoice
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Bill #{idOrNo}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {dateObj.toLocaleDateString()} •{" "}
              {dateObj.toLocaleTimeString()}
            </p>
          </div>

          {/* Right: business details + logo placeholder */}
          <div className="flex items-start gap-3 text-right text-xs text-muted">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-[10px] font-semibold uppercase text-indigo-700">
              LOGO
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Your Spa Name
              </div>
              <div className="text-[11px] text-muted">
                Premium Spa &amp; Wellness
              </div>
              <div className="mt-1 leading-tight">
                <div>123, Main Street</div>
                <div>Koramangala, Bengaluru - 560001</div>
                <div>Phone: +91 98765 43210</div>
                <div>Email: info@yourspa.com</div>
                <div>GSTIN: 29AAAAA0000A1Z5</div>
              </div>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <section className="grid gap-4 text-xs text-foreground sm:grid-cols-2">
          <div className="space-y-1">
            <div className="font-semibold text-muted">Invoice details</div>
            <div className="flex justify-between">
              <span className="text-muted">Invoice no</span>
              <span>{idOrNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Status</span>
              <span>{status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Payment mode</span>
              <span>{(bill as any).paymentMode || "-"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-muted">Customer</div>
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span>{bill.customer?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Phone</span>
              <span>{bill.customer?.phone || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Email</span>
              <span>{bill.customer?.email || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Cashier</span>
              <span>{(bill as any).cashierEmail || "-"}</span>
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="mt-5 overflow-x-auto rounded-xl border border-border bg-background">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-background/70 text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-3 pr-2 font-medium">S. no</th>
                <th className="py-2 px-2 font-medium">Item</th>
                <th className="py-2 px-2 font-medium">Qty</th>
                <th className="py-2 px-2 font-medium">Rate</th>
                <th className="py-2 px-3 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((l, ix) => (
                <tr
                  key={ix}
                  className="border-b border-border/60 bg-card/40"
                >
                  <td className="py-2 pl-3 pr-2 align-top">{ix + 1}</td>
                  <td className="px-2 align-top">
                    {l.name}
                    {l.variant ? (
                      <span className="text-muted"> • {l.variant}</span>
                    ) : null}
                  </td>
                  <td className="px-2 align-top">{l.qty}</td>
                  <td className="px-2 align-top">{inr(l.rate)}</td>
                  <td className="px-3 text-right align-top">
                    {inr(l.rate * l.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Notes + totals */}
        <section className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
          <div className="space-y-2">
            <div className="font-semibold text-muted">Notes</div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              {bill.notes || "-"}
            </div>
          </div>

          <div className="space-y-1 justify-self-end text-xs sm:w-64">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{inr(t.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Discount</span>
              <span>{inr(t.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tax base</span>
              <span>{inr(t.taxableBase)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                {isIGST
                  ? `IGST @ ${(gstRate * 100).toFixed(2)}%`
                  : `CGST + SGST @ ${(gstRate * 100).toFixed(2)}%`}
              </span>
              <span>{inr(tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Round-off</span>
              <span>{inr(t.roundOff)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border/70 pt-2 text-sm font-semibold">
              <span>Grand total</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {inr(t.grandTotal)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Buttons – not printed */}
      <div className="mt-4">
        <InvoiceActions
          idOrNo={idOrNo}
          printedAt={(bill as any).printedAt ?? null}
          status={status}
        />
      </div>
    </>
  );
}