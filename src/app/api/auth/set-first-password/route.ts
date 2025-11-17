import { NextResponse } from "next/server";
import { getUser, setPassword } from "@/lib/users";

export async function POST(req: Request) {
  const { email, newPassword } = await req.json();
  const u = await getUser(email);
  if (!u) return NextResponse.json({ ok:false, error:"User not found" }, { status: 404 });
  if (u.hash) return NextResponse.json({ ok:false, error:"Password already set" }, { status: 400 });
  await setPassword(email, (u.role as any) || "CASHIER", newPassword);
  return NextResponse.json({ ok:true });
}