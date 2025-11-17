import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  const user = s.user || null;
  return NextResponse.json({
    email: user?.email ?? null,
    role: user?.role ?? null, // "ADMIN" | "CASHIER" | "ACCOUNTS"
  });
}