// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authenticate } from "@/lib/users";
import type { Role } from "@/types/billing";
import { createPasswordSetupToken } from "@/lib/passwordSetupToken";

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
      // <– this is what the login page is looking for
      const setupToken = createPasswordSetupToken(String(email || ""));
      return NextResponse.json(
        {
          ok: false,
          requirePasswordSetup: true,
          setupToken,
          message:
            "Password not set for this user (column C empty). Please create one.",
        },
        { status: 409 }
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