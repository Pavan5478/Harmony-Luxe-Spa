"use client";

type Item = { id: string; name: string; variant?: string; price: number };

export default function ItemPicker({
  items,
  onPick,
  onClear,
}: {
  items: Item[];
  onPick: (it: Item) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        className="w-full max-w-xl rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onChange={(e) => {
          const it = items.find((x) => x.id === e.target.value);
          if (it) onPick(it);
          e.currentTarget.value = "";
        }}
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
  );
}