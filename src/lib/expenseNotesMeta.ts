// src/lib/expenseNotesMeta.ts

export function parseExpenseNotesMeta(rawNotes?: string) {
  const lines = String(rawNotes || "").split(/\r?\n/);

  let vendor = "";
  let receipt = "";
  const rest: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    const lower = t.toLowerCase();

    if (lower.startsWith("vendor:")) {
      vendor = t.slice(7).trim();
      continue;
    }
    if (lower.startsWith("receipt:")) {
      receipt = t.slice(8).trim();
      continue;
    }
    if (t) rest.push(line);
  }

  return {
    vendor,
    receipt,
    notes: rest.join("\n").trim(),
  };
}

export function buildExpenseNotesMeta(vendor: string, receipt: string, notes: string) {
  const out: string[] = [];
  const v = vendor.trim();
  const r = receipt.trim();
  const n = notes.trim();

  if (v) out.push(`Vendor: ${v}`);
  if (r) out.push(`Receipt: ${r}`);
  if (n) out.push(n);

  return out.join("\n");
}