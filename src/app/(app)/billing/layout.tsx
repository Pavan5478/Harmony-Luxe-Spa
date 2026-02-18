import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  const role = session.user?.role;
  if (role !== "ADMIN" && role !== "CASHIER") {
    redirect("/dashboard");
  }

  return children;
}
