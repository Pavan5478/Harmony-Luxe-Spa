import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBill } from "@/store/bills";
import InvoicePaper from "@/components/invoice/InvoicePaper";
import InvoiceWorkspace from "@/components/invoice/InvoiceWorkspace";
import type { BillDraft, BillLine, PaymentSplit } from "@/types/billing";

type PageProps = {
  params: Promise<{ id: string[] | string }>;
  searchParams?: Promise<{ print?: string; from?: string; edit?: string }>;
};

export const dynamic = "force-dynamic";

const IST_TZ = "Asia/Kolkata";

type InvoicePageBill = {
  id?: string;
  billNo?: string;
  status?: string;
  billDate?: string;
  finalizedAt?: string;
  createdAt?: string;
  printedAt?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  lines?: BillLine[];
  totals?: BillDraft["totals"];
  notes?: string;
  paymentMode?: string;
  split?: PaymentSplit;
};

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function normalizeStatus(raw: unknown): "DRAFT" | "FINAL" | "VOID" {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "DRAFT" || s === "FINAL" || s === "VOID") return s;
  return "FINAL";
}

function formatPrintedAt(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TZ,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatBillDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TZ,
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function toSafePart(value: string) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9\-_\.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function InvoicePage(props: PageProps) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const role = session.user.role;

  const params = await props.params;
  const sp = (await props.searchParams) || {};
  const autoPrint = sp.print === "1" || sp.print === "true";

  const idParam = params.id;
  const segments = Array.isArray(idParam) ? idParam : [idParam];
  const key = segments.map((s) => safeDecode(String(s))).join("/").trim();

  const found = await getBill(key);
  if (!found) notFound();

  const bill = found as InvoicePageBill;

  const billDateISO = bill.billDate || bill.finalizedAt || bill.createdAt;
  const billDate = billDateISO ? new Date(billDateISO) : new Date();

  const status = normalizeStatus(bill.status);

  const printedAt: string | null = bill.printedAt || null;
  const printedAtLabel: string | null = printedAt ? formatPrintedAt(printedAt) : null;

  const idOrNo: string = (bill.billNo as string) || (bill.id as string) || key;

  const backHref =
    sp.from === "billing" && sp.edit
      ? `/billing?edit=${encodeURIComponent(sp.edit)}`
      : "/invoices";

  const spaName = "Harmony luxe therapy center";
  const spaAddress = [
    "9th A Manin Road, Binnamangala, Hoysalanagar,",
    "1st Stage, Indiranagar, bengalore, Karnataka. 560038",
    "GSTIN: 29AARFH8480L1ZD",
  ];
  const spaPhone = "+91-90711 11599";
  const spaEmail = "harmonyluxetherapy@gmail.com";

  const billNoLabel = String(bill.billNo || bill.id || key || "--");
  const billDateLabel = formatBillDate(billDate);
  const pdfFileName = toSafePart(`Invoice-${billNoLabel}-${billDateLabel}`) || "Invoice";
  const canMutate = role !== "ACCOUNTS";

  return (
    <div className="invoice-shell full-bleed px-4 py-4 sm:px-6 lg:px-8 print:p-0 print:px-0 print:py-0 print:bg-white">
      <InvoiceWorkspace
        idOrNo={idOrNo}
        printedAt={printedAt}
        printedAtLabel={printedAtLabel}
        status={status}
        canMutate={canMutate}
        autoPrint={autoPrint && status === "FINAL"}
        backHref={backHref}
        billNoLabel={billNoLabel}
        billDateLabel={billDateLabel}
        pdfFileName={pdfFileName}
      >
        <InvoicePaper
          bill={bill}
          spaName={spaName}
          spaAddress={spaAddress}
          spaPhone={spaPhone}
          spaEmail={spaEmail}
          billDate={billDate}
        />
      </InvoiceWorkspace>
    </div>
  );
}
