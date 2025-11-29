// src/app/(app)/expenses/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listExpenses } from "@/store/expenses";
import ExpensesClient from "@/components/expenses/ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const expenses = await listExpenses();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <ExpensesClient initialExpenses={expenses} />
    </div>
  );
}