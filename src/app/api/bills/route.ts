// src/app/api/bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createDraft, listBills } from "@/store/bills";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// List all bills (used by Invoices / Dashboard, etc.)
export async function GET(_req: NextRequest) {
  const bills = await listBills();
  return NextResponse.json({ bills });
}

// Create a new DRAFT bill
export async function POST(req: NextRequest) {
  const session = await getSession();
  const role = session.user?.role;

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (role !== "ADMIN" && role !== "CASHIER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const draft = await createDraft(data);

  return NextResponse.json({ id: draft.id, bill: draft });
}