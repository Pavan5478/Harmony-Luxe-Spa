// src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listExpenses, createExpense } from "@/store/expenses";
import type { Expense } from "@/types/expenses";

export const dynamic = "force-dynamic";

// Keep in sync with UI base categories (used for "Other")
const BASE_CATEGORIES = ["Rent", "Staff", "Products", "Utilities", "Marketing", "Misc"] as const;

function isBaseCategory(cat: string) {
  return (BASE_CATEGORIES as readonly string[]).includes(cat);
}

function startOfDayISODate(yyyyMmDd: string) {
  // Force local date start to avoid timezone weirdness
  return new Date(`${yyyyMmDd}T00:00:00`);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);

  const fromStr = url.searchParams.get("from") || "";
  const toStr = url.searchParams.get("to") || "";
  const categoryRaw = (url.searchParams.get("category") || "ALL").trim(); // ALL | Other | categoryName
  const modeRaw = (url.searchParams.get("mode") || "ALL").trim(); // ALL | CASH | CARD | ...
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const all = await listExpenses();

  const from = fromStr ? startOfDayISODate(fromStr) : null;
  const to = toStr ? startOfDayISODate(toStr) : null;

  // inclusive end-date: add 1 day and compare d < endExclusive
  let endExclusive: Date | null = null;
  if (to) {
    endExclusive = new Date(to);
    endExclusive.setDate(endExclusive.getDate() + 1);
  }

  const mode = modeRaw.toUpperCase();
  const category = categoryRaw; // keep case (category names)

  const filtered = all.filter((e) => {
    const d = new Date(e.dateISO);
    if (from && d < from) return false;
    if (endExclusive && d >= endExclusive) return false;

    const eCat = String(e.category || "").trim();

    if (category && category.toUpperCase() !== "ALL") {
      if (category.toLowerCase() === "other") {
        // not in base categories
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

  // newest first
  filtered.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());

  return NextResponse.json({ expenses: filtered, meta: { count: filtered.length } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Only ADMIN & ACCOUNTS can create expenses
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Partial<Expense> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const amount = Number(body.amount ?? 0);
  if (!body.dateISO || !amount || Number.isNaN(amount)) {
    return NextResponse.json({ error: "Date and amount are required" }, { status: 400 });
  }

  const created = await createExpense({
    dateISO: body.dateISO,
    category: body.category || "Misc",
    description: body.description || "",
    amount,
    paymentMode: (body.paymentMode || "OTHER") as Expense["paymentMode"],
    notes: body.notes || "",
  });

  return NextResponse.json({ expense: created });
}