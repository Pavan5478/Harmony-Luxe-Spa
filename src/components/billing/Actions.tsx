// src/components/billing/Actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BillStatus = "DRAFT" | "FINAL" | "VOID";

type Props = {
  payload: any;
  disabled?: boolean;
  /** If present, we are editing an existing bill (draft or final) */
  editKey?: string;
  /** Control whether the Save / Update button is shown */
  showSave?: boolean;
  /** Original status of the bill when we opened the page */
  initialStatus?: BillStatus;
};

export default function BillingActions({
  payload,
  disabled,
  editKey,
  showSave = true,
  initialStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] =
    useState<null | "SAVE" | "FINAL" | "PREVIEW">(null);

  const isEditing = !!editKey;
  const isEditingDraft =
    isEditing && (initialStatus === "DRAFT" || !initialStatus);
  const isEditingFinal = isEditing && initialStatus === "FINAL";

  const saving = loading === "SAVE";
  const finalizing = loading === "FINAL";
  const previewing = loading === "PREVIEW";

  // ─────────────────────────────────────────────
  // Helper: create or update a bill with latest payload
  // Returns the bill's "id" (draft id like D1, D2…)
  // ─────────────────────────────────────────────
  async function persistBill(idOrNo?: string | null): Promise<string> {
    // Update existing (draft or final)
    if (idOrNo) {
      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json().catch(() => ({}));
      // Server always keeps original id / billNo / status
      return (data.bill?.id as string | undefined) || idOrNo;
    }

    // Create new draft
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json(); // { id, bill }
    return data.id as string;
  }

  // ------------- Save / update draft or final -------------
  async function handleSave() {
    if (disabled || saving || finalizing || previewing) return;
    setLoading("SAVE");
    try {
      const id = await persistBill(editKey);

      // After first save, switch to edit mode (with ?edit=D1)
      router.replace(`/billing?edit=${encodeURIComponent(id)}`);
      router.refresh();
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // ------------- Preview invoice (draft only) -------------
  async function handlePreview() {
    if (disabled || saving || finalizing || previewing) return;

    // For FINAL invoices we just go to view screen, no draft preview
    if (isEditingFinal && editKey) {
      router.push(`/invoices/${encodeURIComponent(editKey)}`);
      return;
    }

    setLoading("PREVIEW");
    try {
      const id = await persistBill(editKey);
      // Open draft invoice view (status = DRAFT)
      router.push(`/invoices/${encodeURIComponent(id)}`);
    } catch (e) {
      console.error("Preview failed", e);
      alert("Failed to open preview. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // ------------- Finalize draft → invoice -------------
  async function handleFinalize() {
    if (disabled || saving || finalizing || previewing) return;

    // If already a FINAL invoice, just go to view page
    if (isEditingFinal && editKey) {
      router.push(`/invoices/${encodeURIComponent(editKey)}`);
      return;
    }

    setLoading("FINAL");
    try {
      // 1) make sure latest changes are stored in a draft
      const draftId = await persistBill(editKey);

      // 2) finalize the draft in backend (DRAFT -> FINAL + BillNo)
      const email =
        typeof window !== "undefined"
          ? localStorage.getItem("bb.email") || "cashier@example.com"
          : "cashier@example.com";

      const resFin = await fetch(
        `/api/bills/${encodeURIComponent(draftId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cashierEmail: email }),
        }
      );
      if (!resFin.ok) throw new Error(await resFin.text());

      const dataFin = await resFin.json();
      const billNo: string =
        dataFin?.bill?.billNo || dataFin?.bill?.id;

      // 3) Go to invoice view (same row in Sheets is now FINAL)
      router.replace(`/invoices/${encodeURIComponent(billNo)}`);
    } catch (e) {
      console.error("Finalize failed", e);
      alert("Failed to finalize invoice. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // ───────────────── labels ─────────────────
  const saveLabel = (() => {
    if (!isEditing) return saving ? "Saving draft..." : "Save draft";
    if (isEditingFinal)
      return saving ? "Saving changes..." : "Update invoice";
    return saving ? "Updating draft..." : "Update draft";
  })();

  const finalLabel = (() => {
    if (isEditingFinal) return "View invoice";
    if (!isEditing)
      return finalizing ? "Generating invoice..." : "Generate invoice";
    return finalizing ? "Finalizing..." : "Finalize invoice";
  })();

  const canPreviewButton = !isEditingFinal; // no preview button for FINAL

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Save / Update button (can be hidden for some flows) */}
        {showSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || saving || finalizing || previewing}
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-60"
          >
            {saveLabel}
          </button>
        )}

        {/* Preview invoice (drafts only) */}
        {canPreviewButton && (
          <button
            type="button"
            onClick={handlePreview}
            disabled={disabled || saving || finalizing || previewing}
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-60"
          >
            {previewing ? "Opening preview..." : "Preview invoice"}
          </button>
        )}

        {/* Finalize / View invoice */}
        <button
          type="button"
          onClick={handleFinalize}
          disabled={disabled || finalizing || previewing}
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {finalLabel}
        </button>
      </div>

      <p className="text-[11px] text-muted">
        Draft bills are stored in Google Sheets with status{" "}
        <span className="font-semibold">DRAFT</span>. You can use{" "}
        <span className="font-semibold">Preview invoice</span> to see
        the tax invoice layout before finalizing. When you click{" "}
        <span className="font-semibold">Finalize / Generate invoice</span>, the
        same row is updated to{" "}
        <span className="font-semibold">FINAL</span> with a bill number,
        and it starts appearing in the Invoices list and Reports.
      </p>
    </div>
  );
}