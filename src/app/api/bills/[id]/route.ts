import { NextRequest } from "next/server";
import { handleDelete, handleGet, handlePatch, handlePut } from "../_routeHandlers";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handleGet(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handlePut(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handlePatch(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handleDelete(req, ctx);
}
