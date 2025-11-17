"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Item } from "@/types/billing";

type Draft = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  taxRate?: number; // 0..1 (e.g. 0.18)
  active: boolean;
};

export default function MenuPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    id: "",
    name: "",
    variant: "",
    price: 0,
    taxRate: undefined,
    active: true,
  });

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/items?all=1", { cache: "no-store" });
      const j = await r.json();
      setItems((j.items || []) as Item[]);
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(
    () => (activeOnly ? items.filter((i) => i.active) : items),
    [items, activeOnly]
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      active: items.filter((i) => i.active).length,
      inactive: items.filter((i) => !i.active).length,
    }),
    [items]
  );

  function startNew() {
    setDraft({
      id: "",
      name: "",
      variant: "",
      price: 0,
      taxRate: undefined,
      active: true,
    });
  }

  function startEdit(it: Item) {
    setDraft({
      id: it.id,
      name: it.name,
      variant: it.variant,
      price: it.price,
      taxRate: it.taxRate,
      active: it.active,
    });
  }

  async function save() {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    // update local list
    setItems((prev) => {
      const ix = prev.findIndex((i) => i.id === draft.id);
      const obj = { ...(draft as any) } as Item;
      if (ix > -1) {
        const next = prev.slice();
        next[ix] = obj;
        return next;
      }
      return [...prev, obj];
    });
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
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/items/${encodeURIComponent(it.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    if (draft.id === it.id) startNew();
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Manage Menu
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Create and maintain services/items that can be billed. Updates
            reflect in billing and the public QR menu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/menu/public"
            target="_blank"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background"
          >
            Public menu
          </Link>
          <Link
            href="/tools/qr"
            target="_blank"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background"
          >
            QR generator
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Total items
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {counts.all}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-600">
            Active
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {counts.active}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-amber-600">
            Inactive
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {counts.inactive}
          </div>
        </div>
      </section>

      {/* List + filters */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted sm:text-sm">
            {counts.all} items, {counts.active} active
          </div>

          {/* Filter pills */}
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
                  <th className="py-2 pr-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((it) => (
                    <tr
                      key={it.id}
                      className={`border-b border-border/60 text-xs sm:text-sm ${
                        !it.active ? "opacity-60" : ""
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
                          onClick={() => startEdit(it)}
                          className="mr-2 inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-card"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(it)}
                          className="inline-flex items-center rounded-full border border-danger/40 bg-danger/5 px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10"
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

        <div className="mt-4">
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-card"
          >
            + Add item
          </button>
        </div>
      </section>

      {/* Editor */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              {draft.id ? "Edit item" : "Add item"}
            </h2>
            <p className="mt-1 text-[11px] text-muted sm:text-xs">
              ID and name are required. GST is optional; leave blank for
              non-taxed services.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              ID
            </label>
            <input
              value={draft.id}
              onChange={(e) => setDraft({ ...draft, id: e.target.value })}
              className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="unique-id"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Name
            </label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Service name"
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
              placeholder="e.g. 90 min"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Price (₹)
            </label>
            <input
              type="number"
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
                draft.taxRate != null ? Math.round(draft.taxRate * 100) : 0
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
          <label className="mt-5 flex items-center gap-2 text-xs font-medium text-foreground md:mt-7">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) =>
                setDraft({ ...draft, active: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-primary"
            />
            Active
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={save}
            className="inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            {items.find((i) => i.id === draft.id) ? "Update" : "Create"}
          </button>
        </div>
      </section>
    </div>
  );
}