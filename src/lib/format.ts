// src/lib/format.ts

const NF_INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NF_NUM_2 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function inr(n: number): string {
  const v = Number(n);
  return NF_INR.format(Number.isFinite(v) ? v : 0);
}

export function num2(n: number): string {
  const v = Number(n);
  return NF_NUM_2.format(Number.isFinite(v) ? v : 0);
}

/**
 * Compact money formatter for charts/axis labels.
 * Examples: ₹950, ₹12.4k, ₹2.1L, ₹1.3Cr
 */
export function inrCompact(n: number): string {
  const v0 = Number(n);
  const v = Number.isFinite(v0) ? v0 : 0;

  const abs = Math.abs(v);

  if (abs < 1000) return `₹${Math.round(v)}`;

  if (abs < 100_000) {
    const x = v / 1000;
    const d = Math.abs(x) >= 10 ? 1 : 2;
    return `₹${x.toFixed(d)}k`;
  }

  if (abs < 10_000_000) {
    const x = v / 100_000;
    const d = Math.abs(x) >= 10 ? 1 : 2;
    return `₹${x.toFixed(d)}L`;
  }

  const x = v / 10_000_000;
  const d = Math.abs(x) >= 10 ? 1 : 2;
  return `₹${x.toFixed(d)}Cr`;
}
