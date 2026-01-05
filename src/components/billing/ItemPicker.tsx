"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

type Item = {
  id: string;
  name: string;
  variant?: string;
  price: number;
  active?: boolean;
  taxRate?: number;
};

type Props = {
  items: Item[];
  onPick: (it: Item) => void;
  onClear: () => void;
  recentItems?: Item[];
  onClearRecent?: () => void;
};

function normalize(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isTypingElement(el: EventTarget | null) {
  const n = el as HTMLElement | null;
  if (!n) return false;
  const tag = (n.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return n.isContentEditable;
}

function highlight(text: string, tokens: string[]): ReactNode {
  if (!text || tokens.length === 0) return text;

  const pattern = tokens.map(escapeRegExp).join("|");
  if (!pattern) return text;

  const re = new RegExp(`(${pattern})`, "ig");
  const parts = text.split(re);

  return parts.map((part, idx) => {
    const hit = tokens.some((t) => part.toLowerCase() === t.toLowerCase());
    return hit ? (
      <mark key={idx} className="rounded bg-primary/15 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    );
  });
}

type Group = { label: string; items: Item[] };
type Meta = {
  totalItems: number;
  shown: number;
  truncated: boolean;
  totalMatches?: number;
  filterLabel?: string;
};

function categoryKeyFromId(id: string) {
  const slug = String(id || "").toLowerCase().trim();
  if (!slug) return "other";
  return slug.split("-")[0] || "other";
}

function titleCase(s: string) {
  return s
    .split(/[-_ ]+/g)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function buildGroups(
  query: string,
  items: Item[],
  recent: Item[],
  category: string | null
): { groups: Group[]; options: Item[]; tokens: string[]; meta: Meta } {
  const q = normalize(query);
  const tokens = q ? q.split(" ").filter(Boolean) : [];

  const MAX_EMPTY = 500;
  const MAX_RESULTS = 500;

  const totalItems = items.length;

  const filteredByCategory =
    category && category !== "ALL"
      ? items.filter((it) => categoryKeyFromId(it.id) === category)
      : items;

  const filterLabel =
    category && category !== "ALL" ? titleCase(category) : undefined;

  // Empty query: Recent + All
  if (tokens.length === 0) {
    const recentTop = recent.slice(0, 10);
    const recentIds = new Set(recentTop.map((r) => r.id));

    const allSorted = [...filteredByCategory]
      .sort((a, b) => {
        const an = normalize(a.name);
        const bn = normalize(b.name);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return (a.price ?? 0) - (b.price ?? 0);
      })
      .filter((it) => !recentIds.has(it.id));

    const truncated = allSorted.length > MAX_EMPTY;
    const all = allSorted.slice(0, MAX_EMPTY);

    const groups: Group[] = [];
    if (recentTop.length && (!category || category === "ALL")) {
      groups.push({ label: `Recent (${recentTop.length})`, items: recentTop });
    }
    groups.push({
      label: filterLabel
        ? `${filterLabel} (${filteredByCategory.length})`
        : `All items (${totalItems})`,
      items: all,
    });

    const options = [
      ...(groups[0]?.label.startsWith("Recent") ? recentTop : []),
      ...all,
    ];

    return {
      groups,
      options,
      tokens,
      meta: {
        totalItems: filterLabel ? filteredByCategory.length : totalItems,
        shown: options.length,
        truncated,
        filterLabel,
      },
    };
  }

  // Search: id + name + variant
  const scored: { it: Item; score: number }[] = [];

  for (const it of filteredByCategory) {
    const id = normalize(it.id);
    const name = normalize(it.name);
    const variant = normalize(it.variant || "");
    const hay = `${id} ${name} ${variant}`.trim();

    if (tokens.some((t) => !hay.includes(t))) continue;

    let score = 0;
    if (name === q || hay === q) score -= 120;
    else if (id === q) score -= 90;

    for (const t of tokens) {
      if (name.startsWith(t)) score += 0;
      else if (id.startsWith(t)) score += 2;
      else if (variant.startsWith(t)) score += 4;
      else if (name.includes(t)) score += 8;
      else if (id.includes(t)) score += 10;
      else score += 12;
    }

    score += Math.min(30, Math.floor(name.length / 6));
    scored.push({ it, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const an = normalize(a.it.name);
    const bn = normalize(b.it.name);
    if (an < bn) return -1;
    if (an > bn) return 1;
    return (a.it.price ?? 0) - (b.it.price ?? 0);
  });

  const totalMatches = scored.length;
  const truncated = totalMatches > MAX_RESULTS;

  const results = scored.slice(0, MAX_RESULTS).map((s) => s.it);

  return {
    groups: [{ label: `Results (${totalMatches})`, items: results }],
    options: results,
    tokens,
    meta: {
      totalItems: filterLabel ? filteredByCategory.length : totalItems,
      shown: results.length,
      truncated,
      totalMatches,
      filterLabel,
    },
  };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return isMobile;
}

export default function ItemPicker({
  items,
  onPick,
  onClear,
  recentItems = [],
  onClearRecent,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const didInitShortcuts = useRef(false);

  const blockNextFocusOpenRef = useRef(false);

  // ✅ Dedup by id (keep last). (Billing should load ?all=1 if you need all items)
  const usableItems = useMemo(() => {
    const list = items || [];
    const seen = new Set<string>();
    const unique: Item[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i];
      const id = String(it?.id || "").trim();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(it);
    }
    unique.reverse();
    return unique;
  }, [items]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of usableItems) {
      const k = categoryKeyFromId(it.id);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const list = Array.from(counts.entries())
      .map(([key, count]) => ({ key, label: titleCase(key), count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ key: "ALL", label: "All", count: usableItems.length }, ...list];
  }, [usableItems]);

  const [category, setCategory] = useState<string>("ALL");

  const usableRecent = useMemo(() => {
    if (!recentItems?.length) return [];
    const allowed = new Set(usableItems.map((x) => x.id));
    return recentItems.filter((r) => allowed.has(r.id));
  }, [recentItems, usableItems]);

  useEffect(() => {
    if (didInitShortcuts.current) return;
    setShowShortcuts((usableRecent?.length ?? 0) > 0);
    didInitShortcuts.current = true;
  }, [usableRecent]);

  const { groups, options, tokens, meta } = useMemo(
    () => buildGroups(query, usableItems, usableRecent, category),
    [query, usableItems, usableRecent, category]
  );

  const optionIndex = useMemo(() => {
    const m = new Map<string, number>();
    options.forEach((it, ix) => m.set(it.id, ix));
    return m;
  }, [options]);

  useEffect(() => setActive(0), [query, category]);

  useEffect(() => {
    setActive((v) => {
      const n = options.length;
      if (n <= 0) return 0;
      return Math.min(Math.max(v, 0), n - 1);
    });
  }, [options.length]);

  function optionId(ix: number) {
    return `${listId}-opt-${ix}`;
  }

  function openDropdown() {
    setOpen(true);
    setActive((v) => {
      const n = options.length;
      if (n <= 0) return 0;
      return Math.min(Math.max(v, 0), n - 1);
    });
  }

  function closeDropdown() {
    setOpen(false);
  }

  function pick(it: Item) {
    blockNextFocusOpenRef.current = true;

    onPick(it);
    setQuery("");
    setActive(0);
    setOpen(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setTimeout(() => {
        blockNextFocusOpenRef.current = false;
      }, 0);
    });
  }

  // close on outside click (desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    function onDown(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  // keep active option visible
  useEffect(() => {
    if (!open || options.length === 0) return;
    const el = document.getElementById(optionId(active));
    const box = listRef.current;
    if (!el || !box) return;

    const top = el.offsetTop;
    const bottom = top + el.clientHeight;
    const viewTop = box.scrollTop;
    const viewBottom = viewTop + box.clientHeight;

    if (top < viewTop) box.scrollTop = top;
    else if (bottom > viewBottom) box.scrollTop = bottom - box.clientHeight;
  }, [active, open, options.length]);

  // Global shortcut
  useEffect(() => {
    function onGlobalKey(e: globalThis.KeyboardEvent) {
      const isK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const isSlash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey;

      if (isK) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if (isSlash && !isTypingElement(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onGlobalKey as any);
    return () => window.removeEventListener("keydown", onGlobalKey as any);
  }, []);

  function moveActive(delta: number) {
    const n = options.length;
    if (n <= 0) return;
    setActive((v) => {
      const next = (v + delta) % n;
      return next < 0 ? next + n : next;
    });
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    const n = options.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      if (n > 0) moveActive(+1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(Math.max(0, n - 1));
        return;
      }
      if (n > 0) moveActive(-1);
      return;
    }

    if (e.key === "Enter") {
      if (!open) return void openDropdown();
      const it = options[active];
      if (it) {
        e.preventDefault();
        pick(it);
      }
      return;
    }

    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        closeDropdown();
        return;
      }
      if (query) {
        e.preventDefault();
        setQuery("");
      }
      return;
    }

    if (e.key === "Tab") closeDropdown();
  }

  // Shared list (dropdown + mobile sheet)
  const ListContent = (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted">
        <div className="font-medium">
          {tokens.length ? (
            <>
              Results{" "}
              <span className="text-foreground">{meta.totalMatches ?? options.length}</span>{" "}
              • Showing <span className="text-foreground">{meta.shown}</span>
            </>
          ) : (
            <>
              Showing <span className="text-foreground">{meta.shown}</span> /{" "}
              <span className="text-foreground">{meta.totalItems}</span>
              {meta.filterLabel ? <span className="ml-2">• {meta.filterLabel}</span> : null}
            </>
          )}
          {meta.truncated ? (
            <span className="ml-2 text-[10px] text-muted">Type to search more…</span>
          ) : null}
        </div>

        {query ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery("");
              openDropdown();
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-background hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Categories (only when not searching) */}
      {tokens.length === 0 && categories.length > 1 ? (
        <div className="border-t border-border/60 px-3 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 text-[11px]">
            {categories.map((c) => {
              const activeChip = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={[
                    "shrink-0 rounded-full px-3 py-1",
                    activeChip
                      ? "bg-primary text-black shadow-sm"
                      : "bg-background text-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {c.label} ({c.count})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        id={`${listId}-listbox`}
        ref={listRef}
        role="listbox"
        className="max-h-[70vh] overflow-auto px-1 pb-2 overscroll-contain"
      >
        {options.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted">No matching items.</div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="pb-1">
              <div className="sticky top-0 z-10 bg-card/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted backdrop-blur">
                {g.label}
              </div>

              <div className="space-y-1">
                {g.items.map((it) => {
                  const ix = optionIndex.get(it.id);
                  if (ix == null) return null;
                  const selected = ix === active;

                  return (
                    <div
                      key={it.id}
                      id={optionId(ix)}
                      role="option"
                      aria-selected={selected}
                      className={[
                        "cursor-pointer rounded-xl px-3 py-3 transition",
                        selected ? "bg-primary/10" : "hover:bg-background",
                      ].join(" ")}
                      onMouseEnter={() => setActive(ix)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(it);
                      }}
                      onTouchStart={() => setActive(ix)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {highlight(it.name, tokens)}
                          </div>
                          <div className="truncate text-[11px] text-muted">
                            {it.variant ? highlight(it.variant, tokens) : " "}
                          </div>
                        </div>

                        <div className="shrink-0 pt-0.5 text-sm font-semibold text-foreground">
                          ₹{Number(it.price || 0).toFixed(0)}
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-muted">Click / Enter to add</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Pills shown near input (desktop)
  const totalPill = (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted">
      {usableItems.length} items
    </span>
  );

  const resultsPill =
    open && tokens.length ? (
      <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted">
        Results:{" "}
        <span className="ml-1 text-foreground">
          {meta.totalMatches ?? options.length}
        </span>
      </span>
    ) : null;

  return (
    <div ref={rootRef} className="space-y-3">
      {/* ✅ Better desktop layout: input row + clear all */}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        {/* Wrap input + dropdown with relative so dropdown anchors correctly */}
        <div className="relative">
          <div className="">
            <input
              id={`${listId}-q`}
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                openDropdown();
              }}
              onFocus={() => {
                if (blockNextFocusOpenRef.current) return;
                openDropdown();
              }}
              onKeyDown={onInputKeyDown}
              placeholder="+ Add line item… (type to search)"
              autoComplete="off"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              aria-autocomplete="list"
              aria-controls={`${listId}-listbox`}
              aria-activedescendant={open && options.length ? optionId(active) : undefined}
            />

            {/* clear query (x) */}
            {query ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  requestAnimationFrame(() => inputRef.current?.focus());
                  openDropdown();
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-xs text-muted hover:bg-background hover:text-foreground"
                aria-label="Clear search"
                title="Clear search"
              >
                ✕
              </button>
            ) : null}

            {/* Mobile browse button */}
            {isMobile ? (
              <button
                type="button"
                onClick={() => openDropdown()}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold hover:bg-background"
              >
                Browse
              </button>
            ) : null}
          </div>

          {/* helper line (desktop) */}
          <div className="mt-2 hidden items-center justify-between text-[11px] text-muted sm:flex">
            <div className="flex items-center gap-2">
              <span>Tip: “/” or Ctrl/⌘K</span>
              <span className="h-3 w-px bg-border" />
              <span>↑/↓ + Enter</span>
            </div>
            <div className="flex items-center gap-2">
              {meta.filterLabel ? <span>Filter: {meta.filterLabel}</span> : <span>Filter: All</span>}
            </div>
          </div>

          {/* Desktop dropdown */}
          {open && !isMobile ? (
            <div className="absolute left-0 right-0 z-30 mt-2">{ListContent}</div>
          ) : null}
        </div>

        {/* Clear all (better style) */}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-background sm:mt-0 sm:py-3"
          title="Clear all bill line items"
        >
          Clear all
        </button>
      </div>

      {/* Mobile full-screen sheet */}
      {open && isMobile ? (
        <div className="fixed inset-0 z-50 bg-black/55" onMouseDown={closeDropdown}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl border border-border bg-background p-3 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />

            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Add item</div>
              <button
                type="button"
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold"
                onClick={closeDropdown}
              >
                Close
              </button>
            </div>

            <div className="mt-2">
              <div className="rounded-2xl border border-border bg-card px-3 py-2 shadow-sm">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search… (e.g. thai 60)"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-3">{ListContent}</div>
          </div>
        </div>
      ) : null}

      {/* Recent shortcuts */}
      {usableRecent.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted hover:bg-card"
            >
              RECENT
              <span className="text-[10px] font-medium">
                {showShortcuts ? "Hide" : "Show"}
              </span>
            </button>

            {onClearRecent && (
              <button
                type="button"
                onClick={onClearRecent}
                className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted hover:bg-background hover:text-foreground"
              >
                Clear recent
              </button>
            )}
          </div>

          {showShortcuts && (
            <div className="flex flex-wrap gap-1.5">
              {usableRecent.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(it);
                  }}
                  className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground hover:bg-card"
                  title={`${it.name}${it.variant ? ` • ${it.variant}` : ""} — ₹${it.price}`}
                >
                  <span className="max-w-[260px] truncate">
                    {it.name}
                    {it.variant ? ` • ${it.variant}` : ""}
                  </span>
                  <span className="ml-2 text-[10px] text-muted">
                    ₹{Number(it.price || 0).toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}