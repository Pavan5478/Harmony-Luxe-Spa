"use client";

import { useMemo, useRef, useState } from "react";
import QR from "@/components/QR";

const DEFAULT_PATH = "/menu/public";

export default function QrToolClient({ origin }: { origin: string }) {
  const defaultUrl = origin ? `${origin}${DEFAULT_PATH}` : DEFAULT_PATH;

  const [to, setTo] = useState<string>(defaultUrl);
  const linkRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(
    () => (to.includes("/menu/public") ? "Scan for menu" : "Scan me"),
    [to]
  );

  function copy() {
    navigator.clipboard?.writeText(to).catch(() => {});
  }

  function download() {
    const canvas =
      (linkRef.current?.querySelector("canvas") as HTMLCanvasElement | null) ?? null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-qr.png";
    a.click();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <section className="mb-6 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:mb-8 sm:px-6 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Tools
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          Menu QR generator
        </h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          Use a full HTTPS link for fastest scan-open behavior.
        </p>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:p-5">
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted">Target URL</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder={defaultUrl}
          />
          <p className="text-[11px] text-muted">
            Default menu: <span className="font-mono">{defaultUrl}</span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-background px-4 py-4 text-center">
          <div className="text-sm font-semibold">{title}</div>

          <div
            ref={linkRef}
            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm"
          >
            <QR text={to} size={220} />
          </div>

          <div className="mt-2 max-w-full break-all text-[11px] text-muted">{to}</div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background"
              onClick={() => window.print()}
            >
              Print
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background"
              onClick={copy}
            >
              Copy link
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background"
              onClick={download}
            >
              Download PNG
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}