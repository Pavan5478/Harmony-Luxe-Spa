"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Item } from "@/types/billing";

type Draft = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  taxRate?: number; // 0..1 (e.g. 0.05)
  active: boolean;
};

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    id: "",
    name: "",
    variant: "",
    price: 0,
    taxRate: undefined,
    active: true,
  });

  /* ───────────────────────────────────
     Load menu items (admin view)
     ─────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/items?all=1", { cache: "no-store" });
      const j = await r.json();
      setItems((j.items || []) as Item[]);
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((i) => i.active).length,
      inactive: items.filter((i) => !i.active).length,
    }),
    [items]
  );

  const searchLower = query.trim().toLowerCase();
  const visible = useMemo(() => {
    let list = activeOnly ? items.filter((i) => i.active) : items;

    if (searchLower) {
      list = list.filter((i) => {
        const hay = `${i.id} ${i.name} ${i.variant ?? ""}`.toLowerCase();
        return hay.includes(searchLower);
      });
    }

    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [items, activeOnly, searchLower]);

  /* ───────────────────────────────────
     Editor helpers (modal)
     ─────────────────────────────────── */
  function resetDraft() {
    setDraft({
      id: "",
      name: "",
      variant: "",
      price: 0,
      taxRate: undefined,
      active: true,
    });
  }

  function openNew() {
    resetDraft();
    setIsEditorOpen(true);
  }

  function openEdit(it: Item) {
    setDraft({
      id: it.id,
      name: it.name,
      variant: it.variant,
      price: it.price,
      taxRate: it.taxRate,
      active: it.active,
    });
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
  }

  const editingExisting = items.some((i) => i.id === draft.id);

  async function save() {
    if (!draft.id.trim() || !draft.name.trim()) {
      alert("ID and Name are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        alert(await res.text());
        return;
      }

      const obj = { ...(draft as any) } as Item;

      setItems((prev) => {
        const ix = prev.findIndex((i) => i.id === draft.id);
        if (ix > -1) {
          const next = prev.slice();
          next[ix] = obj;
          return next;
        }
        return [...prev, obj];
      });

      // close after successful save
      setIsEditorOpen(false);
      resetDraft();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(it: Item, nextActive: boolean) {
    const patch: Draft = { ...it, active: nextActive } as any;
    await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    setItems((prev) =>
      prev.map((x) => (x.id === it.id ? { ...x, active: nextActive } : x))
    );
  }

  async function remove(it: Item) {
    if (!confirm("Delete this item from the menu?")) return;
    const res = await fetch(`/api/items/${encodeURIComponent(it.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    if (draft.id === it.id) resetDraft();
  }

  /* ───────────────────────────────────
     UI
     ─────────────────────────────────── */
  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header / hero */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Menu
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Manage services &amp; prices
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              This controls both billing and the customer QR menu. Once you
              start billing, try not to change item IDs – edit name / price
              instead.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 text-[11px] sm:items-end">
            <div className="inline-flex gap-2">
              <Link
                href="/menu/public"
                target="_blank"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-card"
              >
                View customer menu
              </Link>
              <Link
                href="/tools/qr"
                target="_blank"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-card"
              >
                QR generator
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span>
                Total{" "}
                <span className="font-semibold text-foreground">
                  {counts.all}
                </span>
              </span>
              <span className="mx-1 h-3 w-px bg-border" />
              <span className="text-emerald-300">
                Active{" "}
                <span className="font-semibold text-foreground">
                  {counts.active}
                </span>
              </span>
              <span className="mx-1 h-3 w-px bg-border" />
              <span className="text-amber-200">
                Inactive{" "}
                <span className="font-semibold text-foreground">
                  {counts.inactive}
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* List + filters */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted sm:text-sm">
            {loading
              ? "Loading menu from Sheets…"
              : `${counts.all} items, ${counts.active} active`}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* search */}
            <input
              placeholder="Search by name or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-w-[160px] rounded-full border border-border bg-background px-3.5 py-2 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-56"
            />

            {/* filter pills */}
            <div className="inline-flex rounded-full bg-background p-0.5 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setActiveOnly(false)}
                className={`rounded-full px-2.5 py-1 transition ${
                  !activeOnly
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted"
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveOnly(true)}
                className={`rounded-full px-2.5 py-1 transition ${
                  activeOnly
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted"
                }`}
              >
                Active only ({counts.active})
              </button>
            </div>

            {/* main CTA: add item */}
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-primary/90"
            >
              + Add item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-6 text-sm text-muted">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pl-3 pr-2 font-medium">ID</th>
                  <th className="py-2 pr-2 font-medium">Name</th>
                  <th className="py-2 pr-2 font-medium">Variant</th>
                  <th className="py-2 pr-2 font-medium">Price</th>
                  <th className="py-2 pr-2 font-medium">GST %</th>
                  <th className="py-2 pr-2 font-medium">Active</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((it) => (
                  <tr
                    key={it.id}
                    className={`border-b border-border/60 text-xs sm:text-sm ${
                      !it.active ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-2 pl-3 pr-2 font-mono text-[11px]">
                      {it.id}
                    </td>
                    <td className="py-2 pr-2">{it.name}</td>
                    <td className="py-2 pr-2">
                      {it.variant ? it.variant : "-"}
                    </td>
                    <td className="py-2 pr-2">
                      ₹{Number(it.price).toFixed(2)}
                    </td>
                    <td className="py-2 pr-2">
                      {it.taxRate != null
                        ? Math.round(it.taxRate * 100)
                        : "-"}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={!!it.active}
                        onChange={(e) =>
                          toggleActive(it, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(it)}
                        className="mr-2 inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground hover:bg-card"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(it)}
                        className="inline-flex items-center rounded-full border border-danger/40 bg-danger/5 px-3 py-1 text-[11px] font-medium text-danger hover:bg-danger/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!visible.length && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-xs text-muted"
                    >
                      No items match this filter yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Floating add button for mobile (optional) */}
      <button
        type="button"
        onClick={openNew}
        className="fixed bottom-4 right-4 z-30 inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black shadow-card hover:bg-primary/90 sm:hidden"
      >
        + Add item
      </button>

      {/* ─────────────────────
          MODAL EDITOR
         ───────────────────── */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
          onClick={closeEditor}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  {editingExisting ? "Edit menu item" : "Add menu item"}
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  ID &amp; Name are required. ID is used for grouping in the
                  customer menu (e.g.{" "}
                  <span className="font-mono">massage-thai-60</span>). Price is
                  per person. GST is the tax percent, leave as 0 if not
                  applicable.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs text-muted hover:bg-card"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                  ID
                  <span className="ml-1 text-[10px] font-normal text-muted">
                    (no spaces, used in Sheets)
                  </span>
                </label>
                <input
                  value={draft.id}
                  onChange={(e) =>
                    setDraft({ ...draft, id: e.target.value })
                  }
                  className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="e.g. aroma-normal-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                  Name
                </label>
                <input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({ ...draft, name: e.target.value })
                  }
                  className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Aromatherapy Massage – Normal room"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                  Variant (optional)
                </label>
                <input
                  value={draft.variant || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, variant: e.target.value })
                  }
                  className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="e.g. 60 min, Couple, Queen room"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.price}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        price: Number(e.target.value || 0),
                      })
                    }
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                    GST %
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={
                      draft.taxRate != null
                        ? Math.round(draft.taxRate * 100)
                        : 0
                    }
                    onChange={(e) => {
                      const pct = Math.max(0, Number(e.target.value || 0));
                      setDraft({
                        ...draft,
                        taxRate: pct ? pct / 100 : undefined,
                      });
                    }}
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <label className="mt-1 flex items-center gap-2 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) =>
                    setDraft({ ...draft, active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Active – show in billing &amp; customer menu
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editingExisting
                  ? "Update item"
                  : "Create item"}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card"
              >
                Cancel
              </button>
            </div>

            <p className="mt-3 text-[11px] text-muted">
              Example for menu grouping: use IDs like{" "}
              <span className="font-mono">massage-thai-60</span> and{" "}
              <span className="font-mono">massage-aroma-60</span>. In the
              customer QR menu they will appear under a single{" "}
              <span className="font-semibold">Massage</span> section.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}