// src/components/expenses/ExpensesClient.tsx
"use client";

import { useMemo, useState } from "react";
import type { Expense } from "@/types/expenses";
import { inr } from "@/lib/format";

type Props = {
  initialExpenses: Expense[];
};

// Base categories you commonly use
const BASE_CATEGORIES = [
  "Rent",
  "Staff",
  "Products",
  "Utilities",
  "Marketing",
  "Misc",
] as const;

// Filter dropdown: All + base + Other (for custom categories)
const FILTER_CATEGORIES = [
  "All",
  ...BASE_CATEGORIES,
  "Other",
] as const;

const PAYMENT_MODES: Expense["paymentMode"][] = [
  "CASH",
  "CARD",
  "UPI",
  "BANK",
  "OTHER",
];

export default function ExpensesClient({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    [...initialExpenses].sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    )
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<(typeof FILTER_CATEGORIES)[number]>("All");
  const [modeFilter, setModeFilter] = useState<"All" | Expense["paymentMode"]>(
    "All"
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState<string>("Misc");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMode, setFormMode] = useState<Expense["paymentMode"]>("CASH");
  const [formNotes, setFormNotes] = useState("");

  function resetForm(ex?: Expense | null) {
    if (!ex) {
      const today = new Date().toISOString().slice(0, 10);
      setFormDate(today);
      setFormCategory("Misc");
      setFormCustomCategory("");
      setFormDesc("");
      setFormAmount("");
      setFormMode("CASH");
      setFormNotes("");
      setEditing(null);
    } else {
      setFormDate(ex.dateISO.slice(0, 10));

      const cat = ex.category || "Misc";
      if (BASE_CATEGORIES.includes(cat as (typeof BASE_CATEGORIES)[number])) {
        setFormCategory(cat);
        setFormCustomCategory("");
      } else {
        // custom category
        setFormCategory("__CUSTOM__");
        setFormCustomCategory(cat);
      }

      setFormDesc(ex.description || "");
      setFormAmount(String(ex.amount || ""));
      setFormMode(ex.paymentMode || "CASH");
      setFormNotes(ex.notes || "");
      setEditing(ex);
    }
  }

  function openNew() {
    resetForm(null);
    setModalOpen(true);
  }

  function openEdit(ex: Expense) {
    resetForm(ex);
    setModalOpen(true);
  }

  // FILTERED LIST
  const filtered = useMemo(() => {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    if (t) t.setDate(t.getDate() + 1);

    const q = search.toLowerCase();

    return expenses.filter((e) => {
      const d = new Date(e.dateISO);
      if (f && d < f) return false;
      if (t && d >= t) return false;

      if (categoryFilter !== "All") {
        const eCat = e.category || "";
        if (categoryFilter === "Other") {
          // show categories that are NOT in the base list
          if (
            BASE_CATEGORIES.includes(
              eCat as (typeof BASE_CATEGORIES)[number]
            )
          ) {
            return false;
          }
        } else if (eCat !== categoryFilter) {
          return false;
        }
      }

      if (modeFilter !== "All" && e.paymentMode !== modeFilter) {
        return false;
      }

      if (q) {
        const hay =
          (e.description || "").toLowerCase() +
          " " +
          (e.notes || "").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [expenses, from, to, categoryFilter, modeFilter, search]);

  // SUMMARY NUMBERS
  const {
    totalAmount,
    avgPerDay,
    thisMonthTotal,
    topCategoryName,
    topCategoryAmount,
  } = useMemo(() => {
    const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

    let avg = 0;
    if (filtered.length > 0) {
      let min = new Date(filtered[0].dateISO).getTime();
      let max = min;
      for (const e of filtered) {
        const ts = new Date(e.dateISO).getTime();
        if (ts < min) min = ts;
        if (ts > max) max = ts;
      }
      const days = Math.max(
        1,
        Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1
      );
      avg = total / days;
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    let monthTotal = 0;

    const byCategory = new Map<string, number>();

    for (const e of expenses) {
      const d = new Date(e.dateISO);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
        monthTotal += e.amount || 0;
      }
      const key = e.category || "Uncategorized";
      byCategory.set(key, (byCategory.get(key) || 0) + (e.amount || 0));
    }

    let topName = "";
    let topAmt = 0;
    for (const [name, amt] of byCategory) {
      if (amt > topAmt) {
        topAmt = amt;
        topName = name;
      }
    }

    return {
      totalAmount: total,
      avgPerDay: avg,
      thisMonthTotal: monthTotal,
      topCategoryName: topName,
      topCategoryAmount: topAmt,
    };
  }, [filtered, expenses]);

  // EXPORT HREF (you can change the API path as needed)
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (categoryFilter !== "All") params.append("category", categoryFilter);
    if (modeFilter !== "All") params.append("mode", modeFilter);
    if (search) params.append("q", search);

    const qs = params.toString();
    return qs ? `/api/expenses/export?${qs}` : "/api/expenses/export";
  }, [from, to, categoryFilter, modeFilter, search]);

  // SAVE / DELETE
  async function handleSave() {
    if (!formDate || !formAmount) return;

    setBusy(true);
    try {
      const resolvedCategory =
        formCategory === "__CUSTOM__"
          ? (formCustomCategory.trim() || "Misc")
          : formCategory || "Misc";

      const payload = {
        dateISO: new Date(formDate + "T00:00:00").toISOString(),
        category: resolvedCategory,
        description: formDesc,
        amount: Number(formAmount),
        paymentMode: formMode,
        notes: formNotes,
      };

      let saved: Expense;

      if (editing) {
        const res = await fetch(
          `/api/expenses/${encodeURIComponent(editing.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          console.error(await res.text());
          return;
        }
        const j = await res.json();
        saved = j.expense as Expense;
        setExpenses((prev) =>
          [...prev.filter((p) => p.id !== saved.id), saved].sort(
            (a, b) =>
              new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
          )
        );
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error(await res.text());
          return;
        }
        const j = await res.json();
        saved = j.expense as Expense;
        setExpenses((prev) =>
          [saved, ...prev].sort(
            (a, b) =>
              new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
          )
        );
      }

      setModalOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setCategoryFilter("All");
    setModeFilter("All");
    setSearch("");
  }

  // QUICK RANGE HELPERS
  function setRangeAllTime() {
    setFrom("");
    setTo("");
  }
  function setRangeToday() {
    const today = new Date().toISOString().slice(0, 10);
    setFrom(today);
    setTo(today);
  }
  function setRangeLast7() {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 6); // 7 days inclusive
    setFrom(fromDate.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
  }
  function setRangeThisMonth() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }

  return (
    <>
      {/* Header */}
      <header className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Finance
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Expenses
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Track outgoing money by date, category, payment mode, and export
            clean reports.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          + Add expense
        </button>
      </header>

      {/* Filters + summary */}
      <section className="mb-4 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
        {/* Filters row */}
        <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(240px,1.3fr)] lg:items-end">
          {/* From */}
          <div className="space-y-1 text-[11px]">
            <label className="font-medium text-muted">From</label>
            <div className="relative">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background px-3 pr-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
                📅
              </span>
            </div>
          </div>

          {/* To */}
          <div className="space-y-1 text-[11px]">
            <label className="font-medium text-muted">To</label>
            <div className="relative">
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background px-3 pr-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
                📅
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1 text-[11px]">
            <label className="font-medium text-muted">Category</label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as (typeof FILTER_CATEGORIES)[number])
                }
                className="h-9 w-full rounded-full border border-border bg-background px-3 pr-8 text-xs outline-none appearance-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {FILTER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-muted">
                ▾
              </span>
            </div>
          </div>

          {/* Payment mode */}
          <div className="space-y-1 text-[11px]">
            <label className="font-medium text-muted">Payment mode</label>
            <div className="relative">
              <select
                value={modeFilter}
                onChange={(e) =>
                  setModeFilter(
                    e.target.value === "All"
                      ? "All"
                      : (e.target.value as Expense["paymentMode"])
                  )
                }
                className="h-9 w-full rounded-full border border-border bg-background px-3 pr-8 text-xs outline-none appearance-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="All">All</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-muted">
                ▾
              </span>
            </div>
          </div>

          {/* Search + summary actions */}
          <div className="flex flex-col gap-2 text-[11px] lg:items-end">
            <div className="space-y-1 w-full">
              <label className="font-medium text-muted">Search</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] text-muted">
                  🔍
                </span>
                <input
                  placeholder="Description or notes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-full border border-border bg-background pl-7 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1 lg:pt-0">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted hover:bg-card"
              >
                Clear filters
              </button>
              <a
                href={exportHref}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground hover:bg-card"
              >
                Export CSV
              </a>
            </div>
          </div>
        </div>

        {/* Quick range + summary chips */}
        <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          {/* Quick range */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-muted">
              Quick range:
            </span>
            <button
              type="button"
              onClick={setRangeAllTime}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] hover:bg-card"
            >
              All time
            </button>
            <button
              type="button"
              onClick={setRangeToday}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] hover:bg-card"
            >
              Today
            </button>
            <button
              type="button"
              onClick={setRangeLast7}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] hover:bg-card"
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={setRangeThisMonth}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] hover:bg-card"
            >
              This month
            </button>
          </div>

          {/* Summary numbers */}
          <div className="flex flex-wrap justify-end gap-3 text-right text-[11px] sm:text-xs">
            <span>
              Total in view:{" "}
              <span className="font-semibold text-foreground">
                {inr(totalAmount)}
              </span>
            </span>
            {filtered.length > 0 && (
              <span>
                Avg / day{" "}
                <span className="font-medium text-foreground">
                  {inr(avgPerDay)}
                </span>
              </span>
            )}
            <span>
              Entries{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>
            </span>
            <span>
              This month{" "}
              <span className="font-medium text-foreground">
                {inr(thisMonthTotal)}
              </span>
            </span>
            {topCategoryName && (
              <span>
                Top category:{" "}
                <span className="font-medium text-foreground">
                  {topCategoryName} ({inr(topCategoryAmount)})
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2 text-right">Amount</th>
                <th className="py-2 pr-2">Mode</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-[11px] text-muted"
                  >
                    No expenses found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-border text-xs text-foreground"
                  >
                    <td className="py-2 pr-2 align-top">
                      {new Date(e.dateISO).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {e.category || "Misc"}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <div className="max-w-xs truncate">{e.description}</div>
                      {e.notes && (
                        <div className="mt-0.5 max-w-xs truncate text-[11px] text-muted">
                          {e.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right align-top font-semibold">
                      {inr(e.amount)}
                    </td>
                    <td className="py-2 pr-2 align-top text-[11px] text-muted">
                      {e.paymentMode}
                    </td>
                    <td className="py-2 pr-2 text-right align-top">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="mr-2 text-[11px] text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        className="text-[11px] text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[96%] max-w-lg rounded-2xl border border-border bg-card px-4 py-4 shadow-xl sm:px-6 sm:py-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {editing ? "Edit expense" : "Add expense"}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Keep a clean record of every outgoing payment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 rounded-full bg-background text-sm text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[11px] sm:text-xs">
              {/* Date + category */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-1">
                  <label className="text-muted">Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-background px-3 pr-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
                      📅
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-muted">Category</label>
                  <div className="relative">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="h-9 w-full rounded-xl border border-border bg-background px-3 pr-8 text-xs outline-none appearance-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {BASE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__CUSTOM__">Custom category…</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-muted">
                      ▾
                    </span>
                  </div>
                  {formCategory === "__CUSTOM__" && (
                    <input
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="Type category name"
                      className="mt-2 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-muted">Description</label>
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Massage oil stock, November rent"
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Amount + mode */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-1">
                  <label className="text-muted">Amount</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-muted">Payment mode</label>
                  <div className="relative">
                    <select
                      value={formMode}
                      onChange={(e) =>
                        setFormMode(e.target.value as Expense["paymentMode"])
                      }
                      className="h-9 w-full rounded-xl border border-border bg-background px-3 pr-8 text-xs outline-none appearance-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-muted">
                      ▾
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-muted">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-muted hover:bg-card"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSave}
                className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {editing ? "Save changes" : "Add expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="pointer-events-none fixed bottom-3 right-3 rounded-full bg-card/95 px-3 py-1.5 text-[11px] text-muted shadow">
          Saving…
        </div>
      )}
    </>
  );
}