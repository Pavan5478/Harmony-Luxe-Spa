"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import { BillSummary } from "@/components/reports/report-utils";
import { KpiCard, SectionShell, fieldBase } from "@/components/reports/ReportUi";

export default function RevenueTab({
  revenueTotal,
  invoiceCount,
  avgBill,
  uniqueCustomers,
  bills,
}: {
  revenueTotal: number;
  invoiceCount: number;
  avgBill: number;
  uniqueCustomers: number;
  bills: BillSummary[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return bills;
    return bills.filter((b) => {
      const hay = `${b.billNo ?? ""} ${b.customerName ?? ""} ${b.customerPhone ?? ""} ${b.paymentMode ?? ""} ${b.status ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [bills, q]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bills) {
      const key = b.customerPhone || b.customerName || "Walk-in";
      map.set(key, (map.get(key) || 0) + b.grandTotal);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [bills]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total revenue" value={inr(revenueTotal)} hint="Sum of invoice grand totals." />
        <KpiCard label="Invoices" value={String(invoiceCount)} hint="Invoices inside this range." />
        <KpiCard label="Average bill" value={inr(avgBill)} hint="Revenue / invoice count." />
        <KpiCard label="Unique customers" value={String(uniqueCustomers)} hint="Based on name/phone." />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <SectionShell title="Top customers" subtitle="Highest revenue contributors in this range.">
          {topCustomers.length === 0 ? (
            <p className="text-[11px] text-muted">No customer data.</p>
          ) : (
            <div className="space-y-2 text-[11px]">
              {topCustomers.map(([name, amt]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-foreground">{name}</div>
                  </div>
                  <div className="text-right text-muted">{inr(amt)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionShell>

        <SectionShell title="Invoice list" subtitle="Search within filtered invoices.">
          <div className="mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bill no / customer / phone / mode / status"
              className={fieldBase}
            />
          </div>

          <div className="max-h-[420px] overflow-auto text-[11px]">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Bill</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Mode</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-muted" colSpan={5}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filtered
                    .slice()
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((b) => {
                      const labelDate = b.date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
                      const billLabel = b.billNo || b.id || "(draft)";
                      const hrefId = encodeURIComponent(b.billNo || b.id || "") || "#";
                      const badge =
                        b.status === "FINAL"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : b.status === "DRAFT"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-danger/10 text-danger";

                      return (
                        <tr key={b.dateISO + b.id} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-2">{labelDate}</td>
                          <td className="py-2 pr-2">
                            <a href={`/invoices/${hrefId}`} className="font-medium text-primary hover:underline">
                              {billLabel}
                            </a>
                            <span className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badge}`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="max-w-[180px] truncate">{b.customerName || <span className="text-muted">Walk-in</span>}</div>
                            {b.customerPhone ? <div className="text-[10px] text-muted">{b.customerPhone}</div> : null}
                          </td>
                          <td className="py-2 pr-2 text-muted">{b.paymentMode || "—"}</td>
                          <td className="py-2 pr-2 text-right">{inr(b.grandTotal)}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </SectionShell>
      </section>
    </div>
  );
}
