// src/app/api/items/[id]/route.ts
import { NextResponse } from "next/server";
import { removeItem } from "@/store/items";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type RouteContext = {
  // Next 16: ctx.params is a Promise
  params: Promise<{ id: string }>;
};

// DELETE /api/items/:id  (ADMIN only)
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const decodedId = decodeURIComponent(id);

  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await removeItem(decodedId);
  return NextResponse.json({ ok: true });
}