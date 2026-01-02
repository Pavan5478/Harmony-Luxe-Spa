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

function buildGroups(query: string, items: Item[], recent: Item[]) {
  const q = normalize(query);
  const tokens = q ? q.split(" ").filter(Boolean) : [];

  const MAX_SUGGEST = 28;
  const MAX_RESULTS = 60;

  // Empty query: Recent + All (minus recent)
  if (tokens.length === 0) {
    const recentTop = recent.slice(0, 10);
    const recentIds = new Set(recentTop.map((r) => r.id));

    const all = [...items]
      .sort((a, b) => {
        const an = normalize(a.name);
        const bn = normalize(b.name);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return (a.price ?? 0) - (b.price ?? 0);
      })
      .filter((it) => !recentIds.has(it.id))
      .slice(0, MAX_SUGGEST);

    const groups: Group[] = [];
    if (recentTop.length) groups.push({ label: `Recent (${recentTop.length})`, items: recentTop });
    groups.push({ label: "All items", items: all });

    return { groups, options: [...recentTop, ...all], tokens };
  }

  // Query search: id + name + variant
  const scored: { it: Item; score: number }[] = [];
  for (const it of items) {
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

  const results = scored.slice(0, MAX_RESULTS).map((s) => s.it);

  return {
    groups: [{ label: `Results (${scored.length})`, items: results }],
    options: results,
    tokens,
  };
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

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const didInitShortcuts = useRef(false);

  // block ONLY the programmatic focus-open after picking
  const blockNextFocusOpenRef = useRef(false);

  // ✅ menu sync: keep only active if present + dedupe by id (keep last)
  const usableItems = useMemo(() => {
    const filtered = (items || []).filter((it) => {
      if (typeof it.active === "boolean") return it.active === true;
      return true;
    });

    const seen = new Set<string>();
    const unique: Item[] = [];
    for (let i = filtered.length - 1; i >= 0; i--) {
      const it = filtered[i];
      const id = String(it?.id || "").trim();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(it);
    }
    unique.reverse();
    return unique;
  }, [items]);

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

  const { groups, options, tokens } = useMemo(
    () => buildGroups(query, usableItems, usableRecent),
    [query, usableItems, usableRecent]
  );

  const optionIndex = useMemo(() => {
    const m = new Map<string, number>();
    options.forEach((it, ix) => m.set(it.id, ix));
    return m;
  }, [options]);

  // reset active only when query changes (prevents annoying jumps)
  useEffect(() => setActive(0), [query]);

  // clamp active on list changes
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
    // keep active valid
    setActive((v) => {
      const n = options.length;
      if (n <= 0) return 0;
      return Math.min(Math.max(v, 0), n - 1);
    });
  }

  function pick(it: Item) {
    // block only the immediate focus-open caused by programmatic focus
    blockNextFocusOpenRef.current = true;

    onPick(it);
    setQuery("");
    setOpen(false);
    setActive(0);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      // after focus happens, allow normal click-open again
      setTimeout(() => {
        blockNextFocusOpenRef.current = false;
      }, 0);
    });
  }

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // keep active option visible (NO smooth -> no jitter)
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

  // Global shortcut: Ctrl/Cmd+K or "/" focuses the picker
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
        setOpen(false);
        return;
      }
      if (query) {
        e.preventDefault();
        setQuery("");
      }
      return;
    }

    if (e.key === "Tab") setOpen(false);
  }

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${listId}-q`} className="sr-only">
            Search items
          </label>

          <div className="relative">
            {/* ✅ Click anywhere on box opens dropdown (even if already focused) */}
            <div
              className=""
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-owns={`${listId}-listbox`}
              onMouseDown={(e) => {
                // left click only
                if ((e as any).button !== 0) return;
                // don’t steal clicks meant for dropdown buttons
                const t = e.target as HTMLElement | null;
                if (t?.closest("button")) return;

                // focus + open (works even if already focused)
                requestAnimationFrame(() => inputRef.current?.focus());
                openDropdown();
              }}
            >
              <input
                id={`${listId}-q`}
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  openDropdown();
                }}
                onFocus={() => {
                  // block only the programmatic focus right after pick
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
            </div>

            {open && (
              <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted">
                  <span className="font-medium">
                    {tokens.length ? "Search results" : "Suggestions"}
                  </span>

                  <div className="flex items-center gap-2">
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

                    {onClearRecent && usableRecent.length > 0 && tokens.length === 0 ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onClearRecent}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted hover:bg-background hover:text-foreground"
                      >
                        Clear recent
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  id={`${listId}-listbox`}
                  ref={listRef}
                  role="listbox"
                  className="overflow-auto px-1 pb-2 overscroll-contain"
                  style={{ maxHeight: "min(72vh, 640px)" }}
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
                                  "cursor-pointer rounded-xl px-2 py-2 transition",
                                  selected ? "bg-primary/10" : "hover:bg-background",
                                ].join(" ")}
                                onMouseEnter={() => setActive(ix)}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  pick(it);
                                }}
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
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-card sm:mt-[2px]"
        >
          Clear all
        </button>
      </div>

      {usableRecent.length > 0 && (
        <>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 hover:bg-background"
            >
              <span className="font-medium uppercase tracking-[0.16em]">Recent</span>
              <span className="text-[10px]">{showShortcuts ? "Hide" : "Show"}</span>
            </button>

            {onClearRecent && (
              <button
                type="button"
                onClick={onClearRecent}
                className="text-[10px] text-muted hover:text-foreground"
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
                  <span className="ml-2 text-[10px] text-muted">₹{it.price.toFixed(0)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}