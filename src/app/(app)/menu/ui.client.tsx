"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  active: boolean;
  taxRate?: number;
};

export default function ManageMenuClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/items", { cache: "no-store" });
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing({ id: "", name: "", variant: "", price: 0, active: true });
  }
  function startEdit(it: Item) {
    setEditing({ ...it });
  }
  function cancel() {
    setEditing(null);
  }

  async function save() {
    if (!editing) return;
    if (!editing.id || !editing.name) {
      setMsg("ID and name are required");
      setTimeout(() => setMsg(null), 1200);
      return;
    }
    await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editing),
    });
    setMsg("Saved");
    setTimeout(() => setMsg(null), 900);
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  const activeCount = useMemo(
    () => items.filter((i) => i.active).length,
    [items]
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Manage Menu
      </h1>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <a
          className="inline-flex items-center rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background"
          href="/menu/public"
          target="_blank"
        >
          Public menu
        </a>
        <a
          className="inline-flex items-center rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-background"
          href="/tools/qr"
          target="_blank"
        >
          QR generator
        </a>
      </div>

      {/* Items list */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        {loading ? (
          <div className="py-6 text-sm text-muted">Loading…</div>
        ) : (
          <>
            <div className="mb-3 text-xs text-muted sm:text-sm">
              {items.length} items ({activeCount} active)
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2 pr-2 font-medium">ID</th>
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
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-b border-border/60 text-xs sm:text-sm"
                    >
                      <td className="py-2 pr-2 font-mono text-[11px]">
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
                        {it.taxRate ? Math.round(it.taxRate * 100) : "-"}
                      </td>
                      <td className="py-2 pr-2">
                        {it.active ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Yes
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-muted">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          className="mr-2 inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-card"
                          onClick={() => startEdit(it)}
                        >
                          Edit
                        </button>
                        <button
                          className="inline-flex items-center rounded-full border border-danger/40 bg-danger/5 px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10"
                          onClick={() => remove(it.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-6 text-center text-xs text-muted"
                      >
                        No items yet. Use “Add item” to create your first
                        service.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <button
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-card"
                onClick={startNew}
              >
                + Add item
              </button>
            </div>
          </>
        )}
      </div>

      {/* Editor sheet */}
      {editing && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground sm:text-base">
            {items.some((i) => i.id === editing.id) ? "Edit item" : "New item"}
          </h2>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                ID
              </label>
              <input
                value={editing.id}
                onChange={(e) =>
                  setEditing({ ...editing, id: e.target.value })
                }
                className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={items.some((i) => i.id === editing.id)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                Name
              </label>
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                Variant (optional)
              </label>
              <input
                value={editing.variant || ""}
                onChange={(e) =>
                  setEditing({ ...editing, variant: e.target.value })
                }
                className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                Price (₹)
              </label>
              <input
                type="number"
                min={0}
                value={editing.price}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    price: Number(e.target.value || 0),
                  })
                }
                className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
                GST % (optional)
              </label>
              <input
                type="number"
                min={0}
                value={editing.taxRate ? editing.taxRate * 100 : 0}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    taxRate:
                      Math.max(0, Number(e.target.value || 0)) / 100,
                  })
                }
                className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <label className="mt-5 flex items-center gap-2 text-xs font-medium text-foreground md:mt-7">
              <input
                type="checkbox"
                checked={!!editing.active}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary"
              />
              Active
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
              onClick={save}
            >
              Save
            </button>
            <button
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card"
              onClick={cancel}
            >
              Cancel
            </button>
            {msg && (
              <div className="text-xs text-muted sm:text-sm">{msg}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}