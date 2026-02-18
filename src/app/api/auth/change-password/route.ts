import { NextResponse } from "next/server";
import { getUser, verify, setPassword } from "@/lib/users";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; oldPassword?: string; newPassword?: string } = {};
  try {
    body = (await req.json()) as { email?: string; oldPassword?: string; newPassword?: string };
  } catch {
    // keep empty body
  }

  const { email, oldPassword, newPassword } = body;

  const isAdmin = session.user.role === "ADMIN";
  const targetEmail = (isAdmin && email ? String(email) : String(session.user.email))
    .trim()
    .toLowerCase();

  if (!newPassword || String(newPassword).trim().length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const u = await getUser(targetEmail);
  if (!u) return NextResponse.json({ ok:false, error:"User not found" }, { status: 404 });

  // Non-admin must prove current password.
  if (!isAdmin) {
    if (!oldPassword || !String(oldPassword).trim()) {
      return NextResponse.json({ ok: false, error: "Current password required" }, { status: 400 });
    }
    const ok = await verify(targetEmail, String(oldPassword));
    if (!ok) {
      return NextResponse.json({ ok:false, error:"Old password incorrect" }, { status: 400 });
    }
  }

  // Admin reset: allow even if old password is unknown.
  await setPassword(targetEmail, u.role || "CASHIER", String(newPassword));
  return NextResponse.json({ ok: true });
}
