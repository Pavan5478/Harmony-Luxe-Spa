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
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium";
  const cls =
    status === "FINAL"
      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "DRAFT"
      ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border border-danger/40 bg-danger/10 text-danger";
  const label = status === "FINAL" ? "Final" : status === "DRAFT" ? "Draft" : "Void";

  return (
    <span className={`${base} ${cls}`}>
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default function RecentInvoices() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/invoices/recent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setItems(d.items || []);
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

  const dtDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    []
  );

  const dtTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Recent invoices</h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Quick glance at the latest bills. Tap to open invoice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted sm:text-xs">
          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {stats.count} recent
          </span>

          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
            {stats.finalCount} final · {stats.draftCount} draft
            {stats.voidCount > 0 ? ` · ${stats.voidCount} void` : ""}
          </span>

          <span className="inline-flex items-center rounded-full bg-background/80 px-2.5 py-1">
            Total <span className="ml-1 font-medium text-foreground">{inr(stats.total)}</span>
          </span>

          <Link
            href="/invoices"
            prefetch={false}
            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/25 hover:bg-primary/15 hover:no-underline"
          >
            View all
          </Link>
        </div>
      </div>

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
        <div className="mt-1 overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
          <div className="divide-y divide-border/40">
            {items.map((it, idx) => {
              const st = getStatus(it);
              const label = it.billNo ?? (it.id ? `DRAFT ${it.id}` : "—");
              const linkId = encodeURIComponent(it.billNo ?? it.id ?? "");
              const hasLink = Boolean(it.billNo || it.id);

              const dateObj = new Date(it.dateISO);
              const valid = !Number.isNaN(dateObj.getTime());
              const dateStr = valid ? dtDate.format(dateObj) : "—";
              const timeStr = valid ? dtTime.format(dateObj) : "";

              const serial = idx + 1;

              const row =
                "group px-3.5 py-3 transition hover:bg-card/90 hover:no-underline";

              const content = (
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[40px_minmax(0,1fr)_140px] sm:items-center sm:gap-4">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary sm:mt-0">
                    {serial}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="max-w-full truncate text-sm font-semibold text-foreground"
                        title={label}
                      >
                        {label}
                      </span>
                      <StatusPill status={st} />
                    </div>

                    <div
                      className="truncate text-[11px] text-muted"
                      title={it.customer || ""}
                    >
                      {it.customer || "Walk-in guest"}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                      <span>{dateStr}</span>
                      {timeStr ? (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>{timeStr}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right sm:justify-self-end">
                    <div className="text-sm font-semibold text-foreground">
                      {inr(it.grandTotal ?? 0)}
                    </div>
                    {hasLink ? (
                      <div className="mt-1 text-[10px] text-muted group-hover:text-primary">
                        View invoice →
                      </div>
                    ) : null}
                  </div>
                </div>
              );

              if (!hasLink) {
                return (
                  <div key={`${label}-${idx}`} className={row}>
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={`${label}-${idx}`}
                  href={`/invoices/${linkId}`}
                  prefetch={false}
                  className={row}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}