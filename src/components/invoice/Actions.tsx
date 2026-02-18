"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Status = "DRAFT" | "FINAL" | "VOID";

type Props = {
  idOrNo: string;
  printedAt: string | null;
  status: Status;
  canMutate?: boolean;
  autoPrint?: boolean;
  pdfFileName?: string;
};

type Loading = null | "PRINT" | "PDF" | "FINALIZE" | "EDIT";
type Tone = "info" | "success" | "error";

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

function safe(p: Promise<unknown>) {
  p.catch((e) => console.error(e));
}

function toSafeTitle(value: string) {
  const cleaned = String(value || "")
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9\-_\.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "Invoice";
}

export default function InvoiceActions({
  idOrNo,
  printedAt,
  status,
  canMutate = true,
  autoPrint,
  pdfFileName,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState<Loading>(null);
  const [tone, setTone] = useState<Tone>("info");
  const [msg, setMsg] = useState<string | null>(null);

  const autoOnce = useRef(false);

  const isDraft = status === "DRAFT";
  const isFinal = status === "FINAL";
  const isVoid = status === "VOID";
  const busy = loading !== null;

  const bannerCls = useMemo(() => {
    if (!msg) return "";
    if (tone === "error") return "border-danger/30 bg-danger/10 text-danger";
    if (tone === "success") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    return "border-border/60 bg-background/60 text-muted";
  }, [msg, tone]);

  async function markPrintedOnServer(key: string) {
    const res = await fetch(`/api/bills/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markPrinted: true }),
      cache: "no-store",
      keepalive: true,
    });
    if (!res.ok) throw new Error(await res.text());
    return res;
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

    // afterprint fires in most browsers, but not 100% reliably
    window.addEventListener("afterprint", finish, { once: true });

    // longer fallback: users may keep print dialog open
    window.setTimeout(finish, 180_000);

    window.print();
  }

  async function handlePrint(kind: "print" | "pdf" = "print") {
    if (busy || isVoid) return;

    setLoading(kind === "pdf" ? "PDF" : "PRINT");
    setTone("info");
    setMsg(kind === "pdf" ? "Opening save as PDF…" : "Opening print…");

    const safeId = toSafeTitle(idOrNo);
    const title = kind === "pdf" ? toSafeTitle(pdfFileName || `Invoice-${safeId}`) : `Invoice-${safeId}`;

    const after = () => {
      // mark printed only once (when previously not marked)
      if (!printedAt) {
        safe(
          markPrintedOnServer(idOrNo)
            .then(() => router.refresh())
            .catch((e) => console.error("markPrinted failed", e))
        );
      } else {
        safe(Promise.resolve().then(() => router.refresh()));
      }

      // clear UI state
      setLoading(null);
      setMsg(null);
    };

    requestAnimationFrame(() => doPrint(title, after));
  }

  function handleEditDraft() {
    if (!isDraft || !canMutate || busy) return;
    setLoading("EDIT");
    setTone("info");
    setMsg("Opening draft…");
    router.push(`/billing?edit=${encodeURIComponent(idOrNo)}`);
  }

  async function handlePrintAndFinalize() {
    if (!isDraft || !canMutate || busy) return;

    setLoading("FINALIZE");
    setTone("info");
    setMsg("Finalizing…");

    try {
      const email = localStorage.getItem("bb.email") || "cashier@harmonyluxe.com";

      const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cashierEmail: email }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const billNo: string = data?.bill?.billNo || data?.bill?.id || idOrNo;

      const safeBillNo = String(billNo).replace(/[^a-zA-Z0-9\-_\.]+/g, "-");
      const title = `Invoice-${safeBillNo}`;

      setTone("success");
      setMsg("Invoice finalized. Opening print…");

      const after = () => {
        // mark printed on finalized invoice number
        safe(
          markPrintedOnServer(billNo)
            .then(() => router.refresh())
            .catch((e) => console.error("markPrinted failed", e))
        );

        router.replace(`/invoices/${encodeURIComponent(billNo)}?from=billing`);

        setLoading(null);
        setMsg(null);
      };

      requestAnimationFrame(() => doPrint(title, after));
    } catch (e) {
      console.error(e);
      setTone("error");
      setMsg("Failed to finalize this invoice. Check connection and try again.");
      setLoading(null);
    }
  }

  useEffect(() => {
    if (!autoPrint || !isFinal || autoOnce.current) return;
    autoOnce.current = true;
    handlePrint("print");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, isFinal]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <>
            {canMutate ? (
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
            ) : (
              <div className="text-xs text-muted">Draft actions are disabled for this role.</div>
            )}
          </>
        ) : isVoid ? (
          <div className="text-xs text-muted">This invoice is void.</div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handlePrint("print")}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading === "PRINT" ? <Spinner /> : null}
              {loading === "PRINT" ? "Preparing..." : "Print"}
            </button>

            <button
              type="button"
              onClick={() => handlePrint("pdf")}
              disabled={busy}
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-card disabled:opacity-60"
              title="Opens print dialog. Choose Save as PDF."
            >
              {loading === "PDF" ? "Preparing..." : "Save as PDF"}
            </button>
          </>
        )}
      </div>

      {msg ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${bannerCls}`}
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}
