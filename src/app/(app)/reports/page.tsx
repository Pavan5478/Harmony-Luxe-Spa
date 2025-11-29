// src/app/(app)/reports/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import { listExpenses } from "@/store/expenses";
import ReportsClient from "@/components/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }

  const role = session.user?.role as string | undefined;

  const [bills, expenses] = await Promise.all([
    listBills(),
    listExpenses(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <ReportsClient
        initialBills={bills as any[]}
        initialExpenses={expenses as any[]}
        nowISO={new Date().toISOString()}
        role={role}
      />
    </div>
  );
}
