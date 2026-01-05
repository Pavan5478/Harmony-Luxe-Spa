// src/app/(app)/menu/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MenuAdminClient from "@/components/menu/admin/MenuAdminClient";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

  return <MenuAdminClient />;
}