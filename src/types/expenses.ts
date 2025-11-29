// src/types/expenses.ts
export type ExpensePaymentMode =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK"
  | "OTHER";

export type Expense = {
  id: string;            // E1, E2, ...
  dateISO: string;       // ISO string (e.g. 2025-11-28T00:00:00.000Z)
  category: string;      // Rent, Staff, Products, Utilities, etc.
  description: string;
  amount: number;
  paymentMode: ExpensePaymentMode;
  notes?: string;
};