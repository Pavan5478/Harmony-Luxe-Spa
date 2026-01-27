// src/lib/sheets.ts
import { google } from "googleapis";

// ---------- auth + client helpers ----------
let _cachedClient:
  | {
      sheets: ReturnType<typeof google.sheets>;
      spreadsheetId: string;
    }
  | null = null;

function getAuth() {
  const client_email = process.env.GOOGLE_CLIENT_EMAIL!;
  const private_key = (process.env.GOOGLE_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  if (!client_email || !private_key) {
    throw new Error("Google creds missing");
  }

  return new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  if (_cachedClient) return _cachedClient;

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID env missing");
  }

  _cachedClient = { sheets, spreadsheetId };
  return _cachedClient;
}

// ---------- generic helpers ----------
export async function appendRows(range: string, values: any[][]) {
  const { sheets, spreadsheetId } = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export async function readRows(range: string) {
  const { sheets, spreadsheetId } = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
}

// ---------- InvoiceIndex helpers (FIXED: auto-create sheet + no full rewrite on every save) ----------
const INVOICE_SHEET = "Invoices";
const INDEX_SHEET = "InvoiceIndex";

// ---------- Customers index ----------
const CUSTOMER_SHEET = "Customers";
const CUSTOMER_INDEX_SHEET = "CustomerIndex";

function a1(sheet: string, range: string) {
  // Always quote sheet names to be safe
  const safe = sheet.replace(/'/g, "''");
  return `'${safe}'!${range}`;
}

const INVOICE_RANGE_ALL = a1(INVOICE_SHEET, "A2:X");
const INDEX_RANGE_ALL = a1(INDEX_SHEET, "A2:C");
const INDEX_APPEND_RANGE = a1(INDEX_SHEET, "A2:C");
const INDEX_HEADER_RANGE = a1(INDEX_SHEET, "A1:C1");

// Customers: A..L
// A Key
// B Name
// C Phone
// D Email
// E FirstSeenISO
// F LastSeenISO
// G InvoicesCount
// H FinalCount
// I DraftCount
// J VoidCount
// K TotalFinalSpend
// L UpdatedAt
const CUSTOMER_RANGE_ALL = a1(CUSTOMER_SHEET, "A2:L");
const CUSTOMER_APPEND_RANGE = a1(CUSTOMER_SHEET, "A2:L");
const CUSTOMER_HEADER_RANGE = a1(CUSTOMER_SHEET, "A1:L1");

const CUSTOMER_INDEX_RANGE_ALL = a1(CUSTOMER_INDEX_SHEET, "A2:C");
const CUSTOMER_INDEX_APPEND_RANGE = a1(CUSTOMER_INDEX_SHEET, "A2:C");
const CUSTOMER_INDEX_HEADER_RANGE = a1(CUSTOMER_INDEX_SHEET, "A1:C1");

let _indexReady: Promise<void> | null = null;

let _customerSheetsReady: Promise<void> | null = null;

async function ensureIndexSheet() {
  if (_indexReady) return _indexReady;

  _indexReady = (async () => {
    const { sheets, spreadsheetId } = getSheetsClient();

    // Check if sheet exists
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties(sheetId,title))",
    });

    const exists = (meta.data.sheets || []).some(
      (s) => s.properties?.title === INDEX_SHEET
    );

    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: INDEX_SHEET } } }],
        },
      });
    }

    // Ensure headers exist (idempotent)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: INDEX_HEADER_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Key", "Row", "UpdatedAt"]] },
    });
  })();

  return _indexReady;
}

async function ensureCustomerSheets() {
  if (_customerSheetsReady) return _customerSheetsReady;

  _customerSheetsReady = (async () => {
    const { sheets, spreadsheetId } = getSheetsClient();

    // Check if sheets exist
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties(sheetId,title))",
    });

    const titles = new Set(
      (meta.data.sheets || [])
        .map((s) => s.properties?.title)
        .filter((t): t is string => !!t)
    );

    const req: any[] = [];
    if (!titles.has(CUSTOMER_SHEET)) {
      req.push({ addSheet: { properties: { title: CUSTOMER_SHEET } } });
    }
    if (!titles.has(CUSTOMER_INDEX_SHEET)) {
      req.push({ addSheet: { properties: { title: CUSTOMER_INDEX_SHEET } } });
    }

    if (req.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: req },
      });
    }

    // Headers (idempotent)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: CUSTOMER_HEADER_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            "Key",
            "Name",
            "Phone",
            "Email",
            "FirstSeenISO",
            "LastSeenISO",
            "InvoicesCount",
            "FinalCount",
            "DraftCount",
            "VoidCount",
            "TotalFinalSpend",
            "UpdatedAt",
          ],
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: CUSTOMER_INDEX_HEADER_RANGE,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["Key", "Row", "UpdatedAt"]] },
    });
  })();

  return _customerSheetsReady;
}

