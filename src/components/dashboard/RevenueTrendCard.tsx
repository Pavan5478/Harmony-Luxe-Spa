"use client";

// src/components/dashboard/RevenueTrendCard.tsx
import { useMemo, useRef, useState } from "react";
import { inr } from "@/lib/format";

type Point = { key: string; label: string; weekday: string; total: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function niceCeil(v: number) {
  const x = Math.max(0, Number(v) || 0);
  if (x <= 0) return 1;

  const exp = Math.floor(Math.log10(x));
  const base = Math.pow(10, exp);
  const f = x / base;

  // “nice” steps so axis looks human
  const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 9, 10];
  const step = steps.find((s) => f <= s) ?? 10;

  return step * base;
}

function fmtAxisINR(v: number) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);

  // Indian-ish compact axis labels
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${Math.round(n / 1e3)}k`;
  return `₹${Math.round(n)}`;
}

/**
 * Smooth line using Catmull-Rom -> Bezier
 * Produces a nicer “trend” feel than sharp corners.
 */
function smoothSegments(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  const segs: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    segs.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(
        2
      )}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    );
  }
  return segs.join(" ");
}

export default function RevenueTrendCard({
  last14,
  maxDayTotal,
  total,
}: {
  last14: Point[];
  maxDayTotal: number;
  total: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const days = last14.length || 14;
  const avg = days > 0 ? total / days : 0;

  // find useful summaries
  const stats = useMemo(() => {
    const max = Math.max(0, ...last14.map((d) => d.total));
    const maxIdx = last14.findIndex((d) => d.total === max);
    const zeroDays = last14.filter((d) => (Number(d.total) || 0) <= 0).length;

    const peak =
      maxIdx >= 0
        ? {
            value: max,
            label: `${last14[maxIdx].weekday} ${last14[maxIdx].label}`,
          }
        : null;

    return { max, zeroDays, peak };
  }, [last14]);

  const hasAny = stats.max > 0;

  // Chart geometry (SVG)
  const W = 820;
  const H = 280;
  const M = { l: 56, r: 18, t: 18, b: 40 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  // make sure axis max includes avg line
  const axisMaxRaw = Math.max(0, maxDayTotal || 0, stats.max || 0, avg || 0);
  const yMax = niceCeil(axisMaxRaw);

  // cleaner ticks (5)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);

  // Points mapped to SVG coords
  const pts = useMemo(() => {
    const n = Math.max(1, last14.length);
    return last14.map((d, i) => {
      const x = M.l + (n === 1 ? 0 : (i / (n - 1)) * iw);
      const ratio = yMax > 0 ? clamp((Number(d.total) || 0) / yMax, 0, 1) : 0;
      const y = M.t + (1 - ratio) * ih;
      return { ...d, x, y };
    });
  }, [last14, iw, ih, yMax]);

  const baseY = M.t + ih;

  const linePath = useMemo(() => {
    if (!pts.length) return "";
    const seg = smoothSegments(pts);
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} ${seg}`;
  }, [pts]);

  const areaPath = useMemo(() => {
    if (!pts.length) return "";
    const seg = smoothSegments(pts);
    return `M ${pts[0].x.toFixed(2)} ${baseY.toFixed(2)} L ${pts[0].x.toFixed(
      2
    )} ${pts[0].y.toFixed(2)} ${seg} L ${pts[pts.length - 1].x.toFixed(
      2
    )} ${baseY.toFixed(2)} Z`;
  }, [pts, baseY]);

  // Avg line
  const yAvg = useMemo(() => {
    const r = yMax > 0 ? clamp(avg / yMax, 0, 1) : 0;
    return M.t + (1 - r) * ih;
  }, [avg, yMax, ih]);

  // Tooltip / active point
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const active = activeIdx != null ? pts[activeIdx] : null;

  function pickNearest(clientX: number) {
    const el = wrapRef.current;
    if (!el || !pts.length) return;

    const rect = el.getBoundingClientRect();
    const rx = clamp(clientX - rect.left, 0, rect.width);

    // map to SVG coords
    const sx = (rx / rect.width) * W;

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - sx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    setActiveIdx(best);

    // place tooltip near point in container px coords
    const px = (pts[best].x / W) * rect.width;
    const py = (pts[best].y / H) * rect.height;
    setTip({ x: px, y: py });
  }

  function clearTip() {
    setActiveIdx(null);
    setTip(null);
  }

  // tooltip text helpers
  const activeDelta = useMemo(() => {
    if (activeIdx == null) return null;
    const curr = Number(pts[activeIdx]?.total || 0);
    const prev = Number(pts[activeIdx - 1]?.total || 0);
    const diff = curr - prev;
    return { prev, diff };
  }, [activeIdx, pts]);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Revenue trend
          </h2>
          <p className="mt-1 text-[11px] text-muted">
            Last 14 days • finalized invoices only
          </p>

          {/* small stat chips */}
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
            <span className="rounded-full bg-background px-2 py-1">
              Avg/day <span className="font-medium text-foreground tabular-nums">{inr(avg)}</span>
            </span>
            {stats.peak ? (
              <span className="rounded-full bg-background px-2 py-1">
                Peak <span className="font-medium text-foreground tabular-nums">{inr(stats.peak.value)}</span>{" "}
                <span className="text-muted">({stats.peak.label})</span>
              </span>
            ) : null}
            {stats.zeroDays > 0 ? (
              <span className="rounded-full bg-background px-2 py-1">
                Zero days <span className="font-medium text-foreground tabular-nums">{stats.zeroDays}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className="text-sm font-semibold text-foreground tabular-nums">
            {inr(total)}
          </div>
          <div className="text-[11px] text-muted">14-day total</div>
        </div>
      </div>

      {!hasAny ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          No revenue in the last 14 days yet.
        </div>
      ) : (
        <div className="mt-4 min-w-0">
          <div
            ref={wrapRef}
            className="relative rounded-xl bg-background/40 ring-1 ring-border/60 px-2 py-3"
            onMouseLeave={clearTip}
          >
            {/* Tooltip (HTML overlay for clarity) */}
            {active && tip ? (
              <div
                className="pointer-events-none absolute z-10 min-w-[190px] rounded-xl border border-border bg-card/95 px-3 py-2 text-[11px] shadow-md"
                style={{
                  left: clamp(tip.x + 12, 8, (wrapRef.current?.clientWidth || 0) - 210),
                  top: clamp(tip.y - 40, 8, (wrapRef.current?.clientHeight || 0) - 72),
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-foreground">
                    {active.weekday} {active.label}
                  </div>
                  <div className="tabular-nums font-semibold text-foreground">
                    {inr(active.total)}
                  </div>
                </div>
                <div className="mt-1 text-muted">
                  Share:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {total > 0 ? `${((active.total / total) * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                {activeDelta ? (
                  <div className="mt-1 text-muted">
                    vs prev:{" "}
                    <span
                      className={[
                        "font-semibold tabular-nums",
                        activeDelta.diff > 0
                          ? "text-emerald-400"
                          : activeDelta.diff < 0
                          ? "text-danger"
                          : "text-foreground",
                      ].join(" ")}
                    >
                      {activeDelta.diff > 0 ? "+" : ""}
                      {inr(activeDelta.diff)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-[260px] w-full"
              role="img"
              aria-label="Revenue trend chart for last 14 days"
              onMouseMove={(e) => pickNearest(e.clientX)}
              onTouchStart={(e) => pickNearest(e.touches[0]?.clientX || 0)}
              onTouchMove={(e) => pickNearest(e.touches[0]?.clientX || 0)}
            >
              {/* Gradient */}
              <defs>
                <linearGradient id="revArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Use theme muted color inside SVG */}
              <g style={{ color: "hsl(var(--muted-foreground))" }}>
                {/* Grid + Y ticks */}
                {ticks.map((v) => {
                  const y = M.t + (1 - v / yMax) * ih;
                  return (
                    <g key={v}>
                      <line
                        x1={M.l}
                        x2={W - M.r}
                        y1={y}
                        y2={y}
                        stroke="currentColor"
                        opacity="0.18"
                      />
                      <text
                        x={M.l - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="currentColor"
                      >
                        {fmtAxisINR(v)}
                      </text>
                    </g>
                  );
                })}

                {/* X axis baseline */}
                <line
                  x1={M.l}
                  x2={W - M.r}
                  y1={baseY}
                  y2={baseY}
                  stroke="currentColor"
                  opacity="0.35"
                />

                {/* Avg line (dashed) */}
                <line
                  x1={M.l}
                  x2={W - M.r}
                  y1={yAvg}
                  y2={yAvg}
                  stroke="currentColor"
                  opacity="0.35"
                  strokeDasharray="5 6"
                />
                <text
                  x={W - M.r}
                  y={yAvg - 6}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                >
                  avg {fmtAxisINR(avg)}
                </text>
              </g>

              {/* Area + line (use primary color via currentColor wrapper) */}
              <g style={{ color: "hsl(var(--primary))" }}>
                <path d={areaPath} fill="url(#revArea)" />
                <path d={linePath} stroke="currentColor" strokeWidth="2.8" fill="none" />

                {/* Active vertical marker */}
                {active ? (
                  <line
                    x1={active.x}
                    x2={active.x}
                    y1={M.t}
                    y2={baseY}
                    stroke="currentColor"
                    opacity="0.22"
                  />
                ) : null}

                {/* Points */}
                {pts.map((p, i) => {
                  const isActive = i === activeIdx;
                  const showX = i === 0 || i === pts.length - 1 || i % 2 === 0;

                  return (
                    <g key={p.key}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? 5 : 4}
                        fill="hsl(var(--background))"
                        stroke="currentColor"
                        strokeWidth={isActive ? 3 : 2}
                        opacity={isActive ? 1 : 0.95}
                      />
                      {showX ? (
                        <text
                          x={p.x}
                          y={H - 12}
                          textAnchor="middle"
                          fontSize="10"
                          fill="hsl(var(--muted-foreground))"
                        >
                          {p.label}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted">
              <span>
                Axis max: <span className="font-medium text-foreground">{fmtAxisINR(yMax)}</span>
              </span>
              <span className="hidden sm:inline">
                Hover (or tap) to see exact values
              </span>
              <button
                type="button"
                className="sm:hidden rounded-full border border-border bg-background px-2 py-1"
                onClick={clearTip}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
