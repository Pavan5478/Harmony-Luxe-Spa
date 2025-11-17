import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authenticate } from "@/lib/users";
import type { Role } from "@/types/billing";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const result = await authenticate(email, password);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json(
        { ok: false, message: "User not found" },
        { status: 404 }
      );
    }
    if (result.reason === "needs_setup") {
      return NextResponse.json(
        { ok: false, message: "Password not set for this user (column C empty)." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "Invalid credentials" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.user = { email: email.toLowerCase(), role: result.role as Role };
  await session.save();

  return NextResponse.json({ ok: true, role: result.role });
}