function parseRowNumberFromA1Range(a1Range: string | undefined | null): number | null {
  if (!a1Range) return null;
  const m = a1Range.match(/!A(\d+)(?::|$)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

async function safeReadIndexRows(): Promise<any[][]> {
  await ensureIndexSheet();
  try {
    return await readRows(INDEX_RANGE_ALL);
  } catch {
    return [];
  }
}

async function safeReadCustomerIndexRows(): Promise<any[][]> {
  await ensureCustomerSheets();
  try {
    return await readRows(CUSTOMER_INDEX_RANGE_ALL);
  } catch {
    return [];
  }
}

async function getInvoiceRowNumberFromIndex(key: string): Promise<number | null> {
  const k = String(key || "").trim();
  if (!k) return null;

  const rows = await safeReadIndexRows();
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i] || [];
    if (String(row[0] ?? "").trim() === k) {
      const rn = Number(row[1] ?? 0);
      return Number.isFinite(rn) && rn > 0 ? rn : null;
    }
  }
  return null;
}

async function getCustomerRowNumberFromIndex(key: string): Promise<number | null> {
  const k = String(key || "").trim();
  if (!k) return null;

  const rows = await safeReadCustomerIndexRows();
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i] || [];
    if (String(row[0] ?? "").trim() === k) {
      const rn = Number(row[1] ?? 0);
      return Number.isFinite(rn) && rn > 0 ? rn : null;
    }
  }
  return null;
}

async function upsertIndex(key: string, invoiceRowNumber: number) {
  const k = String(key || "").trim();
  if (!k) return;

  await ensureIndexSheet();

  const { sheets, spreadsheetId } = getSheetsClient();
  const now = new Date().toISOString();
  const rows = await safeReadIndexRows();

  // Find existing key
  let foundIx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i]?.[0] ?? "").trim() === k) {
      foundIx = i;
      break;
    }
  }

  if (foundIx === -1) {
    // Append new key
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: INDEX_APPEND_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[k, invoiceRowNumber, now]] },
    });
  } else {
    // Update existing row
    const rowNumber = foundIx + 2; // + header
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(INDEX_SHEET, `A${rowNumber}:C${rowNumber}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[k, invoiceRowNumber, now]] },
    });
  }
}

async function upsertCustomerIndex(key: string, customerRowNumber: number) {
  const k = String(key || "").trim();
  if (!k) return;

  await ensureCustomerSheets();

  const { sheets, spreadsheetId } = getSheetsClient();
  const now = new Date().toISOString();
  const rows = await safeReadCustomerIndexRows();

  let foundIx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i]?.[0] ?? "").trim() === k) {
      foundIx = i;
      break;
    }
  }

  if (foundIx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: CUSTOMER_INDEX_APPEND_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[k, customerRowNumber, now]] },
    });
  } else {
    const rowNumber = foundIx + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: a1(CUSTOMER_INDEX_SHEET, `A${rowNumber}:C${rowNumber}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[k, customerRowNumber, now]] },
    });
  }
}

async function deleteIndexKeys(keys: string[]) {
  const want = new Set(keys.map((x) => String(x || "").trim()).filter(Boolean));
  if (!want.size) return;

  await ensureIndexSheet();

  const { sheets, spreadsheetId } = getSheetsClient();
  const rows = await safeReadIndexRows();
  const filtered = rows.filter((r) => !want.has(String(r?.[0] ?? "").trim()));

  // Clear
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: INDEX_RANGE_ALL,
  });

  // Rewrite if any left
  if (filtered.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: INDEX_RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: filtered },
    });
  }
}

async function shiftIndexRowsAfter(deletedInvoiceRow: number) {
  await ensureIndexSheet();

  const { sheets, spreadsheetId } = getSheetsClient();
  const rows = await safeReadIndexRows();
  if (!rows.length) return;

  let changed = false;
  const next = rows.map((r) => {
    const key = String(r?.[0] ?? "").trim();
    const rowNum = Number(r?.[1] ?? 0);
    const updatedAt = r?.[2] ?? "";
    if (!key || !Number.isFinite(rowNum) || rowNum <= 0) return r;

    if (rowNum > deletedInvoiceRow) {
      changed = true;
      return [key, rowNum - 1, updatedAt];
    }
    return r;
  });

  if (!changed) return;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: INDEX_RANGE_ALL,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: INDEX_RANGE_ALL,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: next },
  });
}

// ---------- customer helpers ----------
function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}

/**
 * Normalizes a phone number into 10 digits (best-effort).
 * - "98765 43210" -> "9876543210"
 * - "+91 9876543210" -> "9876543210"
 */
function normalizePhone(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length === 10) return d;
  if (d.length > 10) return d.slice(-10);
  return d;
}

function makeCustomerKey(phone: string, email: string): string | null {
  const p = normalizePhone(phone);
  if (p) return p;
  const e = String(email || "").trim().toLowerCase();
  return e || null;
}

