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

/** Smooth line using Catmull-Rom -> Bezier */
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

function toneText(v: number) {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-destructive";
  return "text-foreground";
}

function tonePill(v: number) {
  if (v > 0) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (v < 0) return "bg-destructive/15 text-destructive";
  return "bg-muted/40 text-muted-foreground";
}

function StatPill({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground",
        className,
      ].join(" ")}
    >
      <span className="opacity-80">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
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

    const avg = data.length
      ? data.reduce((s, d) => s + (Number(d.net) || 0), 0) / data.length
      : 0;

    return {
      maxAbs,
      hasAny: maxAbs > 0,
      zeroDays,
      best: data.length ? best : null,
      worst: data.length ? worst : null,
      avg,
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
      const r = yMax > 0 ? clamp((Number(d.net) || 0) / yMax, -1, 1) : 0;
      const y = M.t + (1 - (r + 1) / 2) * ih;
      return { ...d, x, y };
    });
  }, [data, iw, ih, yMax]);

  const midY = useMemo(() => M.t + ih / 2, [ih]);

  const linePath = useMemo(() => {
    if (!pts.length) return "";
    const seg = smoothSegments(pts);
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} ${seg}`;
  }, [pts]);

  function buildAreaPath(sign: "pos" | "neg") {
    if (!pts.length) return "";
    const filtered = pts.map((p) => {
      const isPos = (Number(p.net) || 0) >= 0;
      const take = sign === "pos" ? isPos : !isPos;
      return { x: p.x, y: take ? p.y : midY };
    });

    const seg = smoothSegments(filtered);
    const first = filtered[0];
    const last = filtered[filtered.length - 1];

    return `M ${first.x.toFixed(2)} ${midY.toFixed(2)} L ${first.x.toFixed(
      2
    )} ${first.y.toFixed(2)} ${seg} L ${last.x.toFixed(2)} ${midY.toFixed(2)} Z`;
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
    const tipX = clamp(px + 12, 10, Math.max(10, rect.width - 250));
    const tipY = clamp(py - 54, 10, Math.max(10, rect.height - 92));
    setTip({ x: tipX, y: tipY });
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

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 text-card-foreground shadow-sm sm:px-5 sm:py-5">
      {/* Header (match other cards style) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Net (revenue − expenses)
            </h2>
            <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-foreground">
              {monthLabel}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Last 7 days • hover/tap points for revenue/expense breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className={`rounded-full px-2.5 py-1 text-[10px] ${tonePill(monthProfit)}`}>
            Month: <span className={`font-semibold tabular-nums ${toneText(monthProfit)}`}>{inr(monthProfit)}</span>
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] ${tonePill(todayProfit)}`}>
            Today: <span className={`font-semibold tabular-nums ${toneText(todayProfit)}`}>{inr(todayProfit)}</span>
          </span>
        </div>
      </div>

      {/* Summary (no heavy grey blocks) */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Month panel */}
        <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Month net</div>
              <div className={`mt-1 text-xl font-semibold tabular-nums ${toneText(monthProfit)}`}>
                {inr(monthProfit)}
              </div>
            </div>

            <div className="text-right text-[11px] text-muted-foreground">
              <div>
                Rev <span className="font-medium text-foreground tabular-nums">{inr(monthRevenue)}</span>
              </div>
              <div>
                Exp{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {inr(monthExpensesTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <StatPill
              label="Margin"
              value={marginPct == null ? "—" : `${marginPct.toFixed(0)}%`}
            />
            <StatPill
              label="Spend"
              value={burnPct == null ? "—" : `${burnPct.toFixed(1)}%`}
            />
          </div>

          {/* subtle bars (not loud in dark mode) */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card px-2.5 py-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Margin</span>
                <span className="font-medium text-foreground tabular-nums">
                  {marginPct == null ? "—" : `${marginPct.toFixed(0)}%`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full bg-emerald-500/70"
                  style={{ width: `${clamp(marginPct ?? 0, 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card px-2.5 py-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Spend</span>
                <span className="font-medium text-foreground tabular-nums">
                  {burnPct == null ? "—" : `${burnPct.toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full bg-destructive/60"
                  style={{ width: `${clamp(burnPct ?? 0, 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Today panel */}
        <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-muted-foreground">Today</div>
              <div className={`mt-1 text-xl font-semibold tabular-nums ${toneText(todayProfit)}`}>
                {inr(todayProfit)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Expenses{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {inr(todayExpensesTotal)}
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] text-muted-foreground">
              <div>
                Avg (7d){" "}
                <span className={`font-semibold tabular-nums ${toneText(stats.avg)}`}>
                  {inr(stats.avg)}
                </span>
              </div>
              {stats.zeroDays > 0 ? <div>{stats.zeroDays} zero day(s)</div> : <div>&nbsp;</div>}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {stats.best ? (
              <span className="rounded-full border border-border/60 bg-card px-2.5 py-1">
                Best{" "}
                <span className={`font-semibold tabular-nums ${toneText(stats.best.net)}`}>
                  {inr(stats.best.net)}
                </span>{" "}
                <span className="opacity-80">
                  ({stats.best.weekday} {stats.best.label})
                </span>
              </span>
            ) : null}
            {stats.worst ? (
              <span className="rounded-full border border-border/60 bg-card px-2.5 py-1">
                Worst{" "}
                <span className={`font-semibold tabular-nums ${toneText(stats.worst.net)}`}>
                  {inr(stats.worst.net)}
                </span>{" "}
                <span className="opacity-80">
                  ({stats.worst.weekday} {stats.worst.label})
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Chart */}
      {!stats.hasAny ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/10 px-3 py-3 text-[11px] text-muted-foreground">
          Not enough data to show the last 7 days net trend yet.
        </div>
      ) : (
        <div className="mt-4 min-w-0">
          <div
            ref={wrapRef}
            className="relative rounded-2xl border border-border/60 bg-card p-2 ring-1 ring-border/30"
            onPointerLeave={clearTip}
          >
            {/* Tooltip */}
            {active && tip ? (
              <div
                className="pointer-events-none absolute z-10 min-w-[230px] rounded-2xl border border-border bg-card px-3 py-2 text-[11px] shadow-lg"
                style={{
                  left: tip.x,
                  top: tip.y,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-foreground">
                    {active.weekday} {active.label}
                  </div>
                  <div className={`tabular-nums font-semibold ${toneText(active.net)}`}>
                    {inr(active.net)}
                  </div>
                </div>

                <div className="mt-1 text-muted-foreground">
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
                  <div className="mt-1 text-muted-foreground">
                    vs prev:{" "}
                    <span
                      className={[
                        "font-semibold tabular-nums",
                        activeDelta.diff > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : activeDelta.diff < 0
                          ? "text-destructive"
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
              className="h-[240px] w-full touch-none"
              role="img"
              aria-label="Net trend chart"
              onPointerMove={(e) => pickNearest(e.clientX)}
              onPointerDown={(e) => pickNearest(e.clientX)}
            >
              <defs>
                {/* IMPORTANT: use emerald/red for profit/loss (not theme primary which is gold in your UI) */}
                <linearGradient id="netPos" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0.03" />
                </linearGradient>
                <linearGradient id="netNeg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity="0.20" />
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
                        opacity={isZero ? 0.35 : 0.16}
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

                const posStroke = "rgb(16 185 129)";
                const negStroke = "rgb(239 68 68)";

                return (
                  <g key={`${p.weekday}-${p.label}-${i}`}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isActive ? 5.5 : 4}
                      fill="hsl(var(--card))"
                      stroke={p.net >= 0 ? posStroke : negStroke}
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
                        {p.weekday.slice(0, 2)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
              <span>
                Axis max:{" "}
                <span className="font-medium text-foreground tabular-nums">{fmtAxisINR(yMax)}</span>
              </span>
              <span className="hidden sm:inline">Hover (or tap) to inspect points</span>
              <button
                type="button"
                className="sm:hidden rounded-full border border-border bg-card px-2 py-1 text-foreground"
                onClick={clearTip}
              >
                Clear
              </button>
            </div>

            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Profit
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
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
