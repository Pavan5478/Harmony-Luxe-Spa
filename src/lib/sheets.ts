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

function a1(sheet: string, range: string) {
  // Always quote sheet names to be safe
  const safe = sheet.replace(/'/g, "''");
  return `'${safe}'!${range}`;
}

const INVOICE_RANGE_ALL = a1(INVOICE_SHEET, "A2:X");
const INDEX_RANGE_ALL = a1(INDEX_SHEET, "A2:C");
const INDEX_APPEND_RANGE = a1(INDEX_SHEET, "A2:C");
const INDEX_HEADER_RANGE = a1(INDEX_SHEET, "A1:C1");

let _indexReady: Promise<void> | null = null;

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


// ---------- invoices ----------

/**
 * Upsert a row in Invoices sheet.
 * FAST PATH: if InvoiceIndex has row number, update exact row (no full scan).
 * FALLBACK: scan Invoices!A2:X.
 */
async function upsertInvoiceRow(bill: any, invRow: any[]) {
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
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [invRow] },
    });

    // keep index synced for both keys
    if (draftId) await upsertIndex(draftId, rowNumber);
    if (billNo) await upsertIndex(billNo, rowNumber);
    return;
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
  } else {
    const rn = index + 2; // header row = 1
    const rowRange = `Invoices!A${rn}:X${rn}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [invRow] },
    });

    if (draftId) await upsertIndex(draftId, rn);
    if (billNo) await upsertIndex(billNo, rn);
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

  await upsertInvoiceRow(bill, invRow);

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
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [remaining] },
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
}