function parseISOTs(iso: string): number {
  const t = Date.parse(String(iso || ""));
  return Number.isFinite(t) ? t : NaN;
}

function invoiceRowMeta(r: any[] | null | undefined) {
  if (!r) return null;
  const billNo = String(r[0] ?? "").trim();
  const draftId = String(r[1] ?? "").trim();
  const dateISO = String(r[2] ?? "").trim();
  const name = String(r[3] ?? "").trim();
  const phone = String(r[4] ?? "").trim();
  const email = String(r[5] ?? "").trim();
  const status = String(r[22] ?? "FINAL").trim().toUpperCase();
  const amount = Number(r[15] ?? 0) || 0;
  const key = makeCustomerKey(phone, email);
  return { billNo, draftId, dateISO, name, phone, email, status, amount, key };
}

async function readCustomerRowByKey(key: string): Promise<{ rowNumber: number; row: any[] } | null> {
  const k = String(key || "").trim();
  if (!k) return null;
  await ensureCustomerSheets();

  const { sheets, spreadsheetId } = getSheetsClient();
  const rn = await getCustomerRowNumberFromIndex(k);
  if (!rn) return null;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CUSTOMER_SHEET}!A${rn}:L${rn}`,
  });
  const row = (res.data.values || [])[0];
  if (!row || !row.length) return null;
  return { rowNumber: rn, row };
}

async function upsertCustomerRow(key: string, nextRow: any[]) {
  const k = String(key || "").trim();
  if (!k) return;
  await ensureCustomerSheets();

  const { sheets, spreadsheetId } = getSheetsClient();
  const existing = await readCustomerRowByKey(k);

  if (!existing) {
    const appended = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: CUSTOMER_APPEND_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [nextRow] },
    });

    const rn = parseRowNumberFromA1Range(appended.data.updates?.updatedRange);
    if (rn) await upsertCustomerIndex(k, rn);
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${CUSTOMER_SHEET}!A${existing.rowNumber}:L${existing.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [nextRow] },
    });
    await upsertCustomerIndex(k, existing.rowNumber);
  }
}

async function applyCustomerDelta(
  key: string,
  patch: {
    name?: string;
    phone?: string;
    email?: string;
    firstSeenISO?: string;
    lastSeenISO?: string;
    deltaInvoices?: number;
    deltaFinal?: number;
    deltaDraft?: number;
    deltaVoid?: number;
    deltaTotalFinal?: number;
  }
) {
  const k = String(key || "").trim();
  if (!k) return;
  await ensureCustomerSheets();

  const now = new Date().toISOString();
  const existing = await readCustomerRowByKey(k);

  // If we don't have a row yet and this is only a negative delta, skip.
  if (!existing) {
    const di = Number(patch.deltaInvoices || 0);
    const df = Number(patch.deltaFinal || 0);
    const dd = Number(patch.deltaDraft || 0);
    const dv = Number(patch.deltaVoid || 0);
    const dt = Number(patch.deltaTotalFinal || 0);
    if (di <= 0 && df <= 0 && dd <= 0 && dv <= 0 && dt <= 0) return;

    const row = [
      k,
      patch.name || "",
      patch.phone || "",
      patch.email || "",
      patch.firstSeenISO || patch.lastSeenISO || now,
      patch.lastSeenISO || patch.firstSeenISO || now,
      Math.max(0, di),
      Math.max(0, df),
      Math.max(0, dd),
      Math.max(0, dv),
      Math.max(0, dt),
      now,
    ];
    await upsertCustomerRow(k, row);
    return;
  }

  const r = existing.row;
  const curName = String(r[1] ?? "").trim();
  const curPhone = String(r[2] ?? "").trim();
  const curEmail = String(r[3] ?? "").trim();
  const curFirst = String(r[4] ?? "").trim();
  const curLast = String(r[5] ?? "").trim();

  const invCount = Math.max(0, (Number(r[6] ?? 0) || 0) + (Number(patch.deltaInvoices || 0) || 0));
  const finalCount = Math.max(0, (Number(r[7] ?? 0) || 0) + (Number(patch.deltaFinal || 0) || 0));
  const draftCount = Math.max(0, (Number(r[8] ?? 0) || 0) + (Number(patch.deltaDraft || 0) || 0));
  const voidCount = Math.max(0, (Number(r[9] ?? 0) || 0) + (Number(patch.deltaVoid || 0) || 0));
  const totalFinal = Math.max(0, (Number(r[10] ?? 0) || 0) + (Number(patch.deltaTotalFinal || 0) || 0));

  // first/last seen: best-effort
  let firstSeen = curFirst || patch.firstSeenISO || "";
  let lastSeen = curLast || patch.lastSeenISO || "";
  const firstTs = parseISOTs(firstSeen);
  const lastTs = parseISOTs(lastSeen);
  const pFirstTs = parseISOTs(String(patch.firstSeenISO || ""));
  const pLastTs = parseISOTs(String(patch.lastSeenISO || ""));

  if (Number.isFinite(pFirstTs) && (!Number.isFinite(firstTs) || pFirstTs < firstTs)) {
    firstSeen = String(patch.firstSeenISO);
  }
  if (Number.isFinite(pLastTs) && (!Number.isFinite(lastTs) || pLastTs > lastTs)) {
    lastSeen = String(patch.lastSeenISO);
  }

  const nextRow = [
    k,
    patch.name || curName,
    patch.phone || curPhone,
    patch.email || curEmail,
    firstSeen,
    lastSeen,
    invCount,
    finalCount,
    draftCount,
    voidCount,
    totalFinal,
    now,
  ];

  await upsertCustomerRow(k, nextRow);
}


// ---------- invoices ----------

/**
 * Upsert a row in Invoices sheet.
 * FAST PATH: if InvoiceIndex has row number, update exact row (no full scan).
 * FALLBACK: scan Invoices!A2:X.
 */
async function upsertInvoiceRow(
  bill: any,
  invRow: any[]
): Promise<{ rowNumber: number | null; prevRow: any[] | null; existed: boolean }> {
  const { sheets, spreadsheetId } = getSheetsClient();
  const draftId = String(bill.id ?? "").trim();
  const billNo = String(bill.billNo ?? "").trim();

  // 1) FAST: try index lookup by DraftId (best key)
  let rowNumber: number | null = null;
  if (draftId) rowNumber = await getInvoiceRowNumberFromIndex(draftId);
  if (!rowNumber && billNo) rowNumber = await getInvoiceRowNumberFromIndex(billNo);

  // 2) If we have rowNumber, update directly
  if (rowNumber) {
    const rowRange = `Invoices!A${rowNumber}:X${rowNumber}`;

    // Read previous row (for customer delta)
    let prevRow: any[] | null = null;
    try {
      const prev = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: rowRange,
      });
      prevRow = (prev.data.values || [])[0] || null;
    } catch {
      prevRow = null;
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [invRow] },
    });

    // keep index synced for both keys
    if (draftId) await upsertIndex(draftId, rowNumber);
    if (billNo) await upsertIndex(billNo, rowNumber);
    return { rowNumber, prevRow, existed: !!prevRow };
  }

  // 3) FALLBACK: scan entire invoice sheet (slow, but only if index is missing)
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: INVOICE_RANGE_ALL,
  });

  const rows = existing.data.values || [];

  let index = -1;
  if (draftId) {
    index = rows.findIndex((r) => String(r[1] ?? "").trim() === draftId);
  }
  if (index === -1 && billNo) {
    index = rows.findIndex((r) => String(r[0] ?? "").trim() === billNo);
  }

  if (index === -1) {
    const appended = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: INVOICE_RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [invRow] },
    });

    const rn = parseRowNumberFromA1Range(appended.data.updates?.updatedRange);
    if (rn) {
      if (draftId) await upsertIndex(draftId, rn);
      if (billNo) await upsertIndex(billNo, rn);
    }
    return { rowNumber: rn, prevRow: null, existed: false };
  } else {
    const rn = index + 2; // header row = 1
    const rowRange = `Invoices!A${rn}:X${rn}`;
    const prevRow = rows[index] || null;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [invRow] },
    });

    if (draftId) await upsertIndex(draftId, rn);
    if (billNo) await upsertIndex(billNo, rn);
    return { rowNumber: rn, prevRow, existed: true };
  }
}

/**
 * Writes one bill into:
 *  - Invoices (summary row, upsert by DraftId/BillNo)
 *  - Lines     (one row per line item, appended for FINAL bills)
 *
 * It also stores the full bill JSON in the last column (RawJson)
 * so we can reconstruct everything from Sheets later.
 *
 * Supports bill.billDate (manual invoice date).
 */
export async function saveInvoiceToSheets(bill: any) {
  const t = bill.totals || {};
  const tax = (t.igst || 0) + (t.cgst || 0) + (t.sgst || 0);
  const gstPct = t.taxableBase > 0 ? +((tax / t.taxableBase) * 100).toFixed(2) : 0;

  // payment splits
  const gt = t.grandTotal || 0;
  let cash = 0,
    card = 0,
    upi = 0;
  switch (bill.paymentMode) {
    case "CASH":
      cash = gt;
      break;
    case "CARD":
      card = gt;
      break;
    case "UPI":
      upi = gt;
      break;
    case "SPLIT":
      cash = bill.split?.cash || 0;
      card = bill.split?.card || 0;
      upi = bill.split?.upi || 0;
      break;
  }

  const status = bill.status || "FINAL";
  const rawJson = JSON.stringify(bill ?? {});

  // prefer manual billDate if provided
  const dateISO = bill.billDate || bill.finalizedAt || bill.createdAt || new Date().toISOString();

  // 24 columns (A:X)
  const invRow = [
    bill.billNo || "", // A BillNo
    bill.id || "", // B DraftId
    dateISO, // C DateISO
    bill.customer?.name || "", // D
    bill.customer?.phone || "", // E
    bill.customer?.email || "", // F
    gstPct, // G
    bill.isInterState ? "Y" : "N", // H
    t.subtotal || 0, // I
    t.discount || 0, // J
    t.taxableBase || 0, // K
    t.cgst || 0, // L
    t.sgst || 0, // M
    t.igst || 0, // N
    t.roundOff || 0, // O
    gt, // P
    bill.paymentMode || "", // Q
    cash, // R
    card, // S
    upi, // T
    bill.notes || "", // U
    bill.cashierEmail || "", // V
    status, // W
    rawJson, // X RawJson
  ];

  const { prevRow, existed } = await upsertInvoiceRow(bill, invRow);

  // Update customer index (fast customer list)
  try {
    const prev = invoiceRowMeta(prevRow);
    const next = invoiceRowMeta(invRow);

    const oldKey = prev?.key || null;
    const newKey = next?.key || null;

    const oldStatus = (prev?.status || "").toUpperCase();
    const newStatus = (next?.status || "").toUpperCase();

    const oldFinal = oldStatus === "FINAL";
    const newFinal = newStatus === "FINAL";
    const oldAmt = oldFinal ? Number(prev?.amount || 0) || 0 : 0;
    const newAmt = newFinal ? Number(next?.amount || 0) || 0 : 0;

    const dateISOForNew = next?.dateISO || new Date().toISOString();

    // Helper to translate status to counters
    const statusDelta = (st: string, d: number) => {
      const s = String(st || "").toUpperCase();
      if (s === "FINAL") return { df: d, dd: 0, dv: 0 };
      if (s === "DRAFT") return { df: 0, dd: d, dv: 0 };
      if (s === "VOID") return { df: 0, dd: 0, dv: d };
      return { df: 0, dd: 0, dv: 0 };
    };

    if (!existed) {
      // New invoice row
      if (newKey) {
        const sd = statusDelta(newStatus, +1);
        await applyCustomerDelta(newKey, {
          name: next?.name,
          phone: next?.phone,
          email: next?.email,
          firstSeenISO: dateISOForNew,
          lastSeenISO: dateISOForNew,
          deltaInvoices: 1,
          deltaFinal: sd.df,
          deltaDraft: sd.dd,
          deltaVoid: sd.dv,
          deltaTotalFinal: newAmt,
        });
      }
    } else {
      // Existing invoice row updated
      if (oldKey && newKey && oldKey !== newKey) {
        // Move invoice between customers
        const sdOld = statusDelta(oldStatus, -1);
        await applyCustomerDelta(oldKey, {
          deltaInvoices: -1,
          deltaFinal: sdOld.df,
          deltaDraft: sdOld.dd,
          deltaVoid: sdOld.dv,
          deltaTotalFinal: -oldAmt,
        });

        const sdNew = statusDelta(newStatus, +1);
        await applyCustomerDelta(newKey, {
          name: next?.name,
          phone: next?.phone,
          email: next?.email,
          firstSeenISO: dateISOForNew,
          lastSeenISO: dateISOForNew,
          deltaInvoices: 1,
          deltaFinal: sdNew.df,
          deltaDraft: sdNew.dd,
          deltaVoid: sdNew.dv,
          deltaTotalFinal: newAmt,
        });
      } else {
        // Same customer (or key missing): apply status/amount delta
        const targetKey = newKey || oldKey;
        if (targetKey) {
          // status counters
          let dFinal = 0,
            dDraft = 0,
            dVoid = 0;
          if (oldStatus !== newStatus) {
            const minus = statusDelta(oldStatus, -1);
            const plus = statusDelta(newStatus, +1);
            dFinal = minus.df + plus.df;
            dDraft = minus.dd + plus.dd;
            dVoid = minus.dv + plus.dv;
          }

          await applyCustomerDelta(targetKey, {
            name: next?.name,
            phone: next?.phone,
            email: next?.email,
            // best-effort: promote last seen when invoice updates
            lastSeenISO: dateISOForNew,
            deltaFinal: dFinal,
            deltaDraft: dDraft,
            deltaVoid: dVoid,
            deltaTotalFinal: newAmt - oldAmt,
          });
        }
      }
    }
  } catch {
    // Customer index is best-effort; don't block invoice saves.
  }

  // Lines: only for FINAL invoices with a bill number
  if (!bill.billNo) return;

  const lineRows: any[][] = (bill.lines || []).map((l: any, ix: number) => [
    bill.billNo,
    ix + 1,
    l.itemId || "",
    l.name || "",
    l.variant || "",
    l.qty || 0,
    l.rate || 0,
    +((Number(l.rate || 0) * Number(l.qty || 0)).toFixed(2)),
  ]);

  if (lineRows.length) {
    await appendRows("Lines!A2:H", lineRows);
  }
}

/** Convenience wrapper – use this everywhere from store/bills.ts */
export async function saveBillToSheet(bill: any) {
  return saveInvoiceToSheets(bill);
}

/**
 * Parse a single invoice row A..X into a bill object
 */
function rowToBill(r: any[]): any | null {
  if (!r || r.length === 0) return null;

  const sheetDateISO = (r[2] as string) || "";
  const raw = r[23]; // X

  if (raw && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.billDate && sheetDateISO) parsed.billDate = sheetDateISO;
      return parsed;
    } catch {
      // fallback below
    }
  }

  const status = (r[22] as string) || "FINAL";
  const dateISO = sheetDateISO || new Date().toISOString();

  const totals = {
    subtotal: Number(r[8] || 0),
    discount: Number(r[9] || 0),
    taxableBase: Number(r[10] || 0),
    cgst: Number(r[11] || 0),
    sgst: Number(r[12] || 0),
    igst: Number(r[13] || 0),
    roundOff: Number(r[14] || 0),
    grandTotal: Number(r[15] || 0),
  };

  const bill: any = {
    status,
    billNo: r[0] || undefined,
    id: r[1] || undefined,
    billDate: dateISO,
    createdAt: dateISO,
    finalizedAt: status === "FINAL" ? dateISO : undefined,
    customer:
      r[3] || r[4] || r[5]
        ? { name: r[3] || "", phone: r[4] || "", email: r[5] || "" }
        : undefined,
    isInterState: String(r[7] || "").trim().toUpperCase() === "Y",
    totals,
    paymentMode: r[16] || "",
    notes: r[20] || "",
    cashierEmail: r[21] || "",
  };

  return bill;
}

/**
 * Load all bills (slow - full sheet read)
 */
export async function loadBillsFromSheet(): Promise<any[]> {
  const rows = await readRows("Invoices!A2:X");
  const bills: any[] = [];

  for (const r of rows) {
    const bill = rowToBill(r);
    if (bill) bills.push(bill);
  }
  return bills;
}

/**
 * Load customers index rows (fast customer list)
 */
export async function loadCustomersFromSheet(): Promise<any[][]> {
  await ensureCustomerSheets();
  try {
    return await readRows(CUSTOMER_RANGE_ALL);
  } catch {
    return [];
  }
}

/**
 * Load invoice summary rows without parsing JSON (fast scans)
 */
export async function loadInvoiceRowsFromSheet(): Promise<any[][]> {
  try {
    return await readRows(INVOICE_RANGE_ALL);
  } catch {
    return [];
  }
}

/**
 * Rebuild Customers + CustomerIndex from Invoices (admin/migration tool).
 * This is safe to run multiple times.
 */
export async function rebuildCustomersIndexFromInvoices() {
  await ensureCustomerSheets();
  await ensureIndexSheet();

  const { sheets, spreadsheetId } = getSheetsClient();
  const invoices = await loadInvoiceRowsFromSheet();
  const now = new Date().toISOString();

  type Agg = {
    key: string;
    name: string;
    phone: string;
    email: string;
    firstSeenISO: string;
    lastSeenISO: string;
    firstTs: number;
    lastTs: number;
    invoicesCount: number;
    finalCount: number;
    draftCount: number;
    voidCount: number;
    totalFinal: number;
  };

  const byKey = new Map<string, Agg>();

  for (const r of invoices) {
    const m = invoiceRowMeta(r);
    if (!m?.key) continue;
    const ts = parseISOTs(m.dateISO);
    if (!Number.isFinite(ts)) continue;

    const st = String(m.status || "FINAL").toUpperCase();
    const amt = Number(m.amount || 0) || 0;

    const ex = byKey.get(m.key);
    if (!ex) {
      byKey.set(m.key, {
        key: m.key,
        name: m.name,
        phone: m.phone,
        email: m.email,
        firstSeenISO: m.dateISO,
        lastSeenISO: m.dateISO,
        firstTs: ts,
        lastTs: ts,
        invoicesCount: 1,
        finalCount: st === "FINAL" ? 1 : 0,
        draftCount: st === "DRAFT" ? 1 : 0,
        voidCount: st === "VOID" ? 1 : 0,
        totalFinal: st === "FINAL" ? amt : 0,
      });
    } else {
      ex.invoicesCount += 1;
      if (st === "FINAL") {
        ex.finalCount += 1;
        ex.totalFinal += amt;
      } else if (st === "DRAFT") {
        ex.draftCount += 1;
      } else if (st === "VOID") {
        ex.voidCount += 1;
      }

      if (ts < ex.firstTs) {
        ex.firstTs = ts;
        ex.firstSeenISO = m.dateISO;
      }
      if (ts >= ex.lastTs) {
        ex.lastTs = ts;
        ex.lastSeenISO = m.dateISO;
        if (m.name) ex.name = m.name;
        if (m.phone) ex.phone = m.phone;
        if (m.email) ex.email = m.email;
      }
    }
  }

  const rows = Array.from(byKey.values())
    .sort((a, b) => b.lastTs - a.lastTs)
    .map((a) => [
      a.key,
      a.name,
      a.phone,
      a.email,
      a.firstSeenISO,
      a.lastSeenISO,
      a.invoicesCount,
      a.finalCount,
      a.draftCount,
      a.voidCount,
      +Number(a.totalFinal).toFixed(2),
      now,
    ]);

  // Rewrite Customers
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: CUSTOMER_RANGE_ALL });
  if (rows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: CUSTOMER_RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
  }

  // Rewrite CustomerIndex
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: CUSTOMER_INDEX_RANGE_ALL });
  if (rows.length) {
    const idxRows = rows.map((r, ix) => [r[0], ix + 2, now]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: CUSTOMER_INDEX_RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: idxRows },
    });
  }
}

/**
 * NEW: Load a single bill by id OR billNo (FAST)
 * Uses InvoiceIndex -> reads only one row from Invoices.
 */
export async function loadBillFromSheetByKey(key: string): Promise<any | undefined> {
  const k = String(key || "").trim();
  if (!k) return undefined;

  const { sheets, spreadsheetId } = getSheetsClient();

  // 1) try index
  const rn = await getInvoiceRowNumberFromIndex(k);
  if (rn) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Invoices!A${rn}:X${rn}`,
    });
    const row = res.data.values?.[0];
    const bill = rowToBill(row as any[]);
    if (bill) return bill;
  }

  // 2) fallback scan once (slow) + backfill index
  const resAll = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: INVOICE_RANGE_ALL,
  });
  const rows = resAll.data.values || [];

  let idx = rows.findIndex((r) => String(r?.[0] ?? "").trim() === k);
  if (idx === -1) idx = rows.findIndex((r) => String(r?.[1] ?? "").trim() === k);
  if (idx === -1) return undefined;

  const invoiceRowNumber = idx + 2;
  const bill = rowToBill(rows[idx]);
  if (bill) {
    const draftId = String(bill.id ?? "").trim();
    const billNo = String(bill.billNo ?? "").trim();
    if (draftId) await upsertIndex(draftId, invoiceRowNumber);
    if (billNo) await upsertIndex(billNo, invoiceRowNumber);
    await upsertIndex(k, invoiceRowNumber);
  }
  return bill || undefined;
}

