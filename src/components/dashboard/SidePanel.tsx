// src/components/dashboard/SidePanel.tsx
import Link from "next/link";
type Card = {
  title: string;
  href: string;
};

type Props = {
  roleLabel: string;
  cards: Card[];
};

export default function SidePanel({ roleLabel, cards }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Gradient role card */}
      <div className="overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/40 via-primary/70 to-amber-500/60 p-4 text-xs text-foreground shadow-sm sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
          Role overview
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Welcome back, {roleLabel}.
        </h2>
        <p className="mt-2 text-[11px] text-white/80">
          Use the shortcuts below to jump straight into billing, invoices and
          reports. Views are tailored to your role.
        </p>
      </div>

      {/* Shortcuts list */}
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted shadow-sm sm:p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Shortcuts
        </h3>
        <ul className="mt-2 space-y-1.5">
          {cards.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                prefetch
                className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-background/70 hover:no-underline"
              >
                <span className="truncate font-medium text-foreground">
                  {c.title}
                </span>
                <span className="text-[11px] text-muted">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}