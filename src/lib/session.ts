import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { Role } from "@/types/billing";

export type SessionData = {
  user?: { email: string; role: Role }; // ADMIN | CASHIER | ACCOUNTS
};

function resolveSessionSecret(): string {
  const fromEnv = String(process.env.SESSION_SECRET || "").trim();
  if (fromEnv.length >= 32) return fromEnv;

  const isProdBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !isProdBuild) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
  }

  // Development-only fallback to keep local setup simple.
  return "dev-session-secret-local-only-change-me-1234";
}

export const sessionOptions: SessionOptions = {
  password: resolveSessionSecret(),
  cookieName: "bb.session",
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
};

export async function getSession() {
  const c = await cookies();
  return getIronSession<SessionData>(c, sessionOptions);
}
