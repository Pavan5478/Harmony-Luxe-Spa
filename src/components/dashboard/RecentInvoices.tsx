"use client";

import { useEffect, useState } from "react";
import { inr } from "@/lib/format";

type RecentItem = {
  billNo?: string; // present for finalized invoices
  id?: string; // present for drafts (e.g., D1)
  dateISO: string;
  customer?: string;
  grandTotal?: number;
};

export default function RecentInvoices() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices/recent")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, []);

  const count = items.length;
  const total = items.reduce(
    (sum, it) => sum + (it.grandTotal ?? 0),
    0
  );

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Recent invoices
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Latest finalized bills and drafts created from this
            workspace. Click on a bill number to open the invoice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted sm:text-xs">
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {count} recent
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1">
            Amount:{" "}
            <span className="ml-1 font-medium text-foreground">
              {inr(total)}
            </span>
          </span>
          <a
            href="/invoices"
            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium text-primary hover:bg-card"
          >
            View all
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        {loading ? (
          <div className="p-4 text-xs text-muted sm:text-sm">
            Loading recent invoices…
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-xs text-muted sm:text-sm">
            No invoices yet. Create a bill to see it appear here.
          </div>
        ) : (
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-background/80 text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pl-4 pr-2 font-medium">
                  Bill no
                </th>
                <th className="py-2 px-2 font-medium">Date</th>
                <th className="py-2 px-2 font-medium">Customer</th>
                <th className="py-2 px-3 text-right font-medium">
                  Grand total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const key = `${it.billNo ?? it.id ?? "row"}-${idx}`;
                const linkId = encodeURIComponent(
                  it.billNo ?? it.id ?? ""
                );
                const label =
                  it.billNo ??
                  (it.id ? `DRAFT ${it.id}` : "—");
                const hasLink = Boolean(it.billNo || it.id);
                const isDraft = !it.billNo && !!it.id;

                const date = new Date(it.dateISO);

                return (
                  <tr
                    key={key}
                    className="border-b border-border/60 bg-card/40 hover:bg-background/80"
                  >
                    <td className="py-2 pl-4 pr-2 align-top">
                      {hasLink ? (
                        <a
                          className="text-sm font-medium text-primary hover:underline"
                          href={`/invoices/${linkId}`}
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="text-sm">{label}</span>
                      )}
                      {isDraft && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-2 align-top">
                      <div className="text-xs">
                        {date.toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-muted">
                        {date.toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-2 align-top">
                      {it.customer || "-"}
                    </td>
                    <td className="px-3 pr-4 text-right align-top">
                      <span className="font-medium">
                        {inr(it.grandTotal ?? 0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}