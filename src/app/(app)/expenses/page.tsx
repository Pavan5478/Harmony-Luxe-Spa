// src/app/(app)/expenses/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listExpenses } from "@/store/expenses";
import ExpensesClient from "@/components/expenses/ExpensesClient";

export const dynamic = "force-dynamic";

type SP = {
  page?: string;
};

function buildHrefWithSP(
  sp: Record<string, string | undefined>,
  patch: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  const merged = { ...sp, ...patch };

  Object.entries(merged).forEach(([k, v]) => {
    const s = String(v ?? "").trim();
    if (!s) return;
    params.set(k, s);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function Pagination({
  baseSP,
  page,
  totalPages,
  totalItems,
  pageSize,
}: {
  baseSP: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  const window = 2;
  const pages: (number | "dots")[] = [];

  const push = (x: number | "dots") => {
    if (pages.length && pages[pages.length - 1] === x) return;
    pages.push(x);
  };

  const left = Math.max(1, page - window);
  const right = Math.min(totalPages, page + window);

  push(1);
  if (left > 2) push("dots");
  for (let p = left; p <= right; p++) {
    if (p !== 1 && p !== totalPages) push(p);
  }
  if (right < totalPages - 1) push("dots");
  if (totalPages > 1) push(totalPages);

  const btnBase =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[12px] font-medium transition";
  const btn = `${btnBase} border-border bg-background hover:bg-card text-foreground`;
  const btnActive = `${btnBase} border-primary/30 bg-primary/10 text-primary`;
  const btnDisabled =
    `${btnBase} border-border/50 bg-muted/30 text-muted-foreground pointer-events-none opacity-60`;

  const prevHref = buildHrefWithSP(baseSP, { page: String(Math.max(1, page - 1)) });
  const nextHref = buildHrefWithSP(baseSP, { page: String(Math.min(totalPages, page + 1)) });

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-background/40 p-3 ring-1 ring-border/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          prefetch={false}
          href={prevHref}
          className={page <= 1 ? btnDisabled : btn}
          aria-disabled={page <= 1}
        >
          Prev
        </Link>

        {pages.map((p, idx) =>
          p === "dots" ? (
            <span key={`dots-${idx}`} className="px-2 text-[12px] text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={p}
              prefetch={false}
              href={buildHrefWithSP(baseSP, { page: String(p) })}
              className={p === page ? btnActive : btn}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          )
        )}

        <Link
          prefetch={false}
          href={nextHref}
          className={page >= totalPages ? btnDisabled : btn}
          aria-disabled={page >= totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const sp = (await searchParams) || {};

  const PAGE_SIZE = 15;
  const page = Math.max(1, Number.parseInt(String(sp.page || "1"), 10) || 1);

  const expensesAll = await listExpenses();

  const totalItems = expensesAll.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pagedExpenses = expensesAll.slice(startIdx, startIdx + PAGE_SIZE);

  const baseSP: Record<string, string | undefined> = {};

  return (
    <div className="mx-auto pb-10 pt-4">
      <ExpensesClient initialExpenses={pagedExpenses} />

      <Pagination
        baseSP={baseSP}
        page={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}