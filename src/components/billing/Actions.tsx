// src/components/billing/Actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import type { BillDraft, BillLine, CustomerDraft, PaymentMode, PaymentSplit } from "@/types/billing";

type BillStatus = "DRAFT" | "FINAL" | "VOID";

type BillingPayload = {
  cashierEmail?: string;
  customer?: CustomerDraft;
  lines: BillLine[];
  discountFlat?: number;
  discountPct?: number;
  gstRate?: number;
  isInterState?: boolean;
  paymentMode?: PaymentMode;
  split?: PaymentSplit;
  notes?: string;
  totals: BillDraft["totals"];
  billDate?: string;
};

type PersistResponse = {
  id?: string;
  bill?: { id?: string; billNo?: string };
};

type Props = {
  payload: BillingPayload;
  disabled?: boolean;
  /** If present, we are editing an existing bill (draft or final) */
  editKey?: string;
  /** Control whether the Save / Update button is shown */
  showSave?: boolean;
  /** Original status of the bill when we opened the page */
  initialStatus?: BillStatus;
};

type LoadState = null | "SAVE" | "FINAL" | "PREVIEW";
type BannerTone = "info" | "success" | "error";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" fill="currentColor" />
    </svg>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 5c5.5 0 9.8 4.2 11 7-1.2 2.8-5.5 7-11 7S2.2 14.8 1 12c1.2-2.8 5.5-7 11-7Zm0 2C7.9 7 4.4 10 3.2 12 4.4 14 7.9 17 12 17s7.6-3 8.8-5C19.6 10 16.1 7 12 7Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Zm0 2a.5.5 0 1 0 .5.5.5.5 0 0 0-.5-.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SaveIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4ZM7 5h8v4H7V5Zm5 14a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M18 6 6 18M6 6l12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BillingActions({
  payload,
  disabled,
  editKey,
  showSave = true,
  initialStatus,
}: Props) {
  const router = useRouter();
  const helpId = useId();

  const [loading, setLoading] = useState<LoadState>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<BannerTone>("info");

  const isEditing = !!editKey;
  const isEditingFinal = isEditing && initialStatus === "FINAL";

  const saving = loading === "SAVE";
  const finalizing = loading === "FINAL";
  const previewing = loading === "PREVIEW";

  const busy = loading !== null;
  const anyBlocked = !!disabled || busy;

  // auto-clear success/info banner after a bit (keeps errors visible)
  useEffect(() => {
    if (!statusMessage) return;
    if (tone === "error") return;
    const t = window.setTimeout(() => setStatusMessage(null), 2500);
    return () => window.clearTimeout(t);
  }, [statusMessage, tone]);

  const bannerClasses = useMemo(() => {
    if (!statusMessage) return "";
    if (tone === "success") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    if (tone === "error") return "border-danger/30 bg-danger/10 text-danger";
    return "border-border/70 bg-background/60 text-muted";
  }, [statusMessage, tone]);

  function setBanner(nextTone: BannerTone, msg: string) {
    setTone(nextTone);
    setStatusMessage(msg);
  }

  async function readJsonSafe(res: Response): Promise<PersistResponse> {
    try {
      return (await res.json()) as PersistResponse;
    } catch {
      return {};
    }
  }

  // Helper: create or update a bill with latest payload
  async function persistBill(idOrNo?: string | null): Promise<string> {
    if (idOrNo) {
      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await readJsonSafe(res);
      return (data.bill?.id as string | undefined) || idOrNo;
    }

    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await readJsonSafe(res);
    return data.id as string;
  }

  async function handleSave() {
    if (anyBlocked) return;

    setLoading("SAVE");
    setBanner("info", "Saving draft… syncing to Google Sheets.");

    try {
      const id = await persistBill(editKey);
      setBanner("success", "Draft saved.");
      router.replace(`/billing?edit=${encodeURIComponent(id)}`);
      router.refresh();
    } catch (e) {
      console.error("Save failed", e);
      setBanner("error", "Save failed. Check connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handlePreview() {
    if (anyBlocked) return;

    // If already FINAL, just open invoice
    if (isEditingFinal && editKey) {
      router.push(`/invoices/${encodeURIComponent(editKey)}`);
      return;
    }

    setLoading("PREVIEW");
    setBanner("info", "Opening preview…");

    try {
      const id = await persistBill(editKey);

      // Keep the edit link stable (so refresh/back keeps the same draft)
      router.replace(`/billing?edit=${encodeURIComponent(id)}`);

      // Open preview
      router.push(`/invoices/${encodeURIComponent(id)}?from=billing&edit=${encodeURIComponent(id)}`);
    } catch (e) {
      console.error("Preview failed", e);
      setBanner("error", "Preview failed. Check connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleFinalize() {
    if (anyBlocked) return;

    if (isEditingFinal && editKey) {
      router.push(`/invoices/${encodeURIComponent(editKey)}`);
      return;
    }

    setLoading("FINAL");
    setBanner("info", "Generating invoice… updating Google Sheets.");

    try {
      // Use cashierEmail from payload (single source of truth)
      const email = payload?.cashierEmail || "cashier@harmonyluxe.com";

      // ✅ Fast path: if this is a brand-new bill (no editKey), finalize in one API call
      if (!editKey) {
        const res = await fetch("/api/bills/finalize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ ...payload, cashierEmail: email }),
        });
        if (!res.ok) throw new Error(await res.text());

        const data = await readJsonSafe(res);
        const billNo = data?.bill?.billNo ?? data?.bill?.id;
        if (!billNo) throw new Error("Missing bill number");

        setBanner("success", "Invoice generated. Opening…");
        router.replace(`/invoices/${encodeURIComponent(billNo)}`);
        return;
      }

      // Existing draft: save latest payload, then finalize
      const draftId = await persistBill(editKey);

      const resFin = await fetch(`/api/bills/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ cashierEmail: email }),
      });
      if (!resFin.ok) throw new Error(await resFin.text());

      const dataFin = await readJsonSafe(resFin);
      const billNo: string = dataFin?.bill?.billNo || dataFin?.bill?.id || draftId;

      setBanner("success", "Invoice generated. Opening…");
      router.replace(`/invoices/${encodeURIComponent(billNo)}`);
    } catch (e) {
      console.error("Finalize failed", e);
      setBanner("error", "Finalize failed. Check connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  const saveLabel = (() => {
    if (!isEditing) return saving ? "Saving…" : "Save draft";
    if (isEditingFinal) return saving ? "Saving…" : "Update invoice";
    return saving ? "Updating…" : "Update draft";
  })();

  const finalLabel = (() => {
    if (isEditingFinal) return "View invoice";
    if (!isEditing) return finalizing ? "Generating…" : "Generate invoice";
    return finalizing ? "Finalizing…" : "Finalize invoice";
  })();

  const canPreviewButton = !isEditingFinal;

  return (
    <div className="space-y-3" aria-busy={busy}>
      <div
        role="group"
        aria-label="Billing actions"
        aria-describedby={helpId}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      >
        <button
          type="button"
          onClick={handleFinalize}
          disabled={anyBlocked}
          title={
            isEditingFinal
              ? "Open the existing invoice"
              : "Finalize the bill and generate tax invoice"
          }
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm",
            "transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:w-auto",
          ].join(" ")}
        >
          {finalizing ? <Spinner /> : <BoltIcon />}
          <span>{finalLabel}</span>
        </button>

        {showSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={anyBlocked}
            title={isEditing ? "Update the draft with latest changes" : "Save this bill as a draft"}
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground",
              "transition hover:bg-card active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
              "disabled:opacity-60 sm:w-auto",
            ].join(" ")}
          >
            {saving ? <Spinner className="text-muted" /> : <SaveIcon className="text-muted" />}
            <span>{saveLabel}</span>
          </button>
        )}

        {canPreviewButton && (
          <button
            type="button"
            onClick={handlePreview}
            disabled={anyBlocked}
            title="Open a preview of the tax invoice layout"
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground",
              "transition hover:bg-card active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
              "disabled:opacity-60 sm:w-auto",
            ].join(" ")}
          >
            {previewing ? <Spinner className="text-muted" /> : <EyeIcon className="text-muted" />}
            <span>{previewing ? "Opening…" : "Preview invoice"}</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p id={helpId} className="text-[11px] leading-relaxed text-muted">
          Draft bills are stored in Google Sheets with status{" "}
          <span className="font-semibold">DRAFT</span>. Use{" "}
          <span className="font-semibold">Preview invoice</span> to check layout.
          When you{" "}
          <span className="font-semibold">Finalize / Generate invoice</span>, the
          same row becomes <span className="font-semibold">FINAL</span> with a bill
          number and starts appearing in Invoices &amp; Reports.
        </p>

        {statusMessage && (
          <div
            role={tone === "error" ? "alert" : "status"}
            aria-live={tone === "error" ? "assertive" : "polite"}
            className={[
              "flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-[11px] leading-relaxed",
              bannerClasses,
            ].join(" ")}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-[2px] inline-flex h-4 w-4 items-center justify-center">
                {tone === "error" ? (
                  <span aria-hidden className="text-danger">!</span>
                ) : tone === "success" ? (
                  <span aria-hidden className="text-emerald-200">✓</span>
                ) : busy ? (
                  <Spinner className="text-muted" />
                ) : (
                  <span aria-hidden className="text-muted">•</span>
                )}
              </span>

              <div className="min-w-0">
                <div className="font-medium text-foreground/90">{statusMessage}</div>
                {busy && (
                  <div className="mt-0.5 text-[10px] text-muted">
                    Please don’t refresh while this is running.
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted hover:bg-card hover:text-foreground"
              aria-label="Dismiss message"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
