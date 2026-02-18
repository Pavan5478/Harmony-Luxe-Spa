import { NextResponse } from "next/server";
import { getUser, setPassword } from "@/lib/users";
import { verifyPasswordSetupToken } from "@/lib/passwordSetupToken";

export async function POST(req: Request) {
  let body: { email?: string; newPassword?: string; setupToken?: string } = {};
  try {
    body = (await req.json()) as { email?: string; newPassword?: string; setupToken?: string };
  } catch {
    // keep empty body
  }
  const { email, newPassword, setupToken } = body;

  const tok = verifyPasswordSetupToken(setupToken);
  if (!tok.ok) {
    return NextResponse.json({ ok: false, error: tok.error }, { status: 401 });
  }

  const requestedEmail = String(email || "").trim().toLowerCase();
  if (!requestedEmail || requestedEmail !== tok.email) {
    return NextResponse.json(
      { ok: false, error: "Token does not match email" },
      { status: 401 }
    );
  }

  if (!newPassword || String(newPassword).trim().length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const u = await getUser(requestedEmail);
  if (!u) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  if (u.hash) return NextResponse.json({ ok: false, error: "Password already set" }, { status: 400 });

  await setPassword(requestedEmail, u.role || "CASHIER", String(newPassword));
  return NextResponse.json({ ok: true });
}
