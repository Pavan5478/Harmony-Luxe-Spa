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

function safeFireAndForget(p: Promise<any>) {
  p.catch((e) => console.error(e));
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function collectHeadStylesHtml() {
  if (typeof document === "undefined") return "";
  const nodes = Array.from(
    document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
      'link[rel="stylesheet"], style'
    )
  );
  return nodes.map((n) => n.outerHTML).join("\n");
}

function startIframePrint(opts: {
  title: string;
  selector: string; // e.g. ".invoice-print"
  onAfterPrint?: () => void;
}): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const node = document.querySelector(opts.selector) as HTMLElement | null;
  if (!node) return false;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const w = iframe.contentWindow;
  const d = iframe.contentDocument;
  if (!w || !d) {
    document.body.removeChild(iframe);
    return false;
  }

  const headStyles = collectHeadStylesHtml();
  const printOverrides = `
    @media print {
      @page { size: A4; margin: 8mm 10mm 12mm 10mm; }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: economy;
        print-color-adjust: economy;
      }

      /* speed: remove expensive effects */
      * {
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        animation: none !important;
        transition: none !important;
      }

      .no-print { display: none !important; }

      .invoice-print {
        box-shadow: none !important;
        border-radius: 0 !important;
        max-width: none !important;
        width: 100% !important;
        padding: 0 !important;
      }
    }
  `;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
  ${headStyles}
  <style>${printOverrides}</style>
</head>
<body>
  ${node.outerHTML}
