// src/components/invoice/InvoiceWorkspace.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InvoiceActions from "@/components/invoice/Actions";

type Status = "DRAFT" | "FINAL" | "VOID";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function InvoiceWorkspace({
  children,
  idOrNo,
  printedAt,
  printedAtLabel,
  status,
  autoPrint,
  backHref,
  billNoLabel,
  billDateLabel,
}: {
  children: React.ReactNode;
  idOrNo: string;
  printedAt: string | null;
  printedAtLabel?: string | null; // ✅ FIX for TS error
  status: Status;
  autoPrint?: boolean;
  backHref: string;
  billNoLabel: string;
  billDateLabel: string;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);

  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<"fit" | "custom">("fit");

  const statusUI = useMemo(() => {
    const base =
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium";
    if (status === "FINAL")
      return {
        label: "Final",
        cls: `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`,
      };
    if (status === "VOID")
      return {
        label: "Void",
        cls: `${base} border-danger/40 bg-danger/10 text-danger`,
      };
    return {
      label: "Draft",
      cls: `${base} border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300`,
    };
  }, [status]);

  useEffect(() => {
    const frame = frameRef.current;
    const paper = paperRef.current;
    if (!frame || !paper) return;

    const calc = () => {
      const fw = frame.clientWidth;
      const fh = frame.clientHeight;
      const pw = paper.offsetWidth; // untransformed size
      const ph = paper.offsetHeight;

      if (!fw || !fh || !pw || !ph) return;

      const nextFit = clamp(Math.min(fw / pw, fh / ph) * 0.98, 0.28, 1.25);
      setFitScale(nextFit);
    };

    calc();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(calc);
      ro.observe(frame);
      ro.observe(paper);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    if (mode === "fit") setScale(fitScale);
  }, [fitScale, mode]);

  function setCustom(next: number) {
    setMode("custom");
    setScale(clamp(next, 0.28, 1.5));
  }

  function onFit() {
    setMode("fit");
    setScale(fitScale);
  }

  const pct = Math.round(scale * 100);
  const printedLabel =
    printedAtLabel ?? (printedAt ? new Date(printedAt).toLocaleString() : null);

  return (
    <div className="invoice-workspace-root mx-auto w-full max-w-7xl print:max-w-none">
      {/* ✅ PRINT ONLY: render only paper */}
      <div className="hidden print:block">
        <div className="mx-auto w-full max-w-[210mm]">
          {children}
        </div>
      </div>

      {/* SCREEN MODE */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start print:hidden">
        {/* LEFT: Preview */}
        <section className="rounded-2xl border border-border bg-card/40 p-3 shadow-sm h-[calc(100svh-9rem)] lg:sticky lg:top-20 lg:h-[calc(100svh-7.5rem)]">
          <div className="invoice-preview-frame h-full w-full overflow-hidden rounded-xl bg-background/70 p-3">
            <div ref={frameRef} className="h-full w-full overflow-hidden">
              <div className="flex h-full w-full justify-center">
                <div
                  ref={paperRef}
                  className="invoice-scale origin-top transform-gpu bg-white shadow-sm ring-1 ring-slate-200"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                  }}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT: Controls */}
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-20 lg:h-[calc(100svh-7.5rem)] lg:overflow-auto">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Invoice
                </div>
                <div className="mt-1 truncate text-base font-semibold text-foreground">
                  Bill #{billNoLabel}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">{billDateLabel}</div>
              </div>

              <span className={statusUI.cls}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusUI.label}
              </span>
            </div>

            {/* Better UX zoom */}
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-foreground">Preview</div>
                <div className="text-[11px] text-muted">{pct}%</div>
              </div>

              <input
                className="mt-2 w-full"
                type="range"
                min={28}
                max={150}
                value={pct}
                onChange={(e) => setCustom(Number(e.target.value) / 100)}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCustom(scale - 0.1)}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-card"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setCustom(scale + 0.1)}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-card"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setCustom(1)}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-card"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={onFit}
                  className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-card"
                >
                  Fit
                </button>
              </div>

              {printedLabel ? (
                <div className="mt-2 text-[11px] text-muted">Printed: {printedLabel}</div>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <InvoiceActions
                idOrNo={idOrNo}
                printedAt={printedAt}
                status={status}
                autoPrint={autoPrint}
              />
            </div>

            <Link
              href={backHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card hover:no-underline"
            >
              ← Back to invoices
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}