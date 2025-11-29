// src/store/expenses.ts
import type { Expense } from "@/types/expenses";
import {
  loadExpensesFromSheet,
  saveExpenseToSheet,
  deleteExpenseFromSheet,
} from "@/lib/sheets";

type ExpenseRecord = Expense;

const CACHE_MS = 10_000;
let cache: { data: ExpenseRecord[]; ts: number } | null = null;

function invalidate() {
  cache = null;
}

async function loadAll(): Promise<ExpenseRecord[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_MS) {
    return cache.data;
  }
  const rows = await loadExpensesFromSheet();
  const data = rows as ExpenseRecord[];
  cache = { data, ts: now };
  return data;
}

function nextExpenseId(all: ExpenseRecord[]): string {
  let max = 0;
  for (const ex of all) {
    const id = String(ex.id || "");
    if (id.startsWith("E")) {
      const n = parseInt(id.slice(1), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return "E" + (max + 1);
}

export async function listExpenses(): Promise<ExpenseRecord[]> {
  return loadAll();
}

export async function getExpense(id: string): Promise<ExpenseRecord | undefined> {
  const all = await loadAll();
  return all.find((e) => e.id === id);
}

export async function createExpense(input: Omit<ExpenseRecord, "id">): Promise<ExpenseRecord> {
  const all = await loadAll();
  const id = nextExpenseId(all);

  const base: ExpenseRecord = {
    id,
    dateISO: input.dateISO,
    category: input.category.trim(),
    description: input.description.trim(),
    amount: Number(input.amount || 0),
    paymentMode: (input.paymentMode || "OTHER").toUpperCase() as ExpenseRecord["paymentMode"],
    notes: input.notes?.trim() || "",
  };

  await saveExpenseToSheet(base);
  invalidate();
  return base;
}

export async function updateExpense(
  id: string,
  patch: Partial<Omit<ExpenseRecord, "id">>
): Promise<ExpenseRecord> {
  const all = await loadAll();
  const existing = all.find((e) => e.id === id);
  if (!existing) throw new Error("Expense not found");

  const updated: ExpenseRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    amount: Number((patch.amount ?? existing.amount) || 0),
    category: (patch.category ?? existing.category).trim(),
    description: (patch.description ?? existing.description).trim(),
    paymentMode: ((patch.paymentMode ?? existing.paymentMode) || "OTHER")
      .toString()
      .toUpperCase() as ExpenseRecord["paymentMode"],
    notes: (patch.notes ?? existing.notes ?? "").trim(),
  };

  await saveExpenseToSheet(updated);
  invalidate();
  return updated;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const ok = await deleteExpenseFromSheet(id);
  invalidate();
  return ok;
}