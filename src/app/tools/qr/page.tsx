"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QR from "@/components/QR";

const DEFAULT_PATH = "/menu/public";

export default function QRTool() {
  const [origin, setOrigin] = useState("");
  const [to, setTo] = useState<string>(DEFAULT_PATH);

  // Get origin only on the client to avoid hydration mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;
    const o = window.location.origin;
    setOrigin(o);

    // If user hasn't changed the value, upgrade the default to a full URL
    setTo((prev) => {
      if (!prev || prev === DEFAULT_PATH) return `${o}${DEFAULT_PATH}`;
      return prev;
    });
  }, []);

  const title = useMemo(
    () => (to.includes("/menu/public") ? "Scan for menu" : "Scan me"),
    [to]
  );

  const linkRef = useRef<HTMLDivElement | null>(null);

  function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(to).catch(() => {});
  }

  function download() {
    const canvas =
      (linkRef.current?.querySelector(
        "canvas"
      ) as HTMLCanvasElement | null) ?? null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-qr.png";
    a.click();
  }

  const menuUrl = origin ? `${origin}${DEFAULT_PATH}` : DEFAULT_PATH;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      {/* Header card */}
      <section className="mb-6 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:mb-8 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Tools
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Menu QR generator
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Generate a QR code that opens the{" "}
              <span className="font-medium">public mobile menu</span>; perfect
              for reception, rooms and table displays.
            </p>
          </div>

          <div className="rounded-xl bg-background px-3 py-2 text-[11px] text-muted">
            <div className="font-medium text-foreground">Default menu link</div>
            <div className="mt-1">
              <span className="block break-all font-mono text-[10px]">
                {menuUrl}
              </span>
              <span className="text-[10px]">Customer-facing menu</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main card */}
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:p-5">
        {/* Left side: form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">
              Target URL
            </label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder={menuUrl}
            />
            <p className="mt-2 text-[11px] text-muted">
              For the standard customer menu, use{" "}
              <span className="font-mono">{menuUrl}</span>. You can also paste
              any other HTTPS link.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              High-resolution PNG export
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1">
              Best on light backgrounds
            </span>
          </div>
        </div>

        {/* Right side: QR preview */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-background px-4 py-4 text-center">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div
            ref={linkRef}
            className="mt-3 inline-flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm"
          >
            <QR text={to} size={220} />
          </div>
          <div className="mt-2 max-w-full break-all text-[11px] text-muted">
            {to}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="no-print inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
              onClick={() => window.print()}
            >
              Print QR
            </button>
            <button
              type="button"
              className="no-print inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
              onClick={copy}
            >
              Copy link
            </button>
            <button
              type="button"
              className="no-print inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
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