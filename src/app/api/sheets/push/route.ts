// src/app/api/sheets/push/route.ts
// Legacy endpoint – no longer needed now that invoices are
// written directly to Google Sheets from /api/bills.
//
// We keep this stub so any old calls to /api/sheets/push
// won't break, but it does NOT write anything to Sheets.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    skipped: true,
    message:
      "Sheets push is a no-op. Bills are already saved directly to Google Sheets.",
  });
}