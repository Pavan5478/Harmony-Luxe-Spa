// src/app/tools/qr/page.tsx
import { headers } from "next/headers";
import QrToolClient from "@/components/tools/qr/QrToolClient";

export const dynamic = "force-dynamic";

export default async function QRPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = host ? `${proto}://${host}` : "";

  return <QrToolClient origin={origin} />;
}