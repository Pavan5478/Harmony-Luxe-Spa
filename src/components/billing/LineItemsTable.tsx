"use client";

import type { BillLine } from "@/types/billing";
import { inr } from "@/lib/format";

export default function LineItemsTable({
  lines,
  onQty,
  onRemove,
}: {
  lines: BillLine[];
  onQty: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
}) {
  if (!lines.length) {
    return (
      <p className="mt-3 text-xs text-muted sm:text-sm">
        No items yet. Use the selector above to add services to this
        bill.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-background">
      <table className="min-w-full text-left text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border/70 bg-background/80 text-[11px] uppercase tracking-wide text-muted">
            <th className="py-2 pl-3 pr-2 font-medium">Item</th>
            <th className="py-2 px-2 font-medium">Qty</th>
            <th className="py-2 px-2 font-medium">Rate</th>
            <th className="py-2 px-2 font-medium">Amount</th>
            <th className="py-2 pr-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, ix) => (
            <tr
              key={ix}
              className="border-b border-border/60 bg-card/40"
            >
              <td className="py-2 pl-3 pr-2">
                {l.name}
                {l.variant ? (
                  <span className="text-muted"> • {l.variant}</span>
                ) : null}
              </td>
              <td className="px-2">
                <input
                  type="number"
                  min={1}
                  value={l.qty}
                  onChange={(e) =>
                    onQty(
                      ix,
                      Math.max(1, Number(e.target.value || 1))
                    )
                  }
                  className="w-20 rounded-full border border-border bg-background px-2 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </td>
              <td className="px-2 whitespace-nowrap">
                {inr(l.rate)}
              </td>
              <td className="px-2 whitespace-nowrap">
                {inr(l.rate * l.qty)}
              </td>
              <td className="pr-3 text-right">
                <button
                  type="button"
                  className="text-xs font-medium text-danger hover:underline"
                  onClick={() => onRemove(ix)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}