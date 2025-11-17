export type Role = "ADMIN" | "CASHIER" | "ACCOUNTS";

export interface Settings {
  businessName: string;
  addressLine: string;
  state: "Karnataka";
  gstin: string;
  currency: "INR";
  language: "EN";
  gstRate: number;        // 0.18
  inclusiveTax: boolean;  // true
}

export interface Item {
  id: string;
  name: string;
  category?: string;
  variant?: string;
  price: number;          // inclusive
  active: boolean;
  taxRate?: number;       // default 0.18
}

export interface BillLine {
  itemId: string;
  name: string;
  variant?: string;
  qty: number;
  rate: number;           // per unit (inclusive)
  amount: number;         // rate * qty
}

export type PaymentMode = "CASH" | "CARD" | "UPI" | "SPLIT";
export interface PaymentSplit { cash?: number; card?: number; upi?: number; }

// ✅ exported Customer types
export type Customer = { name: string; phone: string; email: string };
export type CustomerDraft = Partial<Customer>;

export interface BillDraft {
  id: string;
  status: "DRAFT";
  cashierEmail?: string;
  customer?: CustomerDraft;
  lines: BillLine[];
  discountFlat?: number;
  discountPct?: number;
  isInterState?: boolean;     // default false for KA
  paymentMode?: PaymentMode;
  split?: PaymentSplit;
  notes?: string;
  totals: {
    subtotal: number;
    discount: number;
    taxableBase: number;
    cgst?: number; sgst?: number; igst?: number;
    roundOff: number;
    grandTotal: number;
  };
  createdAt: string;
}

export interface BillFinal extends Omit<BillDraft,"status"|"id"> {
  status: "FINAL";
  billNo: string;             // 2025-26/000001
  finalizedAt: string;
  printedAt?: string;         // ✅ lock edits after first print
  id?: string;                // keep draft id if you want to reference
}