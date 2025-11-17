import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MonthlySummary from "@/components/reports/MonthlySummary";
import DownloadForm from "@/components/reports/DownloadForm";

export default async function ReportsPage() {
  const session = await getSession();
  const role = session.user?.role;
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header card */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Reports
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Revenue & invoice analytics
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              View month-wise performance, payment mix and export invoice data
              to CSV. Only Admin &amp; Accounts users can access this area.
            </p>
          </div>
          <div className="rounded-xl bg-background px-3 py-2 text-[11px] text-muted sm:text-xs">
            <div className="font-medium text-foreground">Data source</div>
            <div>Google Sheets &bull; Invoices sheet</div>
            <div className="mt-1">
              Values are based on finalized invoices and recorded ISO dates.
            </div>
          </div>
        </div>
      </section>

      {/* Layout: summary on the left, download on the right */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
        <MonthlySummary />
        <DownloadForm />
      </div>
    </div>
  );
}