// src/app/api/reports/export/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { readRows } from "@/lib/sheets";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function norm(s: unknown) {
  return String(s ?? "").trim().toLowerCase();
}

function getColIndex(header: string[], name: string, fallback: number) {
  const ix = header.findIndex((h) => norm(h) === norm(name));
  return ix >= 0 ? ix : fallback;
}

function parseYmdToTs(ymd: string | null) {
  if (!ymd) return null;
  // Treat YYYY-MM-DD as start-of-day (local-ish), but stable for filtering ISO strings
  const ts = Date.parse(`${ymd}T00:00:00.000Z`);
  return Number.isFinite(ts) ? ts : null;
}

/**
 * GET /api/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD&status=FINAL|DRAFT|VOID|ALL
 * Returns CSV of Invoices sheet rows filtered by dateISO and optional status if column exists.
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
  const to = url.searchParams.get("to"); // inclusive
  const status = (url.searchParams.get("status") || "ALL").toUpperCase();

  const fromTs = parseYmdToTs(from) ?? Number.NEGATIVE_INFINITY;
  const toTsInclusive = parseYmdToTs(to);
  const toTsExclusive =
    toTsInclusive != null ? toTsInclusive + 24 * 3600 * 1000 : Number.POSITIVE_INFINITY;

  const all = await readRows("Invoices!A1:Z");
  const header = (all[0] as any[])?.map(String) ?? [];
  const rows = (all.slice(1) as any[][]) ?? [];

  const dateIx = getColIndex(header, "dateiso", 1); // fallback to B
  const statusIx = getColIndex(header, "status", -1); // optional

  const filtered = rows.filter((r) => {
    const raw = String(r[dateIx] ?? "");
    const ts = Date.parse(raw);
    const inRange = Number.isFinite(ts) ? ts >= fromTs && ts < toTsExclusive : true;

    if (!inRange) return false;

    if (status !== "ALL" && statusIx >= 0) {
      const rowStatus = String(r[statusIx] ?? "").toUpperCase().trim();
      if (rowStatus && rowStatus !== status) return false;
    }

    return true;
  });

  const csvRaw = toCsv(filtered, header);
  // Add BOM for Excel UTF-8 friendliness
  const csv = "\ufeff" + csvRaw;

  const fname = `invoices_${from || "all"}_${to || "all"}_${status || "ALL"}.csv`.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
