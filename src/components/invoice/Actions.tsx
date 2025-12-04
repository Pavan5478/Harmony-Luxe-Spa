// src/components/invoice/Actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Status = "DRAFT" | "FINAL" | "VOID";

type Props = {
  idOrNo: string; // billNo for FINAL, draft id for DRAFT
  printedAt: string | null;
  status: Status;
  /** if true and status is FINAL, auto-open print dialog once */
  autoPrint?: boolean;
};

export default function InvoiceActions({
  idOrNo,
  printedAt,
  status,
  autoPrint,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "PRINT" | "FINALIZE">(null);
  const hasAutoPrinted = useRef(false);

  const isDraft = status === "DRAFT";
  const isFinal = status === "FINAL";
  const isVoid = status === "VOID";

  const printing = loading === "PRINT";
  const finalizing = loading === "FINALIZE";

  function printWithTitle(title: string) {
    if (typeof window === "undefined") return;
    const prev = document.title;
    document.title = title;
    window.print();
    // restore after dialog opens
    setTimeout(() => {
      document.title = prev;
    }, 500);
  }

  async function markPrintedOnServer(key: string) {
    try {
      await fetch(`/api/bills/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markPrinted: true }),
      });
    } catch (e) {
      console.error("Failed to mark printed", e);
    }
  }

  async function handlePrint() {
    if (printing || finalizing) return;
    setLoading("PRINT");
    try {
      if (!printedAt) {
        await markPrintedOnServer(idOrNo);
      }
      printWithTitle(`Invoice-${idOrNo}`);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handlePrintAndFinalize() {
    if (!isDraft || printing || finalizing) return;
    setLoading("FINALIZE");
    try {
      const email =
        typeof window !== "undefined"
          ? localStorage.getItem("bb.email") || "cashier@example.com"
          : "cashier@example.com";

      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cashierEmail: email }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const billNo: string =
        data?.bill?.billNo || data?.bill?.id || idOrNo;

      // mark printed using final key
      await markPrintedOnServer(billNo);

      printWithTitle(`Invoice-${billNo}`);

      router.replace(`/invoices/${encodeURIComponent(billNo)}`);
      router.refresh();
    } catch (e) {
      console.error("Print & finalize failed", e);
      alert("Failed to finalize this invoice. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  // 🔄 auto-print when opened with ?print=1 and already FINAL
  useEffect(() => {
    if (!autoPrint || !isFinal || hasAutoPrinted.current) return;
    hasAutoPrinted.current = true;
    // fire-and-forget
    handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, isFinal]);

  const hasPrintedOnce = !!printedAt;

  return (
    <div className="flex flex-col items-center gap-1 text-[11px] sm:items-start sm:text-xs">
      {/* First line: buttons – centered on mobile, left on desktop */}
      <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-start">
        {isDraft && (
          <a
            href={`/billing?edit=${encodeURIComponent(idOrNo)}`}
            className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-[11px] font-medium text-amber-100 hover:bg-amber-400/20"
          >
            Edit draft
          </a>
        )}

        {isDraft ? (
          <button
            type="button"
            onClick={handlePrintAndFinalize}
            disabled={printing || finalizing}
            className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {finalizing ? "Finalizing…" : "Print & finalize"}
          </button>
        ) : (
          !isVoid && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing}
                className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {printing ? "Preparing…" : "Print"}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing}
                className="inline-flex items-center rounded-full border border-slate-500/60 bg-slate-800/40 px-3 py-1.5 text-[11px] font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-60"
              >
                Save as PDF
              </button>
            </>
          )
        )}
      </div>

      {/* Second line: helper text – centered on mobile, left on desktop */}
      {!isDraft && (
        <p className="max-w-xs text-center text-[10px] text-slate-300 sm:text-left">
          {hasPrintedOnce
            ? `First printed at ${new Date(printedAt!).toLocaleString()}.`
            : "This invoice will be marked as printed the first time you use Print or Save as PDF."}
        </p>
      )}
      {isDraft && (
        <p className="max-w-xs text-center text-[10px] text-slate-300 sm:text-left">
          This is a draft. Use{" "}
          <span className="font-semibold">Print &amp; finalize</span> to assign
          a bill number and lock the invoice.
        </p>
      )}
    </div>
  );
}