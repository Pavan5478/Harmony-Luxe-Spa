import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBill } from "@/store/bills";
import InvoicePaper from "@/components/invoice/InvoicePaper";
import InvoiceWorkspace from "@/components/invoice/InvoiceWorkspace";

type PageProps = {
  params: Promise<{ id: string[] | string }>;
  searchParams?: Promise<{ print?: string; from?: string; edit?: string }>;
};

export const dynamic = "force-dynamic";

export default async function InvoicePage(props: PageProps) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const params = await props.params;
  const sp = (await props.searchParams) || {};
  const autoPrint = sp.print === "1" || sp.print === "true";

  const idParam = params.id;
  const segments = Array.isArray(idParam) ? idParam : [idParam];
  const key = decodeURIComponent(segments.join("/")).trim();

  const found = await getBill(key);
  if (!found) notFound();

  const bill: any = found;

  const billDateISO = bill.billDate || bill.finalizedAt || bill.createdAt;
  const billDate = billDateISO ? new Date(billDateISO) : new Date();

  const status: "DRAFT" | "FINAL" | "VOID" =
    (bill.status as "DRAFT" | "FINAL" | "VOID") || "FINAL";

  const printedAt: string | null = bill.printedAt || null;
  const idOrNo: string = (bill.billNo as string) || (bill.id as string) || key;

  const backHref =
    sp.from === "billing" && sp.edit
      ? `/billing?edit=${encodeURIComponent(sp.edit)}`
      : "/invoices";

  const spaName = "Harmony Luxe";
  const spaAddress = [
    "123, Sample Street",
    "Some Area, City - 600001",
    "GSTIN: 33AAAAA0000A1Z5",
  ];
  const spaPhone = "+91 98765 43210";
  const spaEmail = "info@spa.com";

  const billNoLabel = String(bill.billNo || bill.id || key || "—");
  const billDateLabel = billDate.toLocaleDateString();

  return (
    <div className="invoice-shell full-bleed px-4 py-4 sm:px-6 lg:px-8">
      <InvoiceWorkspace
        idOrNo={idOrNo}
        printedAt={printedAt}
        status={status}
        autoPrint={autoPrint && status === "FINAL"}
        backHref={backHref}
        billNoLabel={billNoLabel}
        billDateLabel={billDateLabel}
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