/**
 * Move invoice row from Invoices → Deleted, by BillNo (A) or DraftId (B).
 * UPDATED: deletes the row using deleteDimension + keeps InvoiceIndex consistent.
 */
export async function moveInvoiceToDeleted(key: string) {
  const { sheets, spreadsheetId } = getSheetsClient();
  const trimmedKey = String(key || "").trim();
  if (!trimmedKey) return false;

  // 1) locate invoice row fast using index (fallback scan if missing)
  let rn = await getInvoiceRowNumberFromIndex(trimmedKey);

  if (!rn) {
    const resAll = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: INVOICE_RANGE_ALL,
    });
    const rows = resAll.data.values || [];
    let idx = rows.findIndex((r) => String(r?.[0] ?? "").trim() === trimmedKey);
    if (idx === -1) idx = rows.findIndex((r) => String(r?.[1] ?? "").trim() === trimmedKey);
    if (idx === -1) return false;
    rn = idx + 2;
  }

  // 2) read the row
  const rowRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Invoices!A${rn}:X${rn}`,
  });
  const row = rowRes.data.values?.[0];
  if (!row) return false;

  // 3) append to Deleted sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Deleted!A2:X",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  // 4) delete the row in Invoices sheet using batchUpdate deleteDimension
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const invoicesSheetId =
    (meta.data.sheets || []).find((s) => s.properties?.title === INVOICE_SHEET)?.properties
      ?.sheetId;

  if (invoicesSheetId == null) {
    // fallback (should not happen)
    return false;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: invoicesSheetId,
              dimension: "ROWS",
              startIndex: rn - 1, // 0-based
              endIndex: rn, // exclusive
            },
          },
        },
      ],
    },
  });

  // 5) keep index consistent
  const deletedKeys: string[] = [trimmedKey];

  // if RawJson has draftId / billNo, remove those keys too
  const bill = rowToBill(row as any[]);
  if (bill) {
    const draftId = String(bill.id ?? "").trim();
    const billNo = String(bill.billNo ?? "").trim();
    if (draftId) deletedKeys.push(draftId);
    if (billNo) deletedKeys.push(billNo);
  }

  await deleteIndexKeys(deletedKeys);
  await shiftIndexRowsAfter(rn);

  return true;
}

// ---------- expenses (unchanged) ----------
export async function loadExpensesFromSheet(): Promise<any[]> {
  const rows = await readRows("Expenses!A2:G");
  const out: any[] = [];

  for (const r of rows) {
    if (!r || r.length === 0) continue;

    out.push({
      id: r[0] || "",
      dateISO: r[1] || "",
      category: r[2] || "",
      description: r[3] || "",
      amount: Number(r[4] || 0),
      paymentMode: String(r[5] || "").toUpperCase() || "OTHER",
      notes: r[6] || "",
    });
  }

  return out;
}

export async function saveExpenseToSheet(expense: any) {
  const { sheets, spreadsheetId } = getSheetsClient();
  const range = "Expenses!A2:G";

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];

  const id = String(expense.id ?? "").trim();
  if (!id) throw new Error("Expense id missing");

  const row = [
    id,
    expense.dateISO || expense.date || "",
    expense.category || "",
    expense.description || "",
    Number(expense.amount || 0),
    expense.paymentMode || "",
    expense.notes || "",
  ];

  const idx = rows.findIndex((r) => String(r[0] ?? "").trim() === id);

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } else {
    const rowNumber = idx + 2;
    const rowRange = `Expenses!A${rowNumber}:G${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  }
}

