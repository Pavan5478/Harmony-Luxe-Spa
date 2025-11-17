// src/app/(app)/billing/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { BillLine, Customer, CustomerDraft } from "@/types/billing";
import { computeTotals } from "@/lib/totals";
import CustomerCard from "@/components/billing/CustomerCard";
import ItemPicker from "@/components/billing/ItemPicker";
import LineItemsTable from "@/components/billing/LineItemsTable";
import DiscountCard from "@/components/billing/DiscountCard";
import PaymentCard from "@/components/billing/PaymentCard";
import TotalsCard from "@/components/billing/TotalsCard";
import BillingActions from "@/components/billing/Actions";

type Item = { id: string; name: string; variant?: string; price: number };

export default function BillingPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const editKey = sp.get("edit");
  const isEditing = !!editKey;

  // role gate (client-side)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        const role = j?.role as
          | "ADMIN"
          | "CASHIER"
          | "ACCOUNTS"
          | undefined;
        if (role === "ACCOUNTS") router.replace("/dashboard");
      } catch {}
    })();
  }, [router]);

  const [items, setItems] = useState<Item[]>([]);
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    phone: "",
    email: "",
  });
  const [lines, setLines] = useState<BillLine[]>([]);
  const [discount, setDiscount] = useState({ flat: 0, pct: 0 });
  const [gstRate, setGstRate] = useState<number>(0.05);
  const [interState, setInterState] = useState(false);
  const [paymentMode, setPaymentMode] = useState<
    "CASH" | "CARD" | "UPI" | "SPLIT"
  >("CASH");
  const [split, setSplit] = useState<{
    cash?: number;
    card?: number;
    upi?: number;
  }>({});
  const [notes, setNotes] = useState("");

  const [cashierEmail, setCashierEmail] = useState("cashier@example.com");

  // 🔹 track original status when editing (DRAFT / FINAL / VOID)
  const [initialStatus, setInitialStatus] = useState<
    "DRAFT" | "FINAL" | "VOID" | undefined
  >(undefined);

  // Load items
  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((j) => setItems(j.items || []));
  }, []);

  // Load cashier email from localStorage (client only, safe for hydration)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bb.email");
      if (stored) setCashierEmail(stored);
    } catch {}
  }, []);

  // Edit existing bill
  useEffect(() => {
    if (!editKey) return;

    (async () => {
      try {
        const res = await fetch(`/api/bills/${encodeURIComponent(editKey)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.error(
            "Failed to load bill for edit",
            res.status,
            await res.text()
          );
          return;
        }

        const data = await res.json();
        const bill = data?.bill;

        console.log("Editing bill payload", bill);

        if (!bill) return;

        // 🔹 Remember status of the bill we’re editing
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

        setGstRate(bill.gstRate ?? 0.18);
        setInterState(Boolean(bill.isInterState));
        setPaymentMode(bill.paymentMode ?? "CASH");
        setSplit(bill.split ?? {});
        setNotes(bill.notes ?? "");
      } catch (err) {
        console.error("Error loading bill for edit", err);
      }
    })();
  }, [editKey]);

  function addLine(it: Item) {
    setLines((p) => [
      ...p,
      {
        itemId: it.id,
        name: it.name,
        variant: it.variant,
        qty: 1,
        rate: it.price,
        amount: it.price,
      },
    ]);
  }
  function onQty(ix: number, q: number) {
    setLines((p) =>
      p.map((l, i) =>
        i === ix ? { ...l, qty: q, amount: l.rate * q } : l
      )
    );
  }
  function onRemove(ix: number) {
    setLines((p) => p.filter((_, i) => i !== ix));
  }
  function clearLines() {
    setLines([]);
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

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.rate * l.qty, 0),
    [lines]
  );
  const discountTooHigh =
    discount.flat + subtotal * (discount.pct / 100) >
    subtotal + 0.001;
  const splitSum =
    (split.cash || 0) + (split.card || 0) + (split.upi || 0);
  const splitMismatch =
    paymentMode === "SPLIT" &&
    Math.round(splitSum) !== Math.round(totals.grandTotal);
  const canSave =
    lines.length > 0 && !discountTooHigh && !splitMismatch;

  const payload = {
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
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header card */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Billing
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              {isEditing ? "Edit Bill" : "Create Bill"}
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Add services, apply discounts and taxes, then finalize to
              generate a printable invoice.
            </p>
          </div>

          <div className="rounded-xl bg-background px-3 py-2 text-[11px] text-muted">
            <div className="font-medium text-foreground">Cashier</div>
            <div className="mt-1 max-w-[220px] truncate">
              {cashierEmail}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                {lines.length} line
                {lines.length === 1 ? "" : "s"},{" "}
                {paymentMode === "SPLIT"
                  ? "split payment"
                  : paymentMode.toLowerCase()}{" "}
                mode
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-column layout */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
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

          {/* Items */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Items
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  Add services from your menu. Quantities and prices can
                  be edited line by line.
                </p>
              </div>
              <div className="text-[11px] text-muted">
                Subtotal:{" "}
                <span className="font-medium">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <ItemPicker
                items={items}
                onPick={addLine}
                onClear={clearLines}
              />
            </div>

            <LineItemsTable
              lines={lines}
              onQty={onQty}
              onRemove={onRemove}
            />
          </section>

          <DiscountCard
            value={discount}
            onFlat={(n) => setDiscount({ ...discount, flat: n })}
            onPct={(n) => setDiscount({ ...discount, pct: n })}
          />

          {/* Tax + place */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
              Tax &amp; Place of Supply
            </h2>
            <div className="grid items-center gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  GST % (0, 5, 12, 18, 28 or custom)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(gstRate * 100).toString()}
                  onChange={(e) =>
                    setGstRate(
                      Math.max(0, Number(e.target.value || 0)) / 100
                    )
                  }
                  className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <label className="mt-4 flex items-center gap-2 text-xs text-foreground md:col-span-2 md:mt-7">
                <input
                  type="checkbox"
                  checked={interState}
                  onChange={(e) => setInterState(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Inter-state supply (use IGST)
              </label>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground sm:text-base">
              Notes (optional)
            </h2>
            <textarea
              placeholder="Bill notes, therapist name, room number, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <TotalsCard
            totals={totals}
            interState={interState}
            onInterState={setInterState}
          />

          <PaymentCard
            mode={paymentMode}
            onMode={setPaymentMode}
            split={split}
            onSplit={setSplit}
            expectedTotal={totals.grandTotal}
          />

          {/* Warnings */}
          {(discountTooHigh || splitMismatch || !lines.length) && (
            <div className="space-y-2">
              {discountTooHigh && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                  Discount exceeds subtotal. Please reduce flat or
                  percentage discount.
                </div>
              )}
              {splitMismatch && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  Split amounts must add up to the grand total (
                  <span className="font-medium">
                    ₹{totals.grandTotal.toFixed(2)}
                  </span>
                  ).
                </div>
              )}
              {!lines.length && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  Add at least one item before saving or finalizing.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
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