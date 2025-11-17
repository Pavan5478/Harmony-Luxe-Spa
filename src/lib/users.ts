// src/lib/users.ts
import { google } from "googleapis";
import bcrypt from "bcryptjs";
import type { Role } from "@/types/billing";

const USERS_SHEET = "Users";

// ---------- helpers ----------

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var ${name} for Google Sheets user store.`);
  }
  return value;
}

function normalizeRole(role: string | undefined): Role {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN" || r === "CASHIER" || r === "ACCOUNTS") {
    return r as Role;
  }
  return "CASHIER";
}

function isBcryptHash(value: string | undefined): boolean {
  if (!value) return false;
  return (
    value.startsWith("$2a$") ||
    value.startsWith("$2b$") ||
    value.startsWith("$2y$")
  );
}

function getSheetsClient() {
  const clientEmail = requireEnv(
    "GOOGLE_CLIENT_EMAIL",
    process.env.GOOGLE_CLIENT_EMAIL
  );
  const rawKey = requireEnv(
    "GOOGLE_PRIVATE_KEY",
    process.env.GOOGLE_PRIVATE_KEY
  );
  const privateKey = rawKey.replace(/\\n/g, "\n");
  const spreadsheetId = requireEnv(
    "GOOGLE_SHEETS_ID",
    process.env.GOOGLE_SHEETS_ID
  );

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  return { sheets, spreadsheetId };
}

type UserRow = {
  email: string;
  role: Role;
  hash?: string;
  name?: string;
  rowIndex: number; // actual row number in the sheet (2,3,...)
};

// ---------- load / find users ----------

async function loadUsers(): Promise<UserRow[]> {
  const { sheets, spreadsheetId } = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A2:D`,
  });

  const rows = res.data.values || [];
  const users: UserRow[] = [];

  rows.forEach((row, idx) => {
    const email = String(row[0] || "").trim().toLowerCase();
    if (!email) return;

    const role = normalizeRole(row[1]);
    const hash = row[2] ? String(row[2]) : undefined;
    const name = row[3] ? String(row[3]) : undefined;

    users.push({
      email,
      role,
      hash,
      name,
      rowIndex: idx + 2, // offset by header row
    });
  });

  return users;
}

export async function getUser(email: string): Promise<UserRow | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const users = await loadUsers();
  return users.find((u) => u.email === e) || null;
}

// ---------- write password back to Google Sheets ----------

export async function setPassword(
  email: string,
  role: Role,
  newPassword: string
): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) throw new Error("Email required for setPassword");

  const { sheets, spreadsheetId } = getSheetsClient();
  const users = await loadUsers();
  const existing = users.find((u) => u.email === e);

  const hash = await bcrypt.hash(newPassword, 10);

  if (existing) {
    // Update the existing row A:D
    const row = existing.rowIndex;
    const values = [[e, role, hash, existing.name || ""]];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USERS_SHEET}!A${row}:D${row}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    // Append new row if user does not exist yet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${USERS_SHEET}!A2:D2`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[e, role, hash, ""]],
      },
    });
  }
}

// ---------- authentication helpers ----------

export async function authenticate(
  email: string,
  password: string
): Promise<
  | { ok: true; role: Role }
  | { ok: false; reason: "not_found" | "needs_setup" | "invalid" }
> {
  const u = await getUser(email);
  if (!u) return { ok: false, reason: "not_found" };

  const stored = (u.hash || "").trim();
  if (!stored) {
    // No password in column C yet
    return { ok: false, reason: "needs_setup" };
  }

  // If column C is already a bcrypt hash
  if (isBcryptHash(stored)) {
    const ok = await bcrypt.compare(password, stored);
    if (!ok) return { ok: false, reason: "invalid" };
    return { ok: true, role: u.role };
  }

  // Column C contains a plain password (migration)
  if (stored !== password) {
    return { ok: false, reason: "invalid" };
  }

  // Upgrade plain text -> bcrypt hash
  await setPassword(u.email, u.role, password);
  return { ok: true, role: u.role };
}

export async function verify(
  email: string,
  password: string
): Promise<boolean> {
  const u = await getUser(email);
  if (!u) return false;

  const stored = (u.hash || "").trim();
  if (!stored) return false;

  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }

  // plain text (legacy)
  return stored === password;
}