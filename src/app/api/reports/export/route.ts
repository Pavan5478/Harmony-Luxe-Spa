import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readRows } from "@/lib/sheets";
import { toCsv } from "@/lib/csv";

function getDateIndex(header: string[]) {
  const ix = header.findIndex(h => String(h).trim().toLowerCase() === "dateiso");
  return ix >= 0 ? ix : 1; // fallback to column B
}

/**
 * GET /api/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns text/csv of invoices stored in the "Invoices" sheet.
 * Visible to ADMIN and ACCOUNTS only.
 */
export async function GET(req: Request) {
  const session = await getSession();
  const role = session.user?.role;
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from"); // inclusive
  const to = url.searchParams.get("to");     // inclusive

  const fromTs = from ? Date.parse(from) : Number.NEGATIVE_INFINITY;
  const toTs   = to   ? Date.parse(to) + 24 * 3600 * 1000 : Number.POSITIVE_INFINITY;

  // Read header + rows (assumes A1 = header row, A2.. = data).
  const all = await readRows("Invoices!A1:Z");
  const header = (all[0] as any[]) || [];
  const rows = (all.slice(1) as any[][]) || [];

  // Detect which column is dateISO
  const dateIx = getDateIndex(header as string[]);

  const filtered = rows.filter(r => {
    const ts = Date.parse(String(r[dateIx] ?? ""));
    return Number.isFinite(ts) ? ts >= fromTs && ts < toTs : true; // keep if not parseable
  });

  const csv = toCsv(filtered, header as string[]);

  const fname = `invoices_${from || "all"}_${to || "all"}.csv`.replace(/[^a-zA-Z0-9._-]/g, "_");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-cache",
    },
  });
}