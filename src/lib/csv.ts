export function toCsv(rows: any[][], header?: string[]) {
  const out: string[] = [];
  const emit = (r: (string | number | null | undefined)[]) =>
    out.push(
      r
        .map((v) => {
          const s = v == null ? "" : String(v);
          const esc = s.replace(/"/g, '""');
          return /[",\n]/.test(esc) ? `"${esc}"` : esc;
        })
        .join(",")
    );
  if (header?.length) emit(header);
  rows.forEach((r) => emit(r));
  return out.join("\n");
}