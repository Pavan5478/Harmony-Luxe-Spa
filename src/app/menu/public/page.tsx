"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PublicItem = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  active: boolean;
  taxRate?: number;
};

type Category = {
  id: string;
  label: string;
  items: PublicItem[];
};

// ---------- helpers: categories from ID prefix ----------
function getCategoryKey(id: string): string {
  const slug = String(id || "").toLowerCase().trim();
  if (!slug) return "other";
  const first = slug.split("-")[0];
  return first || "other";
}

function getCategoryLabel(key: string): string {
  const map: Record<string, string> = {
    coconut: "Coconut Oil Massage",
    aroma: "Aromatherapy Massage",
    balinese: "Balinese Massage",
    candle: "Candle Oil Massage",
    thai: "Thai Massage",
    deep: "Deep Tissue Massage",
    couple: "Couple Rituals",
    foot: "Foot Reflexology",
    head: "Head, Neck & Shoulder",
    scrub: "Body Scrubs & Wraps",
    facial: "Facials & Add-ons",
  };

  if (map[key]) return map[key];

  // fallback – title-case the key
  return key
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// smooth scroll to section
function scrollToCategorySection(catId: string) {
  if (typeof window === "undefined") return;
  const el = document.getElementById(`cat-${catId}`);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const offset = 80; // space for header
  const target = rect.top + window.scrollY - offset;
  window.scrollTo({ top: target, behavior: "smooth" });
}

// ---------- page ----------
export default function PublicMenuPage() {
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [highlightCat, setHighlightCat] = useState<string>("ALL");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/items", { cache: "no-store" });
        const j = await res.json();
        const list = Array.isArray(j.items) ? (j.items as PublicItem[]) : [];
        setItems(list);
      } catch (e) {
        console.error("Failed to load public menu", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeItems = useMemo(
    () => items.filter((i) => i.active),
    [items]
  );

  const categories = useMemo<Category[]>(() => {
    const map: Record<string, Category> = {};
    for (const it of activeItems) {
      const key = getCategoryKey(it.id);
      if (!map[key]) {
        map[key] = { id: key, label: getCategoryLabel(key), items: [] };
      }
      map[key].items.push(it);
    }
    // sort sections by label
    return Object.values(map).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [activeItems]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  const filteredCategories = useMemo<Category[]>(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;

    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((i) => {
          const hay = `${i.name} ${i.variant ?? ""} ${i.id}`.toLowerCase();
          return hay.includes(term);
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, search]);

  const totalActive = activeItems.length;
  const visibleCount = filteredCategories.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  function handleChipAll() {
    setHighlightCat("ALL");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleChipCategory(catId: string) {
    setHighlightCat(catId);
    scrollToCategorySection(catId);
  }

  function openSheet() {
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-20 pt-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* ── Header / hero card ─────────────────────────────── */}
        <header className="mb-5 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:mb-7 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Menu
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                Services &amp; Prices
              </h1>
              <p className="mt-1 max-w-md text-xs text-muted sm:text-sm">
                Browse our full spa menu. All prices are per person and
                inclusive of taxes unless mentioned otherwise.
              </p>
            </div>

            <div className="text-right text-[11px] text-muted sm:text-xs">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  {totalActive} service
                  {totalActive === 1 ? "" : "s"}
                </span>
                <span className="mx-1 h-3 w-px bg-border" />
                <span>Updated {todayLabel}</span>
              </div>
              <div className="mt-2 hidden text-right sm:block">
                <span className="block text-[11px] font-medium text-muted">
                  Powered by Bill Book
                </span>
                <Link
                  href="/dashboard"
                  className="mt-0.5 inline-flex items-center text-[11px] text-primary hover:underline"
                >
                  Staff login
                </Link>
              </div>
            </div>
          </div>

          {/* Search box */}
          <div className="mt-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service by name or ID"
              className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Category chips – scroll to section */}
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={handleChipAll}
                className={`rounded-full px-3 py-1 ${
                  highlightCat === "ALL"
                    ? "bg-primary text-black shadow-sm"
                    : "bg-background text-muted"
                }`}
              >
                All ({totalActive})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleChipCategory(cat.id)}
                  className={`rounded-full px-3 py-1 ${
                    highlightCat === cat.id
                      ? "bg-primary text-black shadow-sm"
                      : "bg-background text-muted"
                  }`}
                >
                  {cat.label} ({cat.items.length})
                </button>
              ))}
            </div>
          )}
        </header>

        {/* ── Body: sections & cards ─────────────────────────── */}
        {loading && !activeItems.length ? (
          <div className="mt-6 text-center text-sm text-muted">
            Loading menu…
          </div>
        ) : (
          <>
            {visibleCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted">
                No services match your search. Try a different name or ID.
              </div>
            ) : (
              <section className="space-y-6">
                {filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    className="scroll-mt-24"
                  >
                    {/* Category heading */}
                    <div className="mb-1 flex items-center gap-2">
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                        {cat.label}
                      </h2>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Service cards */}
                    <div className="space-y-2.5">
                      {cat.items.map((i) => {
                        const gstPct =
                          i.taxRate != null
                            ? Math.round(i.taxRate * 100)
                            : null;
                        return (
                          <article
                            key={i.id}
                            className="flex items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm"
                          >
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-medium sm:text-base">
                                {i.name}
                              </h3>
                              {i.variant && (
                                <p className="mt-0.5 text-xs text-muted">
                                  {i.variant}
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {gstPct != null && (
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                    GST {gstPct}% incl.
                                  </span>
                                )}
                                <span className="text-[10px] text-muted">
                                  Code:{" "}
                                  <span className="font-mono tracking-tight">
                                    {i.id}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <div className="ml-4 shrink-0 text-right">
                              <div className="text-sm font-semibold sm:text-base">
                                ₹{Number(i.price).toFixed(2)}
                              </div>
                              <div className="mt-0.5 text-[11px] text-muted">
                                per person
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {/* Footer on mobile */}
        <footer className="mt-6 text-center text-[11px] text-muted sm:hidden">
          <div>Powered by Bill Book</div>
          <div className="mt-1">
            <Link
              href="/dashboard"
              className="text-primary hover:underline"
            >
              Staff login
            </Link>
          </div>
        </footer>
      </div>

      {/* ── Floating bottom “Menu” button (mobile) ───────────── */}
      {categories.length > 0 && (
        <button
          type="button"
          onClick={openSheet}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black shadow-md shadow-black/40 sm:hidden"
        >
          <span>Menu</span>
        </button>
      )}

      {/* ── Bottom sheet: category quick jump (mobile) ───────── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:hidden"
          onClick={closeSheet}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-card px-4 pt-3 pb-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Jump to category
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    closeSheet();
                    handleChipCategory(cat.id);
                    scrollToCategorySection(cat.id);
                  }}
                  className="rounded-2xl border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-card"
                >
                  <div>{cat.label}</div>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {cat.items.length} item
                    {cat.items.length === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}