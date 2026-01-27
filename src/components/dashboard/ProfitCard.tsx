"use client";

// src/components/dashboard/ProfitCard.tsx
import { useMemo, useRef, useState } from "react";
import { inr } from "@/lib/format";

type NetPoint = {
  label: string;
  weekday: string;
  revenue: number;
  expenses: number;
  net: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function niceCeil(v: number) {
  const x = Math.max(0, Number(v) || 0);
  if (x <= 0) return 1;

  const exp = Math.floor(Math.log10(x));
  const base = Math.pow(10, exp);
  const f = x / base;

  const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 9, 10];
  const step = steps.find((s) => f <= s) ?? 10;

  return step * base;
}

function fmtAxisINR(v: number) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);

  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${Math.round(n / 1e3)}k`;
  return `₹${Math.round(n)}`;
}

/**
 * Smooth line using Catmull-Rom -> Bezier
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

export default function ProfitCard({
  monthLabel,
  monthProfit,
  monthRevenue,
  monthExpensesTotal,
  todayProfit,
  todayExpensesTotal,
  data,
}: {
  monthLabel: string;
  monthProfit: number;
  monthRevenue: number;
  monthExpensesTotal: number;
  todayProfit: number;
  todayExpensesTotal: number;
  data: NetPoint[];
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const stats = useMemo(() => {
    const maxAbs = Math.max(0, ...data.map((d) => Math.abs(Number(d.net) || 0)));
    const zeroDays = data.filter((d) => (Number(d.net) || 0) === 0).length;

    const best = data.reduce(
      (a, b) => ((Number(b.net) || 0) > (Number(a.net) || 0) ? b : a),
      data[0] ?? { label: "", weekday: "", revenue: 0, expenses: 0, net: 0 }
    );
    const worst = data.reduce(
      (a, b) => ((Number(b.net) || 0) < (Number(a.net) || 0) ? b : a),
      data[0] ?? { label: "", weekday: "", revenue: 0, expenses: 0, net: 0 }
    );

    return {
      maxAbs,
      hasAny: maxAbs > 0,
      zeroDays,
      best: data.length ? best : null,
      worst: data.length ? worst : null,
    };
  }, [data]);

  const marginPct = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : null;
  const burnPct = monthRevenue > 0 ? (monthExpensesTotal / monthRevenue) * 100 : null;

  // Chart geometry
  const W = 820;
  const H = 260;
  const M = { l: 54, r: 18, t: 18, b: 44 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  // symmetric axis around 0
  const yMax = niceCeil(stats.maxAbs);
  const ticks = [-1, -0.5, 0, 0.5, 1].map((t) => t * yMax);

  const pts = useMemo(() => {
    const n = Math.max(1, data.length);
    return data.map((d, i) => {
      const x = M.l + (n === 1 ? 0 : (i / (n - 1)) * iw);
      // map net to y, with 0 at middle
      const r = yMax > 0 ? clamp((Number(d.net) || 0) / yMax, -1, 1) : 0;
      const y = M.t + (1 - (r + 1) / 2) * ih; // r=-1 -> bottom, r=+1 -> top
      return { ...d, x, y };
    });
  }, [data, iw, ih, yMax]);

  const midY = useMemo(() => {
    // y where net = 0
    return M.t + ih / 2;
  }, [ih]);

  const linePath = useMemo(() => {
    if (!pts.length) return "";
    const seg = smoothSegments(pts);
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} ${seg}`;
  }, [pts]);

  // Build area paths: split into profit (above mid) and loss (below mid)
  function buildAreaPath(sign: "pos" | "neg") {
    if (!pts.length) return "";
    const filtered = pts.map((p) => {
      const isPos = (Number(p.net) || 0) >= 0;
      const take = sign === "pos" ? isPos : !isPos;

      // if not take, clamp point to baseline (midY) to avoid weird fill
      return {
        x: p.x,
        y: take ? p.y : midY,
      };
    });

    const seg = smoothSegments(filtered);
    const first = filtered[0];
    const last = filtered[filtered.length - 1];

    return `M ${first.x.toFixed(2)} ${midY.toFixed(2)} L ${first.x.toFixed(
      2
    )} ${first.y.toFixed(2)} ${seg} L ${last.x.toFixed(2)} ${midY.toFixed(
      2
    )} Z`;
  }

  const areaPos = useMemo(() => buildAreaPath("pos"), [pts, midY]);
  const areaNeg = useMemo(() => buildAreaPath("neg"), [pts, midY]);

  // Tooltip
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const active = activeIdx != null ? pts[activeIdx] : null;

  function pickNearest(clientX: number) {
    const el = wrapRef.current;
    if (!el || !pts.length) return;

    const rect = el.getBoundingClientRect();
    const rx = clamp(clientX - rect.left, 0, rect.width);
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

    const px = (pts[best].x / W) * rect.width;
    const py = (pts[best].y / H) * rect.height;
    setTip({ x: px, y: py });
  }

  function clearTip() {
    setActiveIdx(null);
    setTip(null);
  }

  const activeDelta = useMemo(() => {
    if (activeIdx == null) return null;
    const curr = Number(pts[activeIdx]?.net || 0);
    const prev = Number(pts[activeIdx - 1]?.net || 0);
    const diff = curr - prev;
    return { prev, diff };
  }, [activeIdx, pts]);

  const monthTone =
    monthProfit > 0 ? "text-emerald-400" : monthProfit < 0 ? "text-danger" : "text-foreground";
  const todayTone =
    todayProfit > 0 ? "text-emerald-400" : todayProfit < 0 ? "text-danger" : "text-foreground";

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="min-w-0">
          <h2 className="min-w-0 text-sm font-semibold text-foreground sm:text-base">
            Net (revenue − expenses)
          </h2>
          <p className="mt-1 text-[11px] text-muted">
            Last 7 days • revenue vs expenses daily net
          </p>
        </div>

        <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {monthLabel}
        </span>
      </div>

      {/* Summary row */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="text-[11px] text-muted">Month net</div>
          <div className={["mt-1 text-xl font-semibold tabular-nums", monthTone].join(" ")}>
            {inr(monthProfit)}
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted">
            <span className="rounded-full bg-background px-2 py-1">
              Margin{" "}
              <span className="font-medium text-foreground">
                {marginPct == null ? "—" : `${marginPct.toFixed(0)}%`}
              </span>
            </span>
            <span className="rounded-full bg-background px-2 py-1">
              Spend{" "}
              <span className="font-medium text-foreground">
                {burnPct == null ? "—" : `${burnPct.toFixed(1)}%`}
              </span>
            </span>
          </div>

          <div className="mt-2 text-[11px] text-muted">
            Rev{" "}
            <span className="font-medium text-foreground tabular-nums">{inr(monthRevenue)}</span>{" "}
            • Exp{" "}
            <span className="font-medium text-foreground tabular-nums">{inr(monthExpensesTotal)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-3">
          <div className="text-[11px] text-muted">Today</div>
          <div className={["mt-1 text-xl font-semibold tabular-nums", todayTone].join(" ")}>
            {inr(todayProfit)}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Expenses{" "}
            <span className="font-medium text-foreground tabular-nums">{inr(todayExpensesTotal)}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted">
            {stats.best ? (
              <span className="rounded-full bg-background px-2 py-1">
                Best{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {inr(stats.best.net)}
                </span>{" "}
                <span className="text-muted">({stats.best.weekday} {stats.best.label})</span>
              </span>
            ) : null}
            {stats.worst ? (
              <span className="rounded-full bg-background px-2 py-1">
                Worst{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {inr(stats.worst.net)}
                </span>{" "}
                <span className="text-muted">({stats.worst.weekday} {stats.worst.label})</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {!stats.hasAny ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          Not enough data to show the last 7 days net trend yet.
        </div>
      ) : (
        <div className="mt-4 min-w-0">
          <div
            ref={wrapRef}
            className="relative rounded-xl bg-background/40 ring-1 ring-border/60 px-2 py-3"
            onMouseLeave={clearTip}
          >
            {/* Tooltip */}
            {active && tip ? (
              <div
                className="pointer-events-none absolute z-10 min-w-[220px] rounded-xl border border-border bg-card/95 px-3 py-2 text-[11px] shadow-md"
                style={{
                  left: clamp(tip.x + 12, 8, (wrapRef.current?.clientWidth || 0) - 240),
                  top: clamp(tip.y - 48, 8, (wrapRef.current?.clientHeight || 0) - 86),
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-foreground">
                    {active.weekday} {active.label}
                  </div>
                  <div
                    className={[
                      "tabular-nums font-semibold",
                      active.net >= 0 ? "text-emerald-400" : "text-danger",
                    ].join(" ")}
                  >
                    {inr(active.net)}
                  </div>
                </div>

                <div className="mt-1 text-muted">
                  Rev{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {inr(active.revenue)}
                  </span>{" "}
                  • Exp{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {inr(active.expenses)}
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
              className="h-[240px] w-full"
              role="img"
              aria-label="Net trend chart"
              onMouseMove={(e) => pickNearest(e.clientX)}
              onTouchStart={(e) => pickNearest(e.touches[0]?.clientX || 0)}
              onTouchMove={(e) => pickNearest(e.touches[0]?.clientX || 0)}
            >
              <defs>
                <linearGradient id="netPos" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="netNeg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.16" />
                </linearGradient>
              </defs>

              {/* Grid + ticks */}
              <g style={{ color: "hsl(var(--muted-foreground))" }}>
                {ticks.map((v) => {
                  const r = yMax > 0 ? clamp(v / yMax, -1, 1) : 0;
                  const y = M.t + (1 - (r + 1) / 2) * ih;
                  const isZero = v === 0;

                  return (
                    <g key={v}>
                      <line
                        x1={M.l}
                        x2={W - M.r}
                        y1={y}
                        y2={y}
                        stroke="currentColor"
                        opacity={isZero ? 0.35 : 0.18}
                      />
                      <text
                        x={M.l - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="currentColor"
                      >
                        {v === 0 ? "0" : (v > 0 ? "+" : "−") + fmtAxisINR(Math.abs(v))}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Areas */}
              <path d={areaPos} fill="url(#netPos)" />
              <path d={areaNeg} fill="url(#netNeg)" />

              {/* Line */}
              <path
                d={linePath}
                stroke="hsl(var(--foreground))"
                opacity="0.75"
                strokeWidth="2.8"
                fill="none"
              />

              {/* Active vertical marker */}
              {active ? (
                <line
                  x1={active.x}
                  x2={active.x}
                  y1={M.t}
                  y2={M.t + ih}
                  stroke="hsl(var(--foreground))"
                  opacity="0.14"
                />
              ) : null}

              {/* Points + x labels */}
              {pts.map((p, i) => {
                const isActive = i === activeIdx;
                const showX = i === 0 || i === pts.length - 1 || i % 2 === 0;

                return (
                  <g key={`${p.weekday}-${p.label}-${i}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? 5 : 4}
                      fill="hsl(var(--background))"
                      stroke={p.net >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                      strokeWidth={isActive ? 3 : 2}
                    />
                    {showX ? (
                      <text
                        x={p.x}
                        y={H - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="hsl(var(--muted-foreground))"
                      >
                        {p.weekday.slice(0, 2)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted">
              <span>
                Axis max: <span className="font-medium text-foreground">{fmtAxisINR(yMax)}</span>
              </span>
              <span className="hidden sm:inline">Hover (or tap) points to see breakdown</span>
              <button
                type="button"
                className="sm:hidden rounded-full border border-border bg-background px-2 py-1"
                onClick={clearTip}
              >
                Clear
              </button>
            </div>

            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-[10px] text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                Profit
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--destructive))]" />
                Loss
              </span>
              {stats.zeroDays > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                  {stats.zeroDays} zero day{stats.zeroDays === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
