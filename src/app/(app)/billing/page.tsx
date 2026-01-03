// src/app/(app)/billing/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [gstRate, setGstRate] = useState<number>(0.05);
  const [interState, setInterState] = useState(false);

  const [paymentMode, setPaymentMode] = useState<
    "CASH" | "CARD" | "UPI" | "SPLIT"
  >("CASH");
  const [split, setSplit] = useState<{ cash?: number; card?: number; upi?: number }>({});
  const [notes, setNotes] = useState("");

  // Manual invoice date (YYYY-MM-DD)
  const [invoiceDate, setInvoiceDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [cashierEmail, setCashierEmail] = useState("cashier@harmoneyluxe.com");

  // track original status when editing (DRAFT / FINAL / VOID)
  const [initialStatus, setInitialStatus] = useState<
    "DRAFT" | "FINAL" | "VOID" | undefined
  >(undefined);

  // Load items
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/items", { cache: "no-store" });
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

  // Hydrate recent items once items are available
  useEffect(() => {
    if (!items.length) return;
    try {
      const raw = localStorage.getItem("bb.recentItems");
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (!Array.isArray(ids)) return;
      const validIds = ids.filter(
        (id: unknown) => typeof id === "string" && items.some((it) => it.id === id),
      ) as string[];
      setRecentItemIds(validIds.slice(0, 8));
    } catch {
      // ignore
    }
  }, [items]);

  // Load cashier email
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bb.email");
      if (stored) setCashierEmail(stored);
    } catch {
      // ignore
    }
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

        setGstRate(bill.gstRate ?? 0.18);
        setInterState(Boolean(bill.isInterState));
        setPaymentMode(bill.paymentMode ?? "CASH");
        setSplit(bill.split ?? {});
        setNotes(bill.notes ?? "");

        // invoice date
        try {
          const rawDate: string =
            bill.billDate || bill.finalizedAt || bill.createdAt || new Date().toISOString();
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) setInvoiceDate(d.toISOString().slice(0, 10));
        } catch {
          setInvoiceDate(new Date().toISOString().slice(0, 10));
        }
      } catch (err) {
        console.error("Error loading bill for edit", err);
      }
    })();
  }, [editKey]);

  function addLine(it: Item) {
  setLines((prev) => {
    // Match same item (id + variant) so variants remain separate if you use them
    const v = (it.variant ?? "").trim();
    const ix = prev.findIndex(
      (l) => l.itemId === it.id && ((l.variant ?? "").trim() === v)
    );

    if (ix === -1) {
      // create new line
      return [
        ...prev,
        {
          itemId: it.id,
          name: it.name,
          variant: it.variant,
          qty: 1,
          rate: it.price,
          amount: it.price,
        },
      ];
    }

    // increase qty on existing line
    const next = prev.slice();
    const line = next[ix];
    const nextQty = Math.max(1, Number(line.qty || 1) + 1);
    const rate = Number(line.rate || it.price || 0);

    next[ix] = {
      ...line,
      qty: nextQty,
      rate,
      amount: rate * nextQty,
    };

    return next;
  });

  // recent items stays same
  setRecentItemIds((prev) => {
    const next = [it.id, ...prev.filter((id) => id !== it.id)].slice(0, 8);
    try {
      localStorage.setItem("bb.recentItems", JSON.stringify(next));
    } catch {}
    return next;
  });
}


  function onQty(ix: number, q: number) {
    setLines((p) => p.map((l, i) => (i === ix ? { ...l, qty: q, amount: l.rate * q } : l)));
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
    [recentItemIds, items],
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
    [lines, discount, gstRate, interState],
  );

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.rate * l.qty, 0), [lines]);

  const discountTooHigh =
    discount.flat + subtotal * (discount.pct / 100) > subtotal + 0.001;

  const splitSum = (split.cash || 0) + (split.card || 0) + (split.upi || 0);
  const splitMismatch =
    paymentMode === "SPLIT" && Math.round(splitSum) !== Math.round(totals.grandTotal);

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
    billDate: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
        {/* LEFT COLUMN: Date -> Customer -> Items -> Discount/Tax/Notes */}
        <div className="space-y-4">
          {/* Invoice date (top-left) */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Invoice date
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  Choose the invoice date before saving/finalizing.
                </p>
              </div>
              <div className="min-w-[180px]">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* Customer details */}
          <section className="">
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

          {/* Items */}
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Items
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
  Type to search items (/ or Ctrl/⌘K). Use ↑/↓ + Enter. Adjust qty in the table.
</p>

              </div>
              <div className="text-[11px] text-muted">
                Subtotal:{" "}
                <span className="font-semibold text-foreground">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <ItemPicker
                items={items}
                onPick={addLine}
                onClear={clearLines}
                recentItems={recentItems}
                onClearRecent={clearRecentItems}
              />
            </div>

            <LineItemsTable lines={lines} onQty={onQty} onRemove={onRemove} />
          </section>

          {/* Discount + Tax + Notes */}
          <section>
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

        {/* RIGHT COLUMN: keep as it is */}
        <div className="space-y-4">
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
                  <span className="font-semibold">(₹{totals.grandTotal.toFixed(2)})</span>.
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