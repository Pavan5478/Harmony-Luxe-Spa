// src/components/dashboard/QuickActions.tsx

type Card = {
    title: string;
    href: string;
  };
  
  type Props = {
    cards: Card[];
  };
  
  export default function QuickActions({ cards }: Props) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, idx) => {
          const accent =
            idx % 4 === 0
              ? "bg-indigo-50 text-indigo-600 ring-indigo-100"
              : idx % 4 === 1
              ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
              : idx % 4 === 2
              ? "bg-sky-50 text-sky-600 ring-sky-100"
              : "bg-amber-50 text-amber-600 ring-amber-100";
  
          return (
            <a
              key={c.title}
              href={c.href}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Quick action
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">
                    {c.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Open {c.title} workspace.
                  </p>
                </div>
  
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold ring-1 ${accent}`}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="opacity-80"
                  >
                    <path
                      d="M5 17h2.5V9H5v8Zm5.75 0h2.5V5h-2.5v12ZM16.5 17H19v-6h-2.5v6Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
  
              <div className="mt-3 flex items-center justify-between text-xs text-indigo-600">
                <span className="inline-flex items-center gap-1">
                  Go to {c.title}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="transition group-hover:translate-x-0.5"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
  
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-br from-indigo-50/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            </a>
          );
        })}
      </section>
    );
  }  