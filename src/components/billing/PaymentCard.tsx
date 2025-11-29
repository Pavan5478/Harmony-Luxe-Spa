// src/components/billing/PaymentCard.tsx
"use client";

type Split = { cash?: number; card?: number; upi?: number };

export default function PaymentCard({
  mode,
  onMode,
  split,
  onSplit,
  expectedTotal,
}: {
  mode: "CASH" | "CARD" | "UPI" | "SPLIT";
  onMode: (m: any) => void;
  split: Split;
  onSplit: (s: Split) => void;
  expectedTotal: number;
}) {
  const sum =
    (split.cash || 0) + (split.card || 0) + (split.upi || 0);
  const mismatch =
    mode === "SPLIT" &&
    Math.round(sum) !== Math.round(expectedTotal);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
        Payment
      </h2>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(["CASH", "CARD", "UPI", "SPLIT"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            className={`rounded-full border px-3 py-1.5 ${
              mode === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted hover:bg-card"
            }`}
          >
            {m === "SPLIT" ? "Split" : m.charAt(0) + m.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {mode === "SPLIT" && (
        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="number"
              min={0}
              placeholder="Cash ₹"
              value={split.cash || ""}
              onChange={(e) =>
                onSplit({
                  ...split,
                  cash: Number(e.target.value || 0),
                })
              }
              className="rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              type="number"
              min={0}
              placeholder="Card ₹"
              value={split.card || ""}
              onChange={(e) =>
                onSplit({
                  ...split,
                  card: Number(e.target.value || 0),
                })
              }
              className="rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              type="number"
              min={0}
              placeholder="UPI ₹"
              value={split.upi || ""}
              onChange={(e) =>
                onSplit({
                  ...split,
                  upi: Number(e.target.value || 0),
                })
              }
              className="rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <p className="text-[11px] text-muted">
            Split total: <span className="font-medium">₹{sum.toFixed(2)}</span>{" "}
            / Expected:{" "}
            <span className="font-medium">
              ₹{expectedTotal.toFixed(2)}
            </span>
          </p>
        </div>
      )}

      {mismatch && (
        <p className="mt-2 text-[11px] text-danger">
          Split total must equal grand total. Please adjust the
          amounts.
        </p>
      )}
    </section>
  );
}