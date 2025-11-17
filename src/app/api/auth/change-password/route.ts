import { NextResponse } from "next/server";
import { getUser, verify, setPassword } from "@/lib/users";

export async function POST(req: Request) {
  const { email, oldPassword, newPassword } = await req.json();
  const u = await getUser(email);
  if (!u) return NextResponse.json({ ok:false, error:"User not found" }, { status: 404 });

  // If no password yet, allow setting without old password
  if (!u.hash) {
    await setPassword(email, (u.role as any) || "CASHIER", newPassword);
    return NextResponse.json({ ok:true, firstTime: true });
  }

  const ok = await verify(email, oldPassword || "");
  if (!ok) return NextResponse.json({ ok:false, error:"Old password incorrect" }, { status: 400 });

  await setPassword(email, (u.role as any) || "CASHIER", newPassword);
  return NextResponse.json({ ok:true });
}