// src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listExpenses, createExpense } from "@/store/expenses";
import type { Expense } from "@/types/expenses";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const category = url.searchParams.get("category");
  const q = (url.searchParams.get("q") || "").toLowerCase();

  const all = await listExpenses();

  const from = fromStr ? new Date(fromStr) : null;
  const to = toStr ? new Date(toStr) : null;

  const filtered = all.filter((e) => {
    const d = new Date(e.dateISO);
    if (from && d < from) return false;
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      if (d >= end) return false;
    }
    if (category && category !== "ALL" && e.category !== category) return false;
    if (q) {
      const hay =
        (e.description || "").toLowerCase() +
        " " +
        (e.notes || "").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return NextResponse.json({ expenses: filtered });
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
    return NextResponse.json(
      { error: "Date and amount are required" },
      { status: 400 }
    );
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