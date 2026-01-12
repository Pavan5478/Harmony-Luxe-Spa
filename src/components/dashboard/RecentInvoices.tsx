// src/components/dashboard/RecentInvoices.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/format";

type Status = "FINAL" | "DRAFT" | "VOID";

type RecentItem = {
  billNo?: string;
  id?: string;
  dateISO: string;
  customer?: string;
  grandTotal?: number;
  status?: Status;
};

function getStatus(it: RecentItem): Status {
  if (it.status === "FINAL" || it.status === "DRAFT" || it.status === "VOID") return it.status;
  if (!it.billNo && it.id) return "DRAFT";
  return "FINAL";
}

function StatusPill({ status }: { status: Status }) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none";
  const cls =
    status === "FINAL"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "DRAFT"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-danger/40 bg-danger/10 text-danger";
  const label = status === "FINAL" ? "Final" : status === "DRAFT" ? "Draft" : "Void";

  return (
    <span className={`${base} ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

type Filter = "ALL" | Status;

function SegButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        "whitespace-nowrap",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background/60 text-muted hover:bg-background/80",
      ].join(" ")}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className={active ? "text-primary" : "text-muted"}>{count}</span>
      ) : null}
    </button>
  );
}

export default function RecentInvoices() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>("ALL");
  const [limit, setLimit] = useState(8);

  useEffect(() => {
    let alive = true;
    fetch("/api/invoices/recent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setItems(Array.isArray(d?.items) ? d.items : []);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const count = items.length;
    let total = 0;
    let finalCount = 0;
    let draftCount = 0;
    let voidCount = 0;

    for (const it of items) {
      total += it.grandTotal ?? 0;
      const st = getStatus(it);
      if (st === "FINAL") finalCount++;
      else if (st === "DRAFT") draftCount++;
      else voidCount++;
    }

    return { count, total, finalCount, draftCount, voidCount };
  }, [items]);

  const dt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((it) => getStatus(it) === filter);
  }, [items, filter]);

  const visibleItems = useMemo(() => filteredItems.slice(0, limit), [filteredItems, limit]);
  const canShowMore = filteredItems.length > limit;

  useEffect(() => {
    setLimit(8);
  }, [filter]);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Recent invoices
            </h2>
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted">
              {stats.count} items
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Latest bills (tap row to open). Use filters to quickly find drafts/finals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1 text-[11px] text-muted">
            Total{" "}
            <span className="ml-1 font-medium text-foreground tabular-nums">
              {inr(stats.total)}
            </span>
          </span>

          <Link
            href="/invoices"
            prefetch={false}
            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary ring-1 ring-primary/25 hover:bg-primary/15 hover:no-underline"
          >
            View all
          </Link>
        </div>
      </div>

      {/* Filters (scrollable on mobile) */}
      <div className="mt-3">
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegButton
            active={filter === "ALL"}
            onClick={() => setFilter("ALL")}
            label="All"
            count={stats.count}
          />
          <SegButton
            active={filter === "FINAL"}
            onClick={() => setFilter("FINAL")}
            label="Final"
            count={stats.finalCount}
          />
          <SegButton
            active={filter === "DRAFT"}
            onClick={() => setFilter("DRAFT")}
            label="Draft"
            count={stats.draftCount}
          />
          {stats.voidCount > 0 ? (
            <SegButton
              active={filter === "VOID"}
              onClick={() => setFilter("VOID")}
              label="Void"
              count={stats.voidCount}
            />
          ) : null}

          <div className="ml-auto hidden text-[11px] text-muted sm:block">
            Tip: drafts can be edited from invoices.
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between rounded-xl bg-background/50 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-border" />
                <div className="space-y-2">
                  <div className="h-3 w-44 rounded bg-border" />
                  <div className="h-3 w-32 rounded bg-border" />
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-border" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 p-4 text-xs text-muted sm:text-sm">
          No invoices found for this filter.
        </div>
      ) : (
        <div className="mt-4 min-w-0 overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
          {/* Desktop table header */}
          <div className="hidden grid-cols-[44px_minmax(0,1.5fr)_minmax(0,1fr)_200px_140px_28px] items-center gap-3 border-b border-border/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted sm:grid">
            <div>#</div>
            <div>Invoice</div>
            <div>Customer</div>
            <div>Date</div>
            <div className="text-right">Amount</div>
            <div />
          </div>

          {/* Rows */}
          <div className="max-h-[420px] overflow-auto">
            <div className="divide-y divide-border/40">
              {visibleItems.map((it, idx) => {
                const st = getStatus(it);
                const label = it.billNo ?? (it.id ? `DRAFT ${it.id}` : "—");
                const linkId = encodeURIComponent(it.billNo ?? it.id ?? "");
                const hasLink = Boolean(it.billNo || it.id);

                const dateObj = new Date(it.dateISO);
                const valid = !Number.isNaN(dateObj.getTime());
                const dateStr = valid ? dt.format(dateObj) : "—";

                const serial = idx + 1;

                const rowBase =
                  "group block px-3 py-2.5 transition hover:bg-card/90 hover:no-underline";

                const content = (
                  <>
                    {/* Mobile layout */}
                    <div className="flex flex-col gap-2 sm:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                              {serial}
                            </span>
                            <span
                              className="min-w-0 truncate text-sm font-semibold text-foreground"
                              title={label}
                            >
                              {label}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusPill status={st} />
                            <span
                              className="min-w-0 truncate text-[11px] text-muted"
                              title={it.customer || ""}
                            >
                              {it.customer || "Walk-in guest"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {inr(it.grandTotal ?? 0)}
                          </div>
                          <div className="mt-1 text-[10px] text-muted">{dateStr}</div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden grid-cols-[44px_minmax(0,1.5fr)_minmax(0,1fr)_200px_140px_28px] items-center gap-3 sm:grid">
                      <div className="flex">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {serial}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground" title={label}>
                            {label}
                          </span>
                          <StatusPill status={st} />
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          {st === "DRAFT" ? "Editable draft" : "Final invoice"}
                        </div>
                      </div>

                      <div className="min-w-0 truncate text-[11px] text-muted" title={it.customer || ""}>
                        {it.customer || "Walk-in guest"}
                      </div>

                      <div className="text-[11px] text-muted">{dateStr}</div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {inr(it.grandTotal ?? 0)}
                        </div>
                        {hasLink ? (
                          <div className="mt-0.5 text-[10px] text-muted group-hover:text-primary">
                            Open →
                          </div>
                        ) : null}
                      </div>

                      <div className="flex justify-end text-muted group-hover:text-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M9 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </>
                );

                if (!hasLink) {
                  return (
                    <div key={`${label}-${idx}`} className={rowBase}>
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${label}-${idx}`}
                    href={`/invoices/${linkId}`}
                    prefetch={false}
                    className={rowBase}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            {/* Footer actions (stacks on mobile) */}
            <div className="flex flex-col gap-2 border-t border-border/50 bg-background/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[11px] text-muted">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {Math.min(limit, filteredItems.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {filteredItems.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canShowMore ? (
                  <button
                    type="button"
                    onClick={() => setLimit((p) => Math.min(p + 8, filteredItems.length))}
                    className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground hover:bg-card"
                  >
                    Show more
                  </button>
                ) : null}

                {limit > 8 ? (
                  <button
                    type="button"
                    onClick={() => setLimit(8)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted hover:bg-card hover:text-foreground"
                  >
                    Collapse
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}