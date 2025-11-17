// src/app/api/admin/bootstrap-sheets/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ensureSheetStructure } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  const role = session.user?.role;

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureSheetStructure();

  return NextResponse.json({ ok: true });
}