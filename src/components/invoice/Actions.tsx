"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Status = "DRAFT" | "FINAL" | "VOID";

type Props = {
  idOrNo: string;
  printedAt: string | null;
  status: Status;
  autoPrint?: boolean;
};

type Loading = null | "PRINT" | "FINALIZE" | "EDIT";

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

function safe(p: Promise<any>) {
  p.catch((e) => console.error(e));
}

export default function InvoiceActions({ idOrNo, printedAt, status, autoPrint }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Loading>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const autoOnce = useRef(false);

  const isDraft = status === "DRAFT";
  const isFinal = status === "FINAL";
  const isVoid = status === "VOID";
  const busy = loading !== null;

  function markPrintedOnServer(key: string) {
    return fetch(`/api/bills/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markPrinted: true }),
      cache: "no-store",
      keepalive: true,
    });
  }

  function doPrint(title: string, after?: () => void) {
    const prev = document.title;
    document.title = title;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.title = prev;
      after?.();
    };

    window.addEventListener("afterprint", finish, { once: true });
    window.setTimeout(finish, 60_000);
    window.print();
  }

  async function handlePrint() {
    if (busy || isVoid) return;

    setLoading("PRINT");
    setMsg("Opening print…");

    // Create a safe filename for the PDF by replacing any characters that are not
    // alphanumeric, dash, underscore or dot. Browsers use the document.title
    // to suggest a filename when printing to PDF.
    const safeId = idOrNo.replace(/[^a-zA-Z0-9\-_\.]+/g, "-");
    const title = `Invoice-${safeId}`;

    const after = () => {
      if (!printedAt) safe(markPrintedOnServer(idOrNo));
      safe(
        Promise.resolve()
          .then(() => router.refresh())
          .finally(() => {
            setLoading(null);
            setMsg(null);
          })
      );
    };

    requestAnimationFrame(() => doPrint(title, after));
  }

  function handleEditDraft() {
    if (!isDraft || busy) return;
    setLoading("EDIT");
    setMsg("Opening draft…");
    router.push(`/billing?edit=${encodeURIComponent(idOrNo)}`);
  }

  async function handlePrintAndFinalize() {
    if (!isDraft || busy) return;

    setLoading("FINALIZE");
    setMsg("Finalizing…");

    try {
      const email = localStorage.getItem("bb.email") || "cashier@harmoneyluxe.com";

      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cashierEmail: email }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const billNo: string = data?.bill?.billNo || data?.bill?.id || idOrNo;

      // Create a safe filename for the PDF by replacing any characters that are not
      // alphanumeric, dash, underscore or dot. Use the finalized bill number (or id)
      // as part of the document title so the exported PDF is meaningful.
      const safeBillNo = String(billNo).replace(/[^a-zA-Z0-9\-_\.]+/g, "-");
      const title = `Invoice-${safeBillNo}`;
      const after = () => {
        safe(markPrintedOnServer(billNo));
        router.replace(`/invoices/${encodeURIComponent(billNo)}?from=billing`);
        safe(
          Promise.resolve()
            .then(() => router.refresh())
            .finally(() => {
              setLoading(null);
              setMsg(null);
            })
        );
      };

      setMsg("Opening print…");
      requestAnimationFrame(() => doPrint(title, after));
    } catch (e) {
      console.error(e);
      alert("Failed to finalize this invoice. Please try again.");
      setLoading(null);
      setMsg(null);
    }
  }

  useEffect(() => {
    if (!autoPrint || !isFinal || autoOnce.current) return;
    autoOnce.current = true;
    handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, isFinal]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <>
            <button
              type="button"
              onClick={handleEditDraft}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-card disabled:opacity-60"
            >
              {loading === "EDIT" ? <Spinner className="text-muted" /> : null}
              {loading === "EDIT" ? "Opening…" : "Edit draft"}
            </button>

            <button
              type="button"
              onClick={handlePrintAndFinalize}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading === "FINALIZE" ? <Spinner /> : null}
              {loading === "FINALIZE" ? "Finalizing…" : "Print & finalize"}
            </button>
          </>
        ) : isVoid ? (
          <div className="text-xs text-muted">This invoice is void.</div>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePrint}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading === "PRINT" ? <Spinner /> : null}
              {loading === "PRINT" ? "Preparing…" : "Print"}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={busy}
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-card disabled:opacity-60"
            >
              Save as PDF
            </button>
          </>
        )}
      </div>

      {msg ? <div className="text-[11px] text-muted">{msg}</div> : null}
    </div>
  );
}