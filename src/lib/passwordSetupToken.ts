// src/lib/passwordSetupToken.ts
// Minimal signed token for first-time password setup.
// Purpose: when /api/login detects a user with no password hash, it returns a short-lived
// token that must be presented to /api/auth/set-first-password.

import crypto from "crypto";

type Payload = {
  v: 1;
  email: string;
  iat: number; // issued at (unix seconds)
  exp: number; // expires at (unix seconds)
};

function base64UrlEncode(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function getSecret(): string {
  // Reuse session secret to avoid adding another required env.
  // In production, SESSION_SECRET MUST be set.
  return (
    process.env.PASSWORD_SETUP_SECRET ||
    process.env.SESSION_SECRET ||
    "dev_only_change_me_please_change_me_32chars_XYZ"
  );
}

function sign(payloadB64: string): string {
  const h = crypto.createHmac("sha256", getSecret());
  h.update(payloadB64);
  return base64UrlEncode(h.digest());
}

export function createPasswordSetupToken(email: string, ttlSeconds = 15 * 60): string {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email missing");
  const now = Math.floor(Date.now() / 1000);
  const payload: Payload = {
    v: 1,
    email: e,
    iat: now,
    exp: now + Math.max(60, ttlSeconds),
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sigB64 = sign(payloadB64);
  return `${payloadB64}.${sigB64}`;
}

export function verifyPasswordSetupToken(token: string | undefined | null):
  | { ok: true; email: string }
  | { ok: false; error: string } {
  const t = String(token || "").trim();
  if (!t) return { ok: false, error: "Missing token" };

  const parts = t.split(".");
  if (parts.length !== 2) return { ok: false, error: "Invalid token format" };
  const [payloadB64, sigB64] = parts;

  const expected = sign(payloadB64);
  // timingSafeEqual requires same-length buffers
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sigB64 || ""));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Invalid token signature" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, error: "Invalid token payload" };
  }

  if (!payload || payload.v !== 1) return { ok: false, error: "Invalid token version" };
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) return { ok: false, error: "Token expired" };
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Token email missing" };

  return { ok: true, email };
}
