// src/app/menu/public/page.tsx
import { headers } from "next/headers";
import PublicMenuClient from "@/components/menu/public/PublicMenuClient";
import type { Item } from "@/types/billing";

export const revalidate = 60;

function getCategoryKey(id: string): string {
  const slug = String(id || "").toLowerCase().trim();
  if (!slug) return "other";
  return slug.split("-")[0] || "other";
}

export default async function PublicMenuPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const baseUrl = host ? `${proto}://${host}` : "";

  let all: Item[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/items`, {
      next: { revalidate },
    });

    if (res.ok) {
      const j = await res.json().catch(() => ({} as any));
      all = (Array.isArray((j as any).items) ? (j as any).items : []) as Item[];
    }
  } catch {
    // fallback: empty list
    all = [];
  }
  const activeItems = all.filter((i) => i.active);

  // detect if you generally use GST/tax
  const hasTax = activeItems.some((i) => i.taxRate != null);

  // sort on server
  activeItems.sort((a, b) => {
    const ca = getCategoryKey(a.id);
    const cb = getCategoryKey(b.id);
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.name || "").localeCompare(b.name || "");
  });

  const updatedLabel = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <PublicMenuClient
      items={activeItems}
      updatedLabel={updatedLabel}
      hasTax={hasTax}
    />
  );
}