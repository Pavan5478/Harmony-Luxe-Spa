"use client";

import { useState } from "react";

type Item = { id: string; name: string; variant?: string; price: number };

type Props = {
  items: Item[];
  onPick: (it: Item) => void;
  onClear: () => void;
  recentItems?: Item[];
  onClearRecent?: () => void;
};

export default function ItemPicker({
  items,
  onPick,
  onClear,
  recentItems = [],
  onClearRecent,
}: Props) {
  const [showShortcuts, setShowShortcuts] = useState(
    () => (recentItems?.length ?? 0) > 0
  );

  return (
    <div className="space-y-2">
      {/* RECENT header row */}
      {recentItems.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-muted">
          <button
            type="button"
            onClick={() => setShowShortcuts((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-background"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-medium uppercase tracking-[0.16em]">
              Recent
            </span>
            <span className="text-[10px]">
              {showShortcuts ? "Hide shortcuts" : "Show shortcuts"}
            </span>
          </button>

          {onClearRecent && (
            <button
              type="button"
              onClick={onClearRecent}
              className="text-[10px] text-muted hover:text-foreground"
            >
              Clear recent
            </button>
          )}
        </div>
      )}

      {/* Recent shortcut pills */}
      {recentItems.length > 0 && showShortcuts && (
        <div className="flex flex-wrap gap-1.5">
          {recentItems.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onPick(it)}
              className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground hover:bg-card"
            >
              <span className="max-w-[220px] truncate">
                {it.name}
                {it.variant ? ` • ${it.variant}` : ""}
              </span>
              <span className="ml-2 text-[10px] text-muted">
                ₹{it.price.toFixed(0)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Selector + Clear all */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          className="w-full max-w-xl rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onChange={(e) => {
            const it = items.find((x) => x.id === e.target.value);
            if (it) onPick(it);
            e.currentTarget.value = "";
          }}
          defaultValue=""
        >
          <option value="">+ Add line item…</option>
          {items.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name}
              {it.variant ? ` • ${it.variant}` : ""} — ₹{it.price}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-card"
          onClick={onClear}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}