// src/components/expenses/ExpensesClient.tsx
"use client";

import { useMemo, useState } from "react";
import type { Expense } from "@/types/expenses";
import { inr } from "@/lib/format";

type Props = {
  initialExpenses: Expense[];
};

const CATEGORIES = [
  "All",
  "Rent",
  "Staff",
  "Products",
  "Utilities",
  "Marketing",
  "Misc",
];

const MODES = ["CASH", "CARD", "UPI", "BANK", "OTHER"] as const;

export default function ExpensesClient({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    [...initialExpenses].sort(
      (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
    )
  );

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState("Misc");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMode, setFormMode] = useState("CASH");
  const [formNotes, setFormNotes] = useState("");

  function resetForm(ex?: Expense | null) {
    if (!ex) {
      const today = new Date().toISOString().slice(0, 10);
      setFormDate(today);
      setFormCategory("Misc");
      setFormDesc("");
      setFormAmount("");
      setFormMode("CASH");
      setFormNotes("");
      setEditing(null);
    } else {
      setFormDate(ex.dateISO.slice(0, 10));
      setFormCategory(ex.category || "Misc");
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

  const filtered = useMemo(() => {
    const f = from ? new Date(from) : null;
    const t = to ? new Date(to) : null;
    if (t) t.setDate(t.getDate() + 1);

    const q = search.toLowerCase();

    return expenses.filter((e) => {
      const d = new Date(e.dateISO);
      if (f && d < f) return false;
      if (t && d >= t) return false;

      if (category !== "All" && e.category !== category) return false;

      if (q) {
        const hay =
          (e.description || "").toLowerCase() +
          " " +
          (e.notes || "").toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [expenses, from, to, category, search]);

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  async function handleSave() {
    if (!formDate || !formAmount) return;

    setBusy(true);
    try {
      const payload = {
        dateISO: new Date(formDate + "T00:00:00").toISOString(),
        category: formCategory || "Misc",
        description: formDesc,
        amount: Number(formAmount),
        paymentMode: formMode as Expense["paymentMode"],
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
            Track outgoing money by date, category, and payment mode.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          + Add expense
        </button>
      </header>

      {/* Filters + summary */}
      <section className="mb-4 grid gap-3 rounded-2xl border border-border bg-card px-3 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:px-4 sm:py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col text-[11px]">
            <span className="mb-1 text-muted">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            />
          </div>
          <div className="flex flex-col text-[11px]">
            <span className="mb-1 text-muted">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            />
          </div>
          <div className="flex flex-col text-[11px]">
            <span className="mb-1 text-muted">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px] flex-1">
            <span className="mb-1 block text-[11px] text-muted">
              Search
            </span>
            <input
              placeholder="Description / notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-1 text-right text-[11px] text-muted">
          <div>
            Total in view:{" "}
            <span className="text-sm font-semibold text-foreground">
              {inr(totalAmount)}
            </span>
          </div>
          <div>
            Entries:{" "}
            <span className="font-medium text-foreground">
              {filtered.length}
            </span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
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
                    <td className="py-2 pr-2 align-top">{e.category}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[95%] max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {editing ? "Edit expense" : "Add expense"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 rounded-full bg-background text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[11px]">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-muted">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-muted">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-muted">Description</label>
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Massage oil stock, November rent"
                  className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-muted">Amount</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-muted">Payment mode</label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-muted">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSave}
                className="rounded-full bg-primary px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
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