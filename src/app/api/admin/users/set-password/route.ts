import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { setPassword } from "@/lib/users";
import type { Role } from "@/types/billing";

/**
 * POST { email, role, newPassword }
 * ADMIN only. Appends a new row with a fresh hash in Users sheet.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { email, role, newPassword } = await req.json();
  if (!email || !newPassword) {
    return NextResponse.json({ ok: false, error: "Missing email or newPassword" }, { status: 400 });
  }

  const r: Role =
    String(role || "CASHIER").toUpperCase() as Role;

  await setPassword(String(email), r, String(newPassword));
  return NextResponse.json({ ok: true });
}