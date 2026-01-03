// src/app/(app)/reports/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import { listExpenses } from "@/store/expenses";
import ReportsClient from "@/components/reports/ReportsClient";
import MonthlySummary from "@/components/reports/MonthlySummary";
import DownloadForm from "@/components/reports/DownloadForm";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const role = session.user.role as string | undefined;
  const canExport = role === "ADMIN" || role === "ACCOUNTS";

  const [bills, expenses] = await Promise.all([listBills(), listExpenses()]);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-3 pb-10 pt-4 sm:px-5 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <ReportsClient
            initialBills={bills as any[]}
            initialExpenses={expenses as any[]}
            nowISO={new Date().toISOString()}
            role={role}
          />
        </div>

        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <div className="space-y-4">
            {canExport ? (
              <>
                <MonthlySummary initialExpenses={expenses as any[]} />
                <DownloadForm />
              </>
            ) : (
              <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">Exports locked</h2>
                <p className="mt-1 text-[12px] text-muted">
                  Monthly invoice summaries and CSV exports are available for <b>ADMIN</b> and{" "}
                  <b>ACCOUNTS</b>.
                </p>
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}