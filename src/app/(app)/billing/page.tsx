// src/app/(app)/billing/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { BillLine, Customer, CustomerDraft } from "@/types/billing";
import { computeTotals } from "@/lib/totals";
import CustomerCard from "@/components/billing/CustomerCard";
import ItemPicker from "@/components/billing/ItemPicker";
import LineItemsTable from "@/components/billing/LineItemsTable";
import PaymentCard from "@/components/billing/PaymentCard";
import TotalsCard from "@/components/billing/TotalsCard";
import BillingActions from "@/components/billing/Actions";
import ExtrasCard from "@/components/billing/ExtrasCard";

type Item = { id: string; name: string; variant?: string; price: number };

// ---- Money helpers (avoid float mismatches) ----
function toPaise(v: number): number {
  return Math.round((Number(v) || 0) * 100);
}
function fromPaise(p: number): number {
  return p / 100;
}
function pctOfPaise(basePaise: number, pct: number): number {
  return Math.round(basePaise * ((Number(pct) || 0) / 100));
}
function calcLineAmount(rate: number, qty: number): number {
  // rate in ₹, qty may be decimal
  const ratePaise = toPaise(rate);
  const linePaise = Math.round(ratePaise * (Number(qty) || 0));
  return fromPaise(linePaise);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMDLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYMDLocal(ymd: string) {
  // force local midnight to avoid timezone shifting
  return new Date(`${ymd}T00:00:00`);
}
function sameYMD(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M7 3v3M17 3v3M4.5 8.5h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 12h3M13.5 12h3M7.5 16h3M13.5 16h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9 18l6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InvoiceDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => {
    try {
      return value ? parseYMDLocal(value) : new Date();
    } catch {
      return new Date();
    }
  }, [value]);

  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (popRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const fmtLong = useMemo(() => {
    const f = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return f.format(selected);
  }, [selected]);

  const today = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(view);
  }, [view]);

  const firstDay = useMemo(() => new Date(view.getFullYear(), view.getMonth(), 1), [view]);
  const startWeekday = firstDay.getDay();
  const daysInMonth = useMemo(() => {
    return new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  }, [view]);

  const cells = useMemo(() => {
    const arr: { date: Date; inMonth: boolean }[] = [];
    const gridStart = new Date(view.getFullYear(), view.getMonth(), 1 - startWeekday);

    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      arr.push({ date: d, inMonth: d.getMonth() === view.getMonth() });
    }
    return arr;
  }, [view, startWeekday]);

  function pick(d: Date) {
    const ymd = toYMDLocal(d);
    onChange(ymd);
    setOpen(false);
  }

  return (
    <div className="relative" ref={anchorRef}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Invoice date</h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Choose the invoice date before saving/finalizing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-2 text-xs font-semibold text-foreground ring-1 ring-border/70">
            <CalendarIcon className="text-muted" />
            <span className="tabular-nums">{value}</span>
            <span className="hidden text-[11px] font-medium text-muted sm:inline">• {fmtLong}</span>
          </span>

          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <CalendarIcon />
            Pick
          </button>

          <button
            type="button"
            onClick={() => onChange(toYMDLocal(new Date()))}
            className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted hover:bg-card hover:text-foreground"
          >
            Today
          </button>

          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            aria-label="Invoice date"
          />
        </div>
      </div>

      {open ? (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Select invoice date"
          className="absolute right-0 top-full z-50 mt-3 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:w-[360px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-background/40 px-3 py-2">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-card"
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </button>

            <div className="min-w-0 text-center">
              <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
              <div className="text-[11px] text-muted">
                Selected: <span className="font-medium text-foreground tabular-nums">{value}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-card"
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 py-3">
            {cells.map(({ date, inMonth }, i) => {
              const isSel = sameYMD(date, selected);
              const isToday = sameYMD(date, today);

              return (
                <button
                  key={`${date.toISOString()}-${i}`}
                  type="button"
                  onClick={() => pick(date)}
                  className={[
                    "relative inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    inMonth ? "text-foreground" : "text-muted/60",
                    isSel
                      ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                      : "bg-background/50 hover:bg-card",
                  ].join(" ")}
                  aria-pressed={isSel}
                >
                  <span className="tabular-nums">{date.getDate()}</span>

                  {isToday && !isSel ? (
                    <span
                      className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/40 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                setView(new Date(d.getFullYear(), d.getMonth(), 1));
                onChange(toYMDLocal(d));
                setOpen(false);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card"
            >
              Jump to today
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:bg-card hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const editKey = sp.get("edit");
  const isEditing = !!editKey;

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        const role = j?.role as "ADMIN" | "CASHIER" | "ACCOUNTS" | undefined;
        if (role === "ACCOUNTS") router.replace("/dashboard");
      } catch {
        // ignore
      }
    })();
  }, [router]);

  const [items, setItems] = useState<Item[]>([]);
  const [recentItemIds, setRecentItemIds] = useState<string[]>([]);

  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    email: "",
  });

  const [lines, setLines] = useState<BillLine[]>([]);
  const [discount, setDiscount] = useState({ flat: 0, pct: 0 });

  // IMPORTANT: your edit flow defaults GST to 0.00, but new bill was 0.00.
  // Keep consistent to prevent accidental "no GST" invoices.
  const [gstRate, setGstRate] = useState<number>(0.0);

  const [interState, setInterState] = useState(false);

  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI" | "SPLIT">("CASH");
  const [split, setSplit] = useState<{ cash?: number; card?: number; upi?: number }>({});
  const [notes, setNotes] = useState("");

  const [invoiceDate, setInvoiceDate] = useState<string>(() => toYMDLocal(new Date()));

  const [cashierEmail, setCashierEmail] = useState("cashier@harmonyluxe.com");

  const [initialStatus, setInitialStatus] = useState<"DRAFT" | "FINAL" | "VOID" | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/items?all=1", { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if (!cancelled) setItems(j.items || []);
      } catch (err) {
        console.error("Failed to load items", err);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    try {
      const raw = localStorage.getItem("bb.recentItems");
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (!Array.isArray(ids)) return;
      const validIds = ids.filter(
        (id: unknown) => typeof id === "string" && items.some((it) => it.id === id)
      ) as string[];
      setRecentItemIds(validIds.slice(0, 8));
    } catch {
      // ignore
    }
  }, [items]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bb.email");
      if (stored) setCashierEmail(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!editKey) return;

    (async () => {
      try {
        const res = await fetch(`/api/bills/${encodeURIComponent(editKey)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Failed to load bill for edit", res.status, await res.text());
          return;
        }

        const data = await res.json();
        const bill = data?.bill;
        if (!bill) return;

        setInitialStatus(bill.status as "DRAFT" | "FINAL" | "VOID" | undefined);

        setCustomer({
          name: bill.customer?.name ?? "",
          phone: bill.customer?.phone ?? "",
          email: bill.customer?.email ?? "",
        });

        setLines(Array.isArray(bill.lines) ? bill.lines : []);

        setDiscount({
          flat: bill.discountFlat ?? bill.discount ?? 0,
          pct: bill.discountPct ?? 0,
        });

        setGstRate(bill.gstRate ?? 0.0);
        setInterState(Boolean(bill.isInterState));
        setPaymentMode(bill.paymentMode ?? "CASH");
        setSplit(bill.split ?? {});
        setNotes(bill.notes ?? "");

        try {
          const rawDate: string =
            bill.billDate || bill.finalizedAt || bill.createdAt || new Date().toISOString();
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) setInvoiceDate(toYMDLocal(d));
        } catch {
          setInvoiceDate(toYMDLocal(new Date()));
        }
      } catch (err) {
        console.error("Error loading bill for edit", err);
      }
    })();
  }, [editKey]);

  function addLine(it: Item) {
    setLines((prev) => {
      const v = (it.variant ?? "").trim();
      const ix = prev.findIndex((l) => l.itemId === it.id && ((l.variant ?? "").trim() === v));

      if (ix === -1) {
        const qty = 1;
        const rate = Number(it.price) || 0;
        return [
          ...prev,
          {
            itemId: it.id,
            name: it.name,
            variant: it.variant,
            qty,
            rate,
            amount: calcLineAmount(rate, qty),
          },
        ];
      }

      const next = prev.slice();
      const line = next[ix];
      const nextQty = Math.max(1, Number(line.qty || 1) + 1);
      const rate = Number(line.rate || it.price || 0);

      next[ix] = {
        ...line,
        qty: nextQty,
        rate,
        amount: calcLineAmount(rate, nextQty),
      };

      return next;
    });

    setRecentItemIds((prev) => {
      const next = [it.id, ...prev.filter((id) => id !== it.id)].slice(0, 8);
      try {
        localStorage.setItem("bb.recentItems", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function onQty(ix: number, q: number) {
    setLines((p) =>
      p.map((l, i) =>
        i === ix
          ? { ...l, qty: q, amount: calcLineAmount(Number(l.rate || 0), q) }
          : l
      )
    );
  }

  function onRemove(ix: number) {
    setLines((p) => p.filter((_, i) => i !== ix));
  }

  function clearLines() {
    setLines([]);
  }

  const recentItems = useMemo(
    () =>
      recentItemIds
        .map((id) => items.find((it) => it.id === id))
        .filter((it): it is Item => Boolean(it)),
    [recentItemIds, items]
  );

  function clearRecentItems() {
    setRecentItemIds([]);
    try {
      localStorage.removeItem("bb.recentItems");
    } catch {}
  }

  const totals = useMemo(
    () =>
      computeTotals({
        lines,
        discountFlat: discount.flat || 0,
        discountPct: discount.pct || 0,
        gstRate,
        interState,
      }),
    [lines, discount, gstRate, interState]
  );

  // Use totals.subtotal (consistent with computeTotals, avoids float drift)
  const subtotal = totals.subtotal;

  // Discount validation in paise (no float compare)
  const subtotalPaise = toPaise(subtotal);
  const desiredDiscountPaise = toPaise(discount.flat || 0) + pctOfPaise(subtotalPaise, discount.pct || 0);
  const discountTooHigh = desiredDiscountPaise > subtotalPaise;

  // Split validation in paise
  const expectedPaise = toPaise(totals.grandTotal);
  const splitSumPaise =
    toPaise(split.cash || 0) + toPaise(split.card || 0) + toPaise(split.upi || 0);

  const splitMismatch = paymentMode === "SPLIT" && splitSumPaise !== expectedPaise;

  const customerValid = customer.name.trim().length > 0 && customer.phone.trim().length > 0;
  const needsItems = lines.length === 0;
  const needsCustomer = !customerValid;

  const canSave = !needsItems && !discountTooHigh && !splitMismatch && customerValid;

  const payload: any = {
    cashierEmail,
    customer,
    lines,
    discountFlat: discount.flat || 0,
    discountPct: discount.pct || 0,
    gstRate,
    isInterState: interState,
    paymentMode,
    split,
    notes,
    totals,
    billDate: invoiceDate ? new Date(`${invoiceDate}T00:00:00`).toISOString() : undefined,
  };

  return (
    <div className="min-w-0 space-y-5 pb-24 lg:space-y-6 lg:pb-0">
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0 space-y-4">
          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <InvoiceDatePicker value={invoiceDate} onChange={setInvoiceDate} />
          </section>

          <section className="min-w-0">
            <div className="mt-3">
              <CustomerCard
                value={customer}
                onChange={(v: CustomerDraft) =>
                  setCustomer({
                    name: v.name ?? "",
                    phone: v.phone ?? "",
                    email: v.email ?? "",
                  })
                }
              />
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Items</h2>
              </div>
              <div className="text-[11px] text-muted">
                Subtotal:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-3 min-w-0">
              <ItemPicker
                items={items}
                onPick={addLine}
                onClear={clearLines}
                recentItems={recentItems}
                onClearRecent={clearRecentItems}
              />
            </div>

            <div className="min-w-0">
              <LineItemsTable lines={lines} onQty={onQty} onRemove={onRemove} />
            </div>
          </section>

          <section className="min-w-0">
            <div className="mt-3">
              <ExtrasCard
                discount={discount}
                onDiscountChange={setDiscount}
                gstRate={gstRate}
                onGstRateChange={setGstRate}
                interState={interState}
                onInterStateChange={setInterState}
                notes={notes}
                onNotesChange={setNotes}
              />
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <TotalsCard totals={totals} interState={interState} onInterState={setInterState} />

          <PaymentCard
            mode={paymentMode}
            onMode={setPaymentMode}
            split={split}
            onSplit={setSplit}
            expectedTotal={totals.grandTotal}
          />

          {(discountTooHigh || splitMismatch || needsItems || needsCustomer) && (
            <div className="space-y-2">
              {discountTooHigh && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                  Discount exceeds subtotal. Reduce flat or percentage discount.
                </div>
              )}
              {splitMismatch && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  Split amounts must add up to grand total{" "}
                  <span className="font-semibold tabular-nums">
                    (₹{totals.grandTotal.toFixed(2)})
                  </span>
                  .
                </div>
              )}
              {needsItems && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  Add at least one item before saving/finalizing.
                </div>
              )}
              {needsCustomer && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  Add customer <span className="font-semibold">name</span> and{" "}
                  <span className="font-semibold">phone number</span>.
                </div>
              )}
            </div>
          )}

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <BillingActions
              payload={payload}
              showSave={!isEditing}
              disabled={!canSave}
              editKey={isEditing ? editKey! : undefined}
              initialStatus={initialStatus}
            />
          </section>
        </div>
      </div>
    </div>
  );
}