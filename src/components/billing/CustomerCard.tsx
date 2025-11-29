// src/components/billing/CustomerCard.tsx
"use client";

import type { CustomerDraft } from "@/types/billing";

type Props = {
  value: CustomerDraft;
  onChange: (v: CustomerDraft) => void;
};

export default function CustomerCard({ value, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
        Customer (optional)
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="text"
          placeholder="Name"
          value={value.name ?? ""}
          onChange={(e) =>
            onChange({ ...value, name: e.target.value })
          }
          className="rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={value.phone ?? ""}
          onChange={(e) =>
            onChange({ ...value, phone: e.target.value })
          }
          className="rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <input
          type="email"
          placeholder="Email"
          value={value.email ?? ""}
          onChange={(e) =>
            onChange({ ...value, email: e.target.value })
          }
          className="rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Leave blank for walk-in customers. These details appear on the
        invoice.
      </p>
    </section>
  );
}