import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authenticate } from "@/lib/users";
import type { Role } from "@/types/billing";
import { createPasswordSetupToken } from "@/lib/passwordSetupToken";

type LoginBucket = { count: number; resetAt: number };

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 30;
const loginBuckets = new Map<string, LoginBucket>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(v: unknown): string {
  return String(v || "").trim().toLowerCase();
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

function bucketKey(req: Request, email: string) {
  return `${clientIp(req)}|${email || "-"}`;
}

function allowAttempt(key: string): boolean {
  const now = Date.now();
  const b = loginBuckets.get(key);
  if (!b || now >= b.resetAt) {
    loginBuckets.set(key, { count: 0, resetAt: now + ATTEMPT_WINDOW_MS });
    return true;
  }
  return b.count < MAX_ATTEMPTS_PER_WINDOW;
}

function markFailure(key: string) {
  const now = Date.now();
  const b = loginBuckets.get(key);
  if (!b || now >= b.resetAt) {
    loginBuckets.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
  } else {
    b.count += 1;
  }

  // Keep memory bounded.
  if (loginBuckets.size > 5000) {
    for (const [k, v] of loginBuckets) {
      if (now >= v.resetAt) loginBuckets.delete(k);
    }
  }
}

function clearFailures(key: string) {
  loginBuckets.delete(key);
}

function invalidCreds() {
  return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string } = {};
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    // keep default empty body
  }

  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const key = bucketKey(req, email);

  if (!allowAttempt(key)) {
    return NextResponse.json(
      { ok: false, message: "Too many login attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  if (!email || !password.trim()) {
    markFailure(key);
    await sleep(220);
    return invalidCreds();
  }

  const result = await authenticate(email, password);

  if (!result.ok) {
    markFailure(key);
    await sleep(220);

    if (result.reason === "needs_setup") {
      const setupToken = createPasswordSetupToken(email);
      return NextResponse.json(
        {
          ok: false,
          requirePasswordSetup: true,
          setupToken,
          message: "Password not set for this user. Please create one.",
        },
        { status: 409 }
      );
    }

    return invalidCreds();
  }

  clearFailures(key);

  const session = await getSession();
  session.user = { email, role: result.role as Role };
  await session.save();

  return NextResponse.json({ ok: true, role: result.role });
}
