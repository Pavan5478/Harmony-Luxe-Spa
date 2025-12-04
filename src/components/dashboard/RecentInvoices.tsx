// src/components/dashboard/RecentInvoices.tsx
"use client";

import { useEffect, useState } from "react";
import { inr } from "@/lib/format";

type Status = "FINAL" | "DRAFT" | "VOID";

type RecentItem = {
  billNo?: string; // present for finalized invoices
  id?: string; // present for drafts (e.g., D1)
  dateISO: string;
  customer?: string;
  grandTotal?: number;
  status?: Status; // optional – if API sends it we use it
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
  const total = items.reduce((sum, it) => sum + (it.grandTotal ?? 0), 0);

  // derive status for each item – prefer `status` from API, fall back to billNo/id
  function getStatus(it: RecentItem): Status {
    if (it.status === "FINAL" || it.status === "DRAFT" || it.status === "VOID") {
      return it.status;
    }
    if (!it.billNo && it.id) return "DRAFT";
    return "FINAL";
  }

  const finalCount = items.filter((it) => getStatus(it) === "FINAL").length;
  const draftCount = items.filter((it) => getStatus(it) === "DRAFT").length;
  const voidCount = items.filter((it) => getStatus(it) === "VOID").length;

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Recent invoices
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Quick glance at the latest bills. Tap a card to open the full view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted sm:text-xs">
          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {count} recent
          </span>

          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
            {finalCount} final · {draftCount} draft
            {voidCount > 0 ? ` · ${voidCount} void` : ""}
          </span>

          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
            Total&nbsp;
            <span className="ml-0.5 font-medium text-foreground">
              {inr(total)}
            </span>
          </span>

          <a
            href="/invoices"
            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/25 hover:bg-primary/15 hover:no-underline"
          >
            View all
          </a>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between rounded-xl bg-background/50 px-3.5 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-border" />
                <div className="space-y-2">
                  <div className="h-3 w-32 rounded bg-border" />
                  <div className="h-3 w-40 rounded bg-border" />
                  <div className="h-3 w-24 rounded bg-border" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-border" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-background/60 p-4 text-xs text-muted sm:text-sm">
          No invoices yet. Create a bill to see it appear here.
        </div>
      ) : (
        // ONE soft container, list style – no heavy box per row
        <div className="mt-1 overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
          <div className="divide-y divide-border/40">
            {items.map((it, idx) => {
              const key = `${it.billNo ?? it.id ?? "row"}-${idx}`;
              const linkId = encodeURIComponent(it.billNo ?? it.id ?? "");
              const label = it.billNo ?? (it.id ? `DRAFT ${it.id}` : "—");
              const status = getStatus(it);
              const hasLink = Boolean(it.billNo || it.id);

              const dateObj = new Date(it.dateISO);
              const isValidDate = !Number.isNaN(dateObj.getTime());

              const dateStr = isValidDate
                ? dateObj.toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—";

              const timeStr = isValidDate
                ? dateObj.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              const Wrapper: any = hasLink ? "a" : "div";
              const wrapperProps = hasLink
                ? { href: `/invoices/${linkId}` }
                : {};

              const statusClasses =
                status === "FINAL"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : status === "DRAFT"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-danger/10 text-danger";

              const statusLabel =
                status === "FINAL"
                  ? "Final"
                  : status === "DRAFT"
                  ? "Draft"
                  : "Void";

              const serial = idx + 1;

              return (
                <Wrapper
                  key={key}
                  {...wrapperProps}
                  className="group flex items-center justify-between px-3.5 py-3 text-xs transition hover:bg-card/90 hover:no-underline"
                >
                  <div className="flex items-start gap-3">
                    {/* Serial number pill – subtle, no box around row */}
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {serial}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {label}
                        </span>
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            statusClasses,
                          ].join(" ")}
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted">
                        {it.customer || "Walk-in guest"}
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                        <span>{dateStr}</span>
                        {timeStr && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>{timeStr}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {inr(it.grandTotal ?? 0)}
                    </div>
                    {hasLink && (
                      <div className="mt-1 text-[10px] text-muted group-hover:text-primary">
                        View invoice →
                      </div>
                    )}
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}