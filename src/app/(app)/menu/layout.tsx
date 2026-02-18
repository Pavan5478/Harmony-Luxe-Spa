import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return children;
}