</body>
</html>`;

  d.open();
  d.write(html);
  d.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch {}
  };

  const after = () => {
    cleanup();
    opts.onAfterPrint?.();
  };

  // afterprint should fire when dialog closes
  w.addEventListener("afterprint", after, { once: true });

  // safety fallback: if afterprint doesn’t fire
  window.setTimeout(() => {
    if (!cleaned) after();
  }, 60_000);

  // kick print quickly (don’t wait for all resources)
  window.setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      after();
    }
  }, 80);

  return true;
}

export default function InvoiceActions({ idOrNo, printedAt, status, autoPrint }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Loading>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const hasAutoPrinted = useRef(false);

  const isDraft = status === "DRAFT";
  const isFinal = status === "FINAL";
  const isVoid = status === "VOID";

  const printing = loading === "PRINT";
  const finalizing = loading === "FINALIZE";
  const editing = loading === "EDIT";
  const busy = printing || finalizing || editing;

  function markPrintedOnServer(key: string) {
    return fetch(`/api/bills/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markPrinted: true }),
      cache: "no-store",
      keepalive: true,
    });
  }

  function printSameWindow(title: string, onAfter?: () => void) {
    const prev = document.title;
    document.title = title;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.title = prev;
      onAfter?.();
    };

    window.addEventListener("afterprint", finish, { once: true });
    window.setTimeout(() => finish(), 60_000); // fallback

    window.print();
  }

  async function handlePrint() {
    if (busy) return;

    setLoading("PRINT");
    setStatusMessage("Preparing print…");

    const title = `Invoice-${idOrNo}`;

    const onAfter = () => {
      // ✅ Important: do NOT refresh during print preview.
      // Only do server update + refresh after print dialog closes.
      if (!printedAt) {
        safeFireAndForget(markPrintedOnServer(idOrNo));
      }
      safeFireAndForget(
        Promise.resolve()
          .then(() => router.refresh())
          .finally(() => {
            setLoading(null);
            setStatusMessage(null);
          })
      );
    };

    // ✅ Fastest: print only invoice area via iframe
    const ok = startIframePrint({
      title,
      selector: ".invoice-print",
      onAfterPrint: onAfter,
    });

    // fallback if iframe print fails
    if (!ok) {
      setStatusMessage("Opening print…");
      printSameWindow(title, onAfter);
    }
  }

  async function handleEditDraft() {
    if (!isDraft || busy) return;
    setLoading("EDIT");
    setStatusMessage("Opening draft…");
    router.push(`/billing?edit=${encodeURIComponent(idOrNo)}`);
    setLoading(null);
    setStatusMessage(null);
  }

  async function handlePrintAndFinalize() {
    if (!isDraft || busy) return;

    setLoading("FINALIZE");
    setStatusMessage("Finalizing… updating Google Sheets.");

    try {
      const email =
        typeof window !== "undefined"
          ? localStorage.getItem("bb.email") || "cashier@example.com"
          : "cashier@example.com";

      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cashierEmail: email }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const billNo: string = data?.bill?.billNo || data?.bill?.id || idOrNo;

      // Print using billNo title, and mark printed AFTER print closes
      const title = `Invoice-${billNo}`;
      const after = () => {
        safeFireAndForget(markPrintedOnServer(billNo));
        router.replace(`/invoices/${encodeURIComponent(billNo)}?from=billing`);
        router.refresh();
        setLoading(null);
        setStatusMessage(null);
      };

      setStatusMessage("Preparing print…");

      const ok = startIframePrint({
        title,
        selector: ".invoice-print",
        onAfterPrint: after,
      });

      if (!ok) {
        setStatusMessage("Opening print…");
        printSameWindow(title, after);
      }
    } catch (e) {
      console.error("Print & finalize failed", e);
      alert("Failed to finalize this invoice. Please try again.");
      setLoading(null);
      setStatusMessage(null);
    }
  }

  // auto-print: keep same-window print (most compatible)
  useEffect(() => {
    if (!autoPrint || !isFinal || hasAutoPrinted.current) return;
    hasAutoPrinted.current = true;
    // This will still be slower than iframe print in some browsers,
    // but avoids popup/gesture restrictions.
    handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, isFinal]);

  const hasPrintedOnce = !!printedAt;

  return (
    <div className="flex flex-col items-center gap-1 text-[11px] sm:items-start sm:text-xs">
      <div
        role="group"
        aria-label="Invoice actions"
        aria-busy={busy}
        className="flex flex-wrap items-center justify-center gap-1 sm:justify-start"
      >
        {isDraft && (
          <button
            type="button"
            onClick={handleEditDraft}
            disabled={busy}
            className={[
              "inline-flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-[11px] font-medium text-amber-100",
              "transition hover:bg-amber-400/20 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60",
              "disabled:opacity-60",
            ].join(" ")}
          >
            {editing ? <Spinner className="text-amber-100/80" /> : null}
            <span>{editing ? "Opening…" : "Edit draft"}</span>
          </button>
        )}

        {isDraft ? (
          <button
            type="button"
            onClick={handlePrintAndFinalize}
            disabled={busy}
            className={[
              "inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm",
              "transition hover:bg-primary/90 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
              "disabled:opacity-60",
            ].join(" ")}
          >
            {finalizing ? <Spinner /> : null}
            <span>{finalizing ? "Finalizing…" : "Print & finalize"}</span>
          </button>
        ) : (
          !isVoid && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                disabled={busy}
                className={[
                  "inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm",
                  "transition hover:bg-primary/90 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                  "disabled:opacity-60",
                ].join(" ")}
              >
                {printing ? <Spinner /> : null}
                <span>{printing ? "Preparing…" : "Print"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={busy}
                className={[
                  "inline-flex items-center rounded-full border border-slate-500/60 bg-slate-800/40 px-3 py-1.5 text-[11px] font-medium text-slate-50",
                  "transition hover:bg-slate-700 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/40",
                  "disabled:opacity-60",
                ].join(" ")}
              >
                Save as PDF
              </button>
            </>
          )
        )}
      </div>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mt-0.5 flex max-w-xs items-center gap-2 text-center text-[10px] text-slate-300 sm:text-left"
        >
          <Spinner className="text-slate-300/70" />
          <span className="min-w-0">{statusMessage}</span>
        </div>
      )}

      {!isDraft && !statusMessage && (
        <p className="max-w-xs text-center text-[10px] text-slate-300 sm:text-left">
          {hasPrintedOnce
            ? `First printed at ${new Date(printedAt!).toLocaleString()}.`
            : "This invoice will be marked as printed after you close the Print / Save as PDF dialog."}
        </p>
      )}

      {isDraft && !statusMessage && (
        <p className="max-w-xs text-center text-[10px] text-slate-300 sm:text-left">
          This is a draft. Use{" "}
          <span className="font-semibold">Print &amp; finalize</span> to assign a
          bill number and lock the invoice.
        </p>
      )}
    </div>
  );
}