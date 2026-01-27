"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M9 3h6m-8 4h10m-1 0-1 14H9L8 7m3 3v8m2-8v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function DeleteButton({ idOrNo }: { idOrNo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function doDelete() {
    if (busy) return;
    setBusy(true);
    setErr(null);

    try {
      // Your API: DELETE -> voidBill + moveInvoiceToDeleted
      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      setOpen(false);
      router.refresh(); // server component list will reload
    } catch (e) {
      console.error("Delete failed", e);
      setErr("Delete failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 font-medium text-danger hover:bg-danger/15"
        title="Delete (void) invoice"
      >
        <TrashIcon />
        Delete
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close delete dialog"
            onClick={() => (busy ? null : setOpen(false))}
          />

          {/* Modal */}
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="text-sm font-semibold text-foreground">Delete invoice?</div>

            <div className="mt-1 text-xs text-muted">
              This will mark invoice <span className="font-semibold text-foreground">{idOrNo}</span>{" "}
              as <span className="font-semibold text-foreground">VOID</span> and move it to the{" "}
              <span className="font-semibold text-foreground">Deleted</span> sheet.
            </div>

            {err ? (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {err}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-card disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={doDelete}
                className="inline-flex items-center gap-2 rounded-full bg-danger px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {busy ? <Spinner /> : null}
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}