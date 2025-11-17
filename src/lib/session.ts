import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { Role } from "@/types/billing";

export type SessionData = {
  user?: { email: string; role: Role }; // ADMIN | CASHIER | ACCOUNTS
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "dev_only_change_me_please_change_me_32chars_XYZ",
  cookieName: "bb.session",
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
};

export async function getSession() {
  const c = await cookies();
  return getIronSession<SessionData>(c, sessionOptions);
}