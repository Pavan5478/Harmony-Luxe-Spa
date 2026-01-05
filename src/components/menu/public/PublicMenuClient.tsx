"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Item } from "@/types/billing";
import { formatINR } from "@/components/menu/shared/menuFormat";

type Option = Item;

type Group = {
  key: string; // stable key
  title: string; // service name
  options: Option[];
  minPrice: number;
};

type Category = {
  id: string;
  label: string;
  groups: Group[];
  optionCount: number;
};

function getCategoryKey(id: string): string {
  const slug = String(id || "").toLowerCase().trim();
  if (!slug) return "other";
  return slug.split("-")[0] || "other";
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
  return key
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// Try to sort options like 60, 90, 120 mins first (then fallback alpha)
function extractNumber(s?: string): number | null {
  if (!s) return null;
  const m = String(s).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function optionSort(a: Option, b: Option) {
  const an = extractNumber(a.variant);
  const bn = extractNumber(b.variant);
  if (an != null && bn != null) return an - bn;
  if (an != null) return -1;
  if (bn != null) return 1;
  // fallback: variant text, then price
  const av = (a.variant ?? "").toLowerCase();
  const bv = (b.variant ?? "").toLowerCase();
  if (av !== bv) return av.localeCompare(bv);
  return Number(a.price || 0) - Number(b.price || 0);
}

function scrollToCategorySection(catId: string) {
  const el = document.getElementById(`cat-${catId}`);
  if (!el) return;
  const offset = 86;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function PublicMenuClient({
  items,
  updatedLabel,
  hasTax,
}: {
  items: Item[];
  updatedLabel: string;
  hasTax: boolean;
}) {
  const [search, setSearch] = useState("");

  const categories = useMemo<Category[]>(() => {
    const map: Record<string, { id: string; label: string; options: Item[] }> =
      {};

    for (const it of items) {
      const key = getCategoryKey(it.id);
      if (!map[key]) map[key] = { id: key, label: getCategoryLabel(key), options: [] };
      map[key].options.push(it);
    }

    // convert options -> groups (group by name)
    const cats: Category[] = Object.values(map).map((c) => {
      const groupMap: Record<string, Group> = {};
      for (const opt of c.options) {
        const title = String(opt.name || "").trim();
        const gKey = title.toLowerCase(); // stable grouping
        if (!groupMap[gKey]) {
          groupMap[gKey] = {
            key: `${c.id}:${gKey}`,
            title,
            options: [],
            minPrice: Number(opt.price || 0),
          };
        }
        groupMap[gKey].options.push(opt);
        groupMap[gKey].minPrice = Math.min(groupMap[gKey].minPrice, Number(opt.price || 0));
      }

      const groups = Object.values(groupMap)
        .map((g) => ({
          ...g,
          options: g.options.slice().sort(optionSort),
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      return {
        id: c.id,
        label: c.label,
        groups,
        optionCount: c.options.length,
      };
    });

    return cats.sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filtered = useMemo<Category[]>(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;

    return categories
      .map((cat) => {
        const groups = cat.groups
          .map((g) => {
            // keep only options that match term OR title matches
            const titleMatch = g.title.toLowerCase().includes(term);
            const options = titleMatch
              ? g.options
              : g.options.filter((o) => {
                  const hay = `${o.name} ${o.variant ?? ""} ${o.id}`.toLowerCase();
                  return hay.includes(term);
                });

            if (!options.length) return null;

            const minPrice = Math.min(...options.map((o) => Number(o.price || 0)));
            return { ...g, options, minPrice };
          })
          .filter(Boolean) as Group[];

        return { ...cat, groups };
      })
      .filter((cat) => cat.groups.length > 0);
  }, [categories, search]);

  const totalOptions = items.length;
  const totalServices = useMemo(() => {
    // unique service count across all categories
    const s = new Set<string>();
    for (const cat of categories) for (const g of cat.groups) s.add(g.key);
    return s.size;
  }, [categories]);

  const visibleServices = filtered.reduce((sum, c) => sum + c.groups.length, 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6 sm:pb-10 sm:pt-8">
        {/* Sticky header (fast scan UX) */}
        <header className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border/60 bg-background/90 px-4 pb-3 pt-3 backdrop-blur sm:static sm:mx-0 sm:mb-6 sm:rounded-2xl sm:border sm:bg-card sm:px-6 sm:py-5 sm:shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Menu
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-primary sm:text-3xl">
                Services &amp; Prices
              </h1>

              {/* One clean line – no GST/code per item */}
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {totalServices} services • {totalOptions} options • Updated {updatedLabel} • Per
                person
                {hasTax ? " • Taxes included" : ""}
              </p>
            </div>

            <div className="hidden text-right sm:block">
              <Link href="/dashboard" className="text-[11px] text-primary hover:underline">
                Staff login
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service (e.g. aroma / thai / 60)"
              className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Category chips (scroll) */}
          {categories.length ? (
            <div className="mt-3 overflow-x-auto pb-1">
              <div className="flex w-max gap-2 text-[11px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="rounded-full bg-primary px-3 py-1 font-semibold text-black shadow-sm"
                >
                  All ({totalServices})
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => scrollToCategorySection(cat.id)}
                    className="rounded-full bg-card px-3 py-1 text-muted hover:text-foreground"
                    title={`${cat.optionCount} options`}
                  >
                    {cat.label} ({cat.groups.length})
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        {/* Body */}
        {visibleServices === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-muted">
            No services match your search.
          </div>
        ) : (
          <section className="space-y-5">
            {filtered.map((cat) => (
              <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {cat.label}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted">
                    {cat.groups.length} services
                  </span>
                </div>

                {/* Group cards */}
                <div className="space-y-2">
                  {cat.groups.map((g) => (
                    <article
                      key={g.key}
                      className="rounded-2xl border border-border/80 bg-card px-3.5 py-3 shadow-sm"
                    >
                      {/* Title + from price */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 truncate text-[13px] font-semibold sm:text-base">
                          {g.title}
                        </h3>

                        <div className="shrink-0 text-right">
                          <div className="text-[11px] text-muted">from</div>
                          <div className="text-[13px] font-semibold sm:text-base">
                            {formatINR(g.minPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Options grid */}
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {g.options.map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {o.variant ? o.variant : "Option"}
                              </div>
                            </div>
                            <div className="ml-2 shrink-0 font-semibold">
                              {formatINR(o.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Mobile footer */}
        <footer className="mt-8 text-center text-[11px] text-muted sm:hidden">
          <div>
            {totalServices} services • {totalOptions} options • Per person
            {hasTax ? " • Taxes included" : ""}
          </div>
          <div className="mt-1">
            <Link href="/dashboard" className="text-primary hover:underline">
              Staff login
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}