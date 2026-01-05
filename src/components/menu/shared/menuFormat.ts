export function formatINR(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0).toFixed(2)}`;
  }
}

export function taxPct(taxRate: number) {
  return Math.round(Number(taxRate || 0) * 100);
}