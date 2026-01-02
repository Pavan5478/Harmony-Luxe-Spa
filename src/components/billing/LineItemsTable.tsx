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
        No items yet. Use the selector above or the recent buttons to add services.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      {/* Keep table layout, but make it responsive:
          - scroll only if absolutely needed (small screens)
          - avoid desktop cropping by using fixed widths + truncation rules
      */}
      <div className="w-full overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[720px] table-fixed text-left text-xs sm:min-w-0 sm:text-sm">
          {/* column sizing (stable on desktop + predictable on mobile) */}
          <colgroup>
            <col className="w-[42%] sm:w-auto" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[140px]" />
            <col className="w-[90px]" />
          </colgroup>

          <thead>
            <tr className="border-b border-border/70 bg-background/80 text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 pl-3 pr-2 font-medium">Item</th>
              <th className="py-2 px-2 text-center font-medium">Qty</th>
              <th className="py-2 px-2 text-right font-medium">Rate</th>
              <th className="py-2 px-2 text-right font-medium">Amount</th>
              <th className="py-2 pr-3 text-right font-medium" />
            </tr>
          </thead>

          <tbody>
            {lines.map((l, ix) => (
              <tr key={ix} className="border-b border-border/60 bg-card/40 align-top">
                {/* ITEM */}
                <td className="py-3 pl-3 pr-2">
                  <div className="min-w-0">
                    {/* Wrap nicely (no vertical letter stacking) */}
                    <div
                      className="whitespace-normal break-words text-sm font-semibold leading-snug text-foreground"
                      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                      title={l.name}
                    >
                      {l.name}
                    </div>
                    {l.variant ? (
                      <div
                        className="mt-0.5 whitespace-normal break-words text-[11px] text-muted"
                        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                        title={l.variant}
                      >
                        {l.variant}
                      </div>
                    ) : null}
                  </div>
                </td>

                {/* QTY (keep your input style but better alignment) */}
                <td className="px-2 py-3">
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      onQty(ix, Math.max(1, Number(e.target.value || 1)))
                    }
                    className="mx-auto block w-20 rounded-full border border-border bg-background px-2 py-1.5 text-center text-sm font-semibold tabular-nums shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </td>

                {/* RATE */}
                <td className="px-2 py-3 text-right">
                  <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                    {inr(l.rate)}
                  </span>
                </td>

                {/* AMOUNT */}
                <td className="px-2 py-3 text-right">
                  <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                    {inr(l.rate * l.qty)}
                  </span>
                </td>

                {/* REMOVE */}
                <td className="py-3 pr-3 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border border-danger/40 bg-danger/5 px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10"
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

      {/* tiny hint only on mobile if scroll happens */}
      <div className="px-3 py-2 text-[11px] text-muted sm:hidden">
        Swipe left/right if needed.
      </div>
    </div>
  );
}
