import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const role = session.user?.role;
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    redirect("/billing");
  }
  return children;
}
