"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Item } from "@/types/billing";
import { useDebouncedValue } from "@/components/menu/shared/useDebouncedValue";
import { formatINR, taxPct } from "@/components/menu/shared/menuFormat";

type Draft = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  taxRate?: number; // 0..1
  active: boolean;
};

type Filter = "all" | "active" | "inactive";

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  variant: "",
  price: 0,
  taxRate: undefined,
  active: true,
};

export default function MenuAdminClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 120);

  const [toast, setToast] = useState<string | null>(null);

  // editor state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/items?all=1", {
          cache: "no-store",
          signal: ctrl.signal,
        });
        const j = await r.json();
        setItems((j.items || []) as Item[]);
      } catch {
        // ignore aborts
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  const counts = useMemo(() => {
    const active = items.filter((i) => i.active).length;
    return {
      all: items.length,
      active,
      inactive: items.length - active,
    };
  }, [items]);

  const visible = useMemo(() => {
    let list = items;

    if (filter === "active") list = list.filter((i) => i.active);
    if (filter === "inactive") list = list.filter((i) => !i.active);

    const term = debouncedQuery.trim().toLowerCase();
    if (term) {
      list = list.filter((i) => {
        const hay = `${i.id} ${i.name} ${i.variant ?? ""}`.toLowerCase();
        return hay.includes(term);
      });
    }

    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filter, debouncedQuery]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setOpen(true);
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
    setOpen(true);
  }

  function closeEditor() {
    setOpen(false);
  }

  const editingExisting = useMemo(
    () => items.some((i) => i.id === draft.id),
    [items, draft.id]
  );

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

      setOpen(false);
      setDraft(EMPTY_DRAFT);
      showToast(editingExisting ? "Updated" : "Created");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(it: Item, nextActive: boolean) {
    // optimistic update + rollback
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, active: nextActive } : x)));

    try {
      const patch = { ...it, active: nextActive };
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(nextActive ? "Activated" : "Deactivated");
    } catch {
      setItems(prev);
      showToast("Failed");
    }
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
    if (draft.id === it.id) setDraft(EMPTY_DRAFT);
    showToast("Deleted");
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Menu
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Manage services &amp; prices
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Mobile friendly admin. Public menu loads server-side for fast QR scans.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="inline-flex flex-wrap gap-2">
              <Link
                href="/menu/public"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-card"
              >
                View customer menu
              </Link>
              <Link
                href="/tools/qr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-card"
              >
                QR generator
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span>
                Total <span className="font-semibold text-foreground">{counts.all}</span>
              </span>
              <span className="mx-1 h-3 w-px bg-border" />
              <span>
                Active <span className="font-semibold text-foreground">{counts.active}</span>
              </span>
              <span className="mx-1 h-3 w-px bg-border" />
              <span>
                Inactive <span className="font-semibold text-foreground">{counts.inactive}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky toolbar */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted sm:text-sm">
            {loading ? "Loading…" : `${visible.length} visible`}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Search name / ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-w-[160px] rounded-full border border-border bg-background px-3.5 py-2 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-64"
            />

            <div className="inline-flex rounded-full bg-background p-0.5 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-full px-2.5 py-1 transition ${
                  filter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted"
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilter("active")}
                className={`rounded-full px-2.5 py-1 transition ${
                  filter === "active" ? "bg-card text-foreground shadow-sm" : "text-muted"
                }`}
              >
                Active ({counts.active})
              </button>
              <button
                type="button"
                onClick={() => setFilter("inactive")}
                className={`rounded-full px-2.5 py-1 transition ${
                  filter === "inactive" ? "bg-card text-foreground shadow-sm" : "text-muted"
                }`}
              >
                Inactive ({counts.inactive})
              </button>
            </div>

            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black shadow-sm hover:bg-primary/90"
            >
              + Add item
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden sm:block">
          {loading ? (
            <div className="py-8 text-sm text-muted">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2 pl-3 pr-2 font-medium">ID</th>
                    <th className="py-2 pr-2 font-medium">Name</th>
                    <th className="py-2 pr-2 font-medium">Variant</th>
                    <th className="py-2 pr-2 font-medium">Price</th>
                    <th className="py-2 pr-2 font-medium">GST</th>
                    <th className="py-2 pr-2 font-medium">Active</th>
                    <th className="py-2 pr-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((it) => (
                    <tr
                      key={it.id}
                      className={`border-b border-border/60 ${!it.active ? "opacity-50" : ""}`}
                    >
                      <td className="py-2 pl-3 pr-2 font-mono text-[11px]">{it.id}</td>
                      <td className="py-2 pr-2">{it.name}</td>
                      <td className="py-2 pr-2">{it.variant ? it.variant : "-"}</td>
                      <td className="py-2 pr-2">{formatINR(it.price)}</td>
                      <td className="py-2 pr-2">{it.taxRate != null ? `${taxPct(it.taxRate)}%` : "-"}</td>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={!!it.active}
                          onChange={(e) => toggleActive(it, e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary"
                          aria-label={`Toggle active for ${it.name}`}
                        />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(it)}
                          className="mr-2 inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium hover:bg-card"
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
                      <td colSpan={7} className="py-10 text-center text-xs text-muted">
                        No items match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="mt-4 space-y-2 sm:hidden">
          {loading ? (
            <div className="py-8 text-sm text-muted">Loading…</div>
          ) : (
            <>
              {visible.map((it) => (
                <div
                  key={it.id}
                  className={`rounded-2xl border border-border bg-background px-4 py-3 shadow-sm ${
                    !it.active ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{it.name}</div>
                      {it.variant ? (
                        <div className="mt-0.5 truncate text-xs text-muted">{it.variant}</div>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span className="font-mono">{it.id}</span>
                        {it.taxRate != null ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                            GST {taxPct(it.taxRate)}%
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">{formatINR(it.price)}</div>
                      <label className="mt-2 inline-flex items-center gap-2 text-xs">
                        <span className="text-muted">Active</span>
                        <input
                          type="checkbox"
                          checked={!!it.active}
                          onChange={(e) => toggleActive(it, e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(it)}
                      className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-background"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(it)}
                      className="flex-1 rounded-full border border-danger/40 bg-danger/5 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {!visible.length ? (
                <div className="py-10 text-center text-xs text-muted">No items match.</div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={openNew}
        className="fixed bottom-4 right-4 z-30 inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black shadow-md sm:hidden"
      >
        + Add
      </button>

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-4 left-4 z-40 rounded-full border border-border bg-card px-4 py-2 text-xs shadow-md">
          {toast}
        </div>
      ) : null}

      {/* Editor modal */}
      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 px-3 py-4"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {editingExisting ? "Edit menu item" : "Add menu item"}
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Keep IDs stable (used in billing + public categories). Price is per person.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-sm text-muted hover:bg-card"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                  ID
                </label>
                <input
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="e.g. massage-thai-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                  Name
                </label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Thai Massage"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                  Variant (optional)
                </label>
                <input
                  value={draft.variant || ""}
                  onChange={(e) => setDraft({ ...draft, variant: e.target.value })}
                  className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="60 min / Couple / Deluxe room"
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
                      setDraft({ ...draft, price: Number(e.target.value || 0) })
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
                    value={draft.taxRate != null ? Math.round(draft.taxRate * 100) : 0}
                    onChange={(e) => {
                      const pct = Math.max(0, Number(e.target.value || 0));
                      setDraft({ ...draft, taxRate: pct ? pct / 100 : undefined });
                    }}
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <label className="mt-1 flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Active (show in billing &amp; public menu)
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : editingExisting ? "Update item" : "Create item"}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-card"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}