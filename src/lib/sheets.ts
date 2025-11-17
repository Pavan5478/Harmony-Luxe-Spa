// src/lib/sheets.ts
import { google } from "googleapis";

// ----- auth + client helpers -----
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
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID env missing");
  }
  return { sheets, spreadsheetId };
}

// ----- generic helpers -----
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

// ----- invoice upsert + delete helpers -----

/**
 * Upsert a row in Invoices sheet.
 * Primary key = DraftId (col B). If missing, falls back to BillNo (col A).
 */
async function upsertInvoiceRow(bill: any, invRow: any[]) {
  const { sheets, spreadsheetId } = getSheetsClient();
  const range = "Invoices!A2:X"; // 24 columns incl. Status + RawJson

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = existing.data.values || [];

  const draftId = String(bill.id ?? "").trim();
  const billNo = String(bill.billNo ?? "").trim();

  let index = -1;

  if (draftId) {
    index = rows.findIndex((r) => String(r[1] ?? "").trim() === draftId);
  }

  if (index === -1 && billNo) {
    index = rows.findIndex((r) => String(r[0] ?? "").trim() === billNo);
  }

  if (index === -1) {
    // append new
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [invRow] },
    });
  } else {
    // update in-place
    const rowNumber = index + 2; // header is row 1
    const rowRange = `Invoices!A${rowNumber}:X${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [invRow] },
    });
  }
}

/**
 * Writes one bill into:
 *  - Invoices (summary row, upsert by DraftId/BillNo)
 *  - Lines     (one row per line item, appended for FINAL bills)
 *
 * It also stores the full bill JSON in the last column (RawJson)
 * so we can reconstruct everything from Sheets later.
 */
export async function saveInvoiceToSheets(bill: any) {
  const t = bill.totals || {};
  const tax = (t.igst || 0) + (t.cgst || 0) + (t.sgst || 0);
  const gstPct =
    t.taxableBase > 0 ? +((tax / t.taxableBase) * 100).toFixed(2) : 0;

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

  // 24 columns (A:X)
  const invRow = [
    bill.billNo || "", // A BillNo
    bill.id || "", // B DraftId
    bill.finalizedAt || bill.createdAt || "", // C DateISO
    bill.customer?.name || "", // D CustomerName
    bill.customer?.phone || "", // E Phone
    bill.customer?.email || "", // F Email
    gstPct, // G GSTPct
    bill.isInterState ? "Y" : "N", // H InterState
    t.subtotal || 0, // I Subtotal
    t.discount || 0, // J Discount
    t.taxableBase || 0, // K TaxBase
    t.cgst || 0, // L CGST
    t.sgst || 0, // M SGST
    t.igst || 0, // N IGST
    t.roundOff || 0, // O RoundOff
    gt, // P GrandTotal
    bill.paymentMode || "", // Q PaymentMode
    cash, // R Cash
    card, // S Card
    upi, // T UPI
    bill.notes || "", // U Notes
    bill.cashierEmail || "", // V CashierEmail
    status, // W Status
    rawJson, // X RawJson
  ];

  await upsertInvoiceRow(bill, invRow);

  // Lines: only for final invoices with a bill number
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
 * Load all bills from Invoices sheet.
 * If RawJson column is present, that is used as the source of truth.
 */
export async function loadBillsFromSheet(): Promise<any[]> {
  const rows = await readRows("Invoices!A2:X");
  const bills: any[] = [];

  for (const r of rows) {
    if (!r || r.length === 0) continue;

    const raw = r[23]; // X = RawJson
    if (raw && typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        bills.push(parsed);
        continue;
      } catch {
        // fall through to minimal reconstruction
      }
    }

    const status = (r[22] as string) || "FINAL";
    const createdAt = r[2] || new Date().toISOString();

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
      createdAt,
      finalizedAt: status === "FINAL" ? createdAt : undefined,
      customer:
        r[3] || r[4] || r[5]
          ? {
              name: r[3] || "",
              phone: r[4] || "",
              email: r[5] || "",
            }
          : undefined,
      isInterState:
        String(r[7] || "").trim().toUpperCase() === "Y",
      totals,
      paymentMode: r[16] || "",
      notes: r[20] || "",
      cashierEmail: r[21] || "",
    };

    bills.push(bill);
  }

  return bills;
}

/**
 * Move invoice row from Invoices → Deleted, by BillNo (A) or DraftId (B).
 */
export async function moveInvoiceToDeleted(key: string) {
  const { sheets, spreadsheetId } = getSheetsClient();
  const range = "Invoices!A2:X";

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];

  const trimmedKey = String(key || "").trim();
  const idx = rows.findIndex(
    (r) =>
      String(r[0] ?? "").trim() === trimmedKey || // BillNo
      String(r[1] ?? "").trim() === trimmedKey // DraftId
  );
  if (idx === -1) return false;

  const row = rows[idx];

  // 1) Append to Deleted sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Deleted!A2:X",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  // 2) Rewrite Invoices without that row
  const remaining = rows.slice(0, idx).concat(rows.slice(idx + 1));

  await sheets.spreadsheets.values.clear({ spreadsheetId, range });

  if (remaining.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: remaining },
    });
  }

  return true;
}

// ----- bootstrap + dev reset helpers -----

/**
 * Create required sheets (Users, Invoices, Lines, Deleted) if missing
 * and ensure header rows.
 */
export async function ensureSheetStructure() {
  const { sheets, spreadsheetId } = getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(
    (meta.data.sheets || [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => !!t)
  );

  const required = [
    {
      title: "Users",
      headers: ["Email", "Role", "PasswordHash"],
    },
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
      title: "Lines",
      headers: [
        "BillNo",
        "SNo",
        "ItemId",
        "ItemName",
        "Variant",
        "Qty",
        "Rate",
        "Amount",
      ],
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
  ];

  // 1) create missing sheets
  const requests: any[] = [];
  for (const s of required) {
    if (!existingTitles.has(s.title)) {
      requests.push({
        addSheet: { properties: { title: s.title } },
      });
    }
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // 2) ensure headers
  for (const s of required) {
    const lastColIndex = s.headers.length - 1;
    const lastColLetter = String.fromCharCode(65 + lastColIndex); // 65 = 'A'
    const range = `${s.title}!A1:${lastColLetter}1`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [s.headers] },
    });
  }
}

/**
 * Clear all invoice data (DEV ONLY: keeps header row).
 */
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
}