import Link from "next/link";

type PublicItem = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  active: boolean;
  taxRate?: number;
};

async function getItems(): Promise<PublicItem[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${base}/api/items`, { cache: "no-store" });
  const j = await res.json();
  return Array.isArray(j.items) ? (j.items as PublicItem[]) : [];
}

export default async function PublicMenu() {
  const items = await getItems();
  const activeItems = items.filter((i) => i.active);

  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
<header className="mb-6 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:mb-8 sm:px-6 sm:py-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    {/* Left: title */}
    <div className="max-w-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        Menu
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Services &amp; Prices
      </h1>
      <p className="mt-1 text-sm text-muted">
        Live menu. Prices are inclusive of GST unless specified.
      </p>
    </div>

    {/* Right: status + staff link */}
    <div className="flex flex-col items-start gap-2 text-[11px] text-muted sm:items-end">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>
          {activeItems.length} active item
          {activeItems.length === 1 ? "" : "s"}
        </span>
        <span className="mx-1 h-3 w-px bg-border" />
        <span>Updated {today}</span>
      </span>

      <span className="hidden text-right sm:block">
        <span className="block text-[11px] font-medium text-muted">
          Powered by Bill Book
        </span>
        <Link
          href="/dashboard"
          className="mt-0.5 inline-flex items-center text-[11px] text-primary hover:underline"
        >
          Staff login
        </Link>
      </span>
    </div>
  </div>
</header>


        {/* Items list */}
        <section className="space-y-3">
          {activeItems.map((i) => (
            <article
              key={i.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="min-w-0">
                <h2 className="truncate text-sm font-medium sm:text-base">
                  {i.name}
                </h2>

                {i.variant && (
                  <p className="mt-0.5 text-xs text-muted">{i.variant}</p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {i.taxRate != null && (
                    <span className="inline-flex items-center rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                      GST {Math.round(i.taxRate * 100)}%
                    </span>
                  )}
                  <span className="text-[11px] text-muted">
                    ID: <span className="font-mono">{i.id}</span>
                  </span>
                </div>
              </div>

              <div className="ml-4 shrink-0 text-right">
                <div className="text-sm font-semibold sm:text-base">
                  ₹{Number(i.price).toFixed(2)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  per session
                </div>
              </div>
            </article>
          ))}

          {!activeItems.length && (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted">
              Menu is currently empty. Please check again later.
            </div>
          )}
        </section>

        {/* Footer (mobile) */}
        <footer className="mt-8 text-center text-xs text-muted sm:hidden">
          <div>Powered by Bill Book</div>
          <div className="mt-1">
            <Link href="/dashboard" className="text-primary hover:underline">
              Staff login
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}