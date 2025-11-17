// src/components/dashboard/SidePanel.tsx

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
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 p-4 text-white shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-100/90">
            Role overview
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            Welcome back, {roleLabel}.
          </h2>
          <p className="mt-2 text-xs text-indigo-100/90">
            Use the shortcuts below to jump straight into billing, invoices
            and reports. Permissions and views are tailored to your role.
          </p>
        </div>
  
        {/* Shortcuts list */}
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted shadow-sm sm:p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Shortcuts
          </h3>
          <ul className="mt-2 space-y-1.5">
            {cards.map((c) => (
              <li key={c.href}>
                <a
                  href={c.href}
                  className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-slate-50"
                >
                  <span className="truncate font-medium text-slate-700">
                    {c.title}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Open
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }  