// src/components/dashboard/DashboardTopbar.tsx
import Link from "next/link";

export default function DashboardTopbar({
  roleLabel,
  userEmail,
  todayLabel,
  monthLabel,
  showCreateBill,
}: {
  roleLabel: string;
  userEmail: string;
  todayLabel: string;
  monthLabel: string;
  showCreateBill: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="font-semibold text-foreground">Dashboard</span>
        <span className="h-4 w-px bg-border/60" />
        <span>
          Month <span className="font-medium text-foreground">{monthLabel}</span>
        </span>
        <span className="h-4 w-px bg-border/60" />
        <span>
          Today <span className="font-medium text-foreground">{todayLabel}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {roleLabel}
        </span>

        <span className="hidden max-w-[260px] truncate rounded-full bg-card px-2.5 py-1 font-mono text-[10px] text-muted sm:inline">
          {userEmail || "Signed in"}
        </span>

        {showCreateBill ? (
          <Link
            href="/billing"
            className={[
              "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm transition",
              "bg-primary hover:bg-primary/90",
              // FORCE readable text (prevents it turning white)
              "!text-[color:var(--on-primary)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            ].join(" ")}
          >
            + Create bill
          </Link>
        ) : null}
      </div>
    </div>
  );
}