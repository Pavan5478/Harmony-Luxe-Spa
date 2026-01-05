// src/app/api/customers/rebuild/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rebuildCustomersIndexFromInvoices } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  const role = session.user?.role;

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await rebuildCustomersIndexFromInvoices();
  return NextResponse.json({ ok: true });
}
