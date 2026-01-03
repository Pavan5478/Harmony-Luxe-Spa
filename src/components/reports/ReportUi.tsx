"use client";

export const fieldBase =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export const chipBase =
  "inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] font-medium text-muted hover:bg-card";

export function LabelTiny({ children }: { children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  deltaPct,
  positiveGood = true,
}: {
  label: string;
  value: string;
  hint?: string;
  deltaPct?: number | null;
  positiveGood?: boolean;
}) {
  const showDelta = typeof deltaPct === "number" && Number.isFinite(deltaPct);
  const isUp = showDelta ? deltaPct! >= 0 : false;

  let deltaTone = "text-muted";
  if (showDelta) {
    const good = positiveGood ? isUp : !isUp;
    deltaTone = good ? "text-emerald-600" : "text-danger";
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {showDelta ? (
          <span className={`text-[11px] font-semibold ${deltaTone}`}>
            {isUp ? "▲" : "▼"} {Math.abs(deltaPct!).toFixed(1)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">{title}</h2>
          {subtitle ? <p className="mt-1 text-[11px] text-muted sm:text-xs">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
