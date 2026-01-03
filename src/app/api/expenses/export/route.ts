// src/app/api/expenses/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listExpenses } from "@/store/expenses";
import type { Expense } from "@/types/expenses";
import { parseExpenseNotesMeta } from "@/lib/expenseNotesMeta";

export const dynamic = "force-dynamic";

const BASE_CATEGORIES = ["Rent", "Staff", "Products", "Utilities", "Marketing", "Misc"] as const;

function isBaseCategory(cat: string) {
  return (BASE_CATEGORIES as readonly string[]).includes(cat);
}

function startOfDayISODate(yyyyMmDd: string) {
  // NOTE: this matches your existing local-date logic used elsewhere
  return new Date(`${yyyyMmDd}T00:00:00`);
}

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Export allowed only for ADMIN + ACCOUNTS
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);

  const fromStr = url.searchParams.get("from") || "";
  const toStr = url.searchParams.get("to") || "";
  const categoryRaw = (url.searchParams.get("category") || "ALL").trim();
  const modeRaw = (url.searchParams.get("mode") || "ALL").trim();
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const from = fromStr ? startOfDayISODate(fromStr) : null;
  const to = toStr ? startOfDayISODate(toStr) : null;

  let endExclusive: Date | null = null;
  if (to) {
    endExclusive = new Date(to);
    endExclusive.setDate(endExclusive.getDate() + 1);
  }

  const mode = modeRaw.toUpperCase();
  const category = categoryRaw;

  const all = await listExpenses();

  const filtered = all.filter((e: Expense) => {
    const d = new Date(e.dateISO);
    if (from && d < from) return false;
    if (endExclusive && d >= endExclusive) return false;

    const eCat = String(e.category || "").trim();

    if (category && category.toUpperCase() !== "ALL") {
      if (category.toLowerCase() === "other") {
        // show categories that are NOT in the base list
        if (isBaseCategory(eCat)) return false;
      } else {
        if (eCat !== category) return false;
      }
    }

    if (mode && mode !== "ALL") {
      const eMode = String(e.paymentMode || "").toUpperCase();
      if (eMode !== mode) return false;
    }

    if (q) {
      const hay =
        (e.description || "").toLowerCase() +
        " " +
        (e.notes || "").toLowerCase() +
        " " +
        (e.category || "").toLowerCase();

      if (!hay.includes(q)) return false;
    }

    return true;
  });

  // Oldest → newest for reporting
  filtered.sort(
    (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
  );

  const header = [
    "ID",
    "Date",
    "Category",
    "Description",
    "Amount",
    "PaymentMode",
    "Vendor",
    "Receipt",
    "Notes",
  ];

  const rows = filtered.map((e) => {
    const meta = parseExpenseNotesMeta(e.notes);
    const date = new Date(e.dateISO).toLocaleDateString(); // keep local date display

    return [
      e.id || "",
      date,
      e.category || "",
      e.description || "",
      Number(e.amount || 0),
      e.paymentMode || "",
      meta.vendor,
      meta.receipt,
      meta.notes,
    ];
  });

  // Add BOM so Excel opens UTF-8 cleanly
  const csv =
    "\ufeff" +
    [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n") +
    "\n";

  const nameFrom = fromStr || "all";
  const nameTo = toStr || "all";
  const filename = `expenses-${nameFrom}-to-${nameTo}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}