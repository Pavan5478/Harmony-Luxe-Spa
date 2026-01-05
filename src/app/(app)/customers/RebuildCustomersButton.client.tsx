"use client";

import { useState } from "react";

export default function RebuildCustomersButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setMsg(null);
    const ok = window.confirm(
      "Rebuild Customers index from all invoices?\n\nUse this after enabling the Customers feature, or if totals seem off."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const r = await fetch("/api/customers/rebuild", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed");
      setMsg("Rebuild completed");
      // refresh current page so server component re-fetches
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-card disabled:opacity-60"
      >
        {busy ? "Rebuilding…" : "Rebuild index"}
      </button>
      {msg ? <div className="text-[11px] text-muted">{msg}</div> : null}
    </div>
  );
}