export async function deleteExpenseFromSheet(id: string) {
  const { sheets, spreadsheetId } = getSheetsClient();
  const range = "Expenses!A2:G";

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];

  const trimmedId = String(id || "").trim();
  const idx = rows.findIndex((r) => String(r[0] ?? "").trim() === trimmedId);
  if (idx === -1) return false;

  const row = rows[idx];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "ExpensesDeleted!A2:G",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  const remaining = rows.slice(0, idx).concat(rows.slice(idx + 1));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range });

  if (remaining.length) {
    // Update the remaining rows. The `values` field expects an array of row arrays.
    // `remaining` is already a 2D array (array of rows), so pass it directly rather than wrapping
    // it in an extra array. Wrapping would nest the rows one level deeper and cause the data to be
    // written incorrectly (all remaining rows would appear on a single row).
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: remaining },
    });
  }

  return true;
}

// ---------- bootstrap + dev reset ----------
export async function ensureSheetStructure() {
  const { sheets, spreadsheetId } = getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(
    (meta.data.sheets || [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => !!t)
  );

  const required = [
    { title: "Users", headers: ["Email", "Role", "PasswordHash"] },
    {
      title: "Invoices",
      headers: [
        "BillNo",
        "DraftId",
        "DateISO",
        "CustomerName",
        "Phone",
        "Email",
        "GSTPct",
        "InterState",
        "Subtotal",
        "Discount",
        "TaxBase",
        "CGST",
        "SGST",
        "IGST",
        "RoundOff",
        "GrandTotal",
        "PaymentMode",
        "Cash",
        "Card",
        "UPI",
        "Notes",
        "CashierEmail",
        "Status",
        "RawJson",
      ],
    },
    {
      title: "InvoiceIndex",
      headers: ["Key", "Row", "UpdatedAt"],
    },
    {
      title: "Customers",
      headers: [
        "Key",
        "Name",
        "Phone",
        "Email",
        "FirstSeenISO",
        "LastSeenISO",
        "InvoicesCount",
        "FinalCount",
        "DraftCount",
        "VoidCount",
        "TotalFinalSpend",
        "UpdatedAt",
      ],
    },
    {
      title: "CustomerIndex",
      headers: ["Key", "Row", "UpdatedAt"],
    },
    {
      title: "Lines",
      headers: ["BillNo", "SNo", "ItemId", "ItemName", "Variant", "Qty", "Rate", "Amount"],
    },
    {
      title: "Deleted",
      headers: [
        "BillNo",
        "DraftId",
        "DateISO",
        "CustomerName",
        "Phone",
        "Email",
        "GSTPct",
        "InterState",
        "Subtotal",
        "Discount",
        "TaxBase",
        "CGST",
        "SGST",
        "IGST",
        "RoundOff",
        "GrandTotal",
        "PaymentMode",
        "Cash",
        "Card",
        "UPI",
        "Notes",
        "CashierEmail",
        "Status",
        "RawJson",
      ],
    },
    {
      title: "Expenses",
      headers: ["Id", "DateISO", "Category", "Description", "Amount", "PaymentMode", "Notes"],
    },
    {
      title: "ExpensesDeleted",
      headers: ["Id", "DateISO", "Category", "Description", "Amount", "PaymentMode", "Notes"],
    },
  ];

  // create missing sheets
  const requests: any[] = [];
  for (const s of required) {
    if (!existingTitles.has(s.title)) {
      requests.push({ addSheet: { properties: { title: s.title } } });
    }
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // ensure headers
  for (const s of required) {
    const lastColIndex = s.headers.length - 1;
    const lastColLetter = String.fromCharCode(65 + lastColIndex);
    const range = `${s.title}!A1:${lastColLetter}1`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [s.headers] },
    });
  }
}

export async function truncateInvoiceData() {
  const { sheets, spreadsheetId } = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Invoices!A2:X",
  });
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Lines!A2:H",
  });
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Deleted!A2:X",
  });
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "InvoiceIndex!A2:C",
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Customers!A2:L",
  });
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "CustomerIndex!A2:C",
  });
}