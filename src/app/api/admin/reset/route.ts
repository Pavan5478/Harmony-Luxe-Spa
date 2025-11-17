import { NextResponse } from "next/server";
import { clearBills } from "@/store/bills";
import {
  setFinYear,
  setNextSeq,
  resetCounter,
  getCounter,
} from "@/lib/billno";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));

  if (body.finYear) await setFinYear(body.finYear);
  if (typeof body.startSeq === "number")
    await setNextSeq(body.startSeq);
  if (body.resetCounter) await resetCounter();
  if (body.clearBills) clearBills();

  const counter = await getCounter();
  return NextResponse.json({ ok: true, counter });
}