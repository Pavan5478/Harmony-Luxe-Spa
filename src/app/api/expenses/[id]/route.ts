// src/app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getExpense,
  updateExpense,
  deleteExpense,
} from "@/store/expenses";
import type { Expense } from "@/types/expenses";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function decodeId(ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await decodeId(ctx);
  const ex = await getExpense(id);
  if (!ex) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ expense: ex });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleRaw = session.user.role;
  const role =
    typeof roleRaw === "string" ? roleRaw.toUpperCase() : undefined;

  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = await decodeId(ctx);
  const body = (await req.json().catch(() => null)) as Partial<Expense> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const updated = await updateExpense(id, body);
    return NextResponse.json({ expense: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to update" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleRaw = session.user.role;
  const role =
    typeof roleRaw === "string" ? roleRaw.toUpperCase() : undefined;

  // Allow ADMIN + ACCOUNTS to delete expenses
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = await decodeId(ctx);

  const ok = await deleteExpense(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}