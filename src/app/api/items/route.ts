// src/app/api/items/route.ts
import { NextResponse } from "next/server";
import { listActive, listAll, upsertItem } from "@/store/items";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET /api/items
// - default: only active (public/billing)
// - with ?all=1: all items (admin manage page)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantAll = url.searchParams.get("all");

  if (wantAll) {
    const session = await getSession();
    if (session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const items = await listAll();
    return NextResponse.json({ items });
  }

  const items = await listActive();
  return NextResponse.json({ items });
}

// POST /api/items  (ADMIN only) -> create/update in Google Sheet
export async function POST(req: Request) {
  const session = await getSession();
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const item = {
    id: String(body.id || "").trim(),
    name: String(body.name || "").trim(),
    category: body.category ? String(body.category).trim() : undefined,
    variant: body.variant ? String(body.variant) : undefined,
    price: Number(body.price || 0),
    active: Boolean(body.active ?? true),
    // taxRate is 0..1 (e.g. 0.18) coming from UI
    taxRate:
      body.taxRate != null ? Math.max(0, Number(body.taxRate)) : undefined,
  };

  if (!item.id || !item.name) {
    return NextResponse.json(
      { error: "id and name are required" },
      { status: 400 }
    );
  }

  await upsertItem(item as any);
  return NextResponse.json({ ok: true, item });
}