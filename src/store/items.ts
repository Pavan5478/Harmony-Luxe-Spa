// src/store/items.ts
import { google } from "googleapis";
import type { Item } from "@/types/billing";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Sheet/tab where menu is stored
const MENU_SHEET = "Menu";
// Data starts from row 2 (row 1 = headers)
const MENU_RANGE = `${MENU_SHEET}!A2:F`;

function ensureEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[items] Missing environment variable ${name} (needed for Google Sheets menu storage)`
    );
  }
  return value;
}

async function getSheetsClient() {
  const spreadsheetId = ensureEnv("GOOGLE_SHEETS_ID", SHEET_ID);
  const clientEmail = ensureEnv(
    "GOOGLE_CLIENT_EMAIL",
    process.env.GOOGLE_CLIENT_EMAIL
  );
  const rawKey = ensureEnv(
    "GOOGLE_PRIVATE_KEY",
    process.env.GOOGLE_PRIVATE_KEY
  );

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, spreadsheetId };
}

// ─────────────────────────────
// Helpers to map rows <-> Item
// ─────────────────────────────

function rowToItem(row: any[]): Item | null {
  const [id, name, variant, price, active, taxRate] = row ?? [];

  const cleanId = String(id ?? "").trim();
  const cleanName = String(name ?? "").trim();

  if (!cleanId && !cleanName) return null;

  const parsedPrice = Number(price ?? 0);
  const activeStr = String(active ?? "").toLowerCase();

  const isActive =
    activeStr === "" ||
    activeStr === "true" ||
    activeStr === "1" ||
    activeStr === "yes";

  const tr =
    taxRate === undefined || taxRate === null || taxRate === ""
      ? undefined
      : Number(taxRate);

  return {
    id: cleanId,
    name: cleanName,
    variant: variant ? String(variant) : undefined,
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    active: isActive,
    taxRate: tr,
  };
}

function itemToRow(item: Item): any[] {
  return [
    item.id,
    item.name,
    item.variant ?? "",
    item.price ?? 0,
    item.active ? "TRUE" : "FALSE",
    item.taxRate != null ? item.taxRate : "",
  ];
}

async function readMenuRows(): Promise<any[][]> {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: MENU_RANGE,
  });

  return (res.data.values as any[][]) ?? [];
}

async function writeMenuRows(rows: any[][]): Promise<void> {
  const { sheets, spreadsheetId } = await getSheetsClient();

  // Clear existing data from A2:F
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: MENU_RANGE,
  });

  if (!rows.length) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: MENU_RANGE,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

// ─────────────────────────────
// Public API (used by /api/items)
// ─────────────────────────────

export async function listAll(): Promise<Item[]> {
  const rows = await readMenuRows();
  const out: Item[] = [];

  for (const row of rows) {
    const it = rowToItem(row);
    if (it) out.push(it);
  }

  // Keep latest version first if there are duplicates by id
  const byId = new Map<string, Item>();
  for (const it of out) {
    byId.set(it.id, it);
  }
  return Array.from(byId.values());
}

export async function listActive(): Promise<Item[]> {
  const all = await listAll();
  return all.filter((i) => i.active);
}

// Create / update (upsert) item in Menu sheet
export async function upsertItem(item: Item): Promise<Item> {
  const rows = await readMenuRows();
  const rowData = itemToRow(item);

  const existingIndex = rows.findIndex(
    (r) => String(r[0] ?? "").trim() === item.id
  );

  const { sheets, spreadsheetId } = await getSheetsClient();

  if (existingIndex === -1) {
    // Append a new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: MENU_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowData] },
    });
  } else {
    // Update existing row in-place
    const rowNumber = existingIndex + 2; // +2 because data starts on row 2
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${MENU_SHEET}!A${rowNumber}:F${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowData] },
    });
  }

  return item;
}

// Hard delete: remove the row and rewrite the range
export async function removeItem(id: string): Promise<void> {
  const rows = await readMenuRows();
  const filtered = rows.filter(
    (r) => String(r[0] ?? "").trim() !== String(id).trim()
  );

  if (filtered.length === rows.length) {
    // Nothing to delete
    return;
  }

  await writeMenuRows(filtered);
}