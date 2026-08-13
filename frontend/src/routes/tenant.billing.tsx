import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { getTenantBilling, type BillingInvoice } from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "Billing & invoices | WebMintra" }] }),
});

const statusStyles: Record<string, string> = {
  succeeded: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  refunded: "border-slate-600 bg-slate-700/40 text-slate-300",
  partially_refunded: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  disputed: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

function BillingPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["tenant-billing"],
    queryFn: getTenantBilling,
  });

  const invoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.invoices ?? []).filter((invoice) => {
      const matchesStatus = status === "all" || invoice.status === status;
      const matchesSearch = !query || invoice.invoiceNumber.toLowerCase().includes(query) || invoice.description.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [data?.invoices, search, status]);

  if (isLoading) return <BillingLoading />;
  if (isError || !data) return <BillingError onRetry={() => refetch()} isRetrying={isFetching} />;

  const { subscription, paymentMethod, summary } = data;
  const nextBillingDate = subscription.trialEndsAt || subscription.renewalDate;

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Account</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">Billing & invoices</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Review your plan, upcoming charges, and complete invoice history.</p>
        </div>
        <Link
          to="/tenant/subscription"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#07121f]"
        >
          Manage plan <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b1826]">
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-white">{subscription.planName}</h2>
                    <StatusBadge status={subscription.status} />
                  </div>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">{subscription.description}</p>
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-2xl font-bold text-white">{formatMoney(subscription.price, subscription.currency)}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">per {subscription.interval.replace("ly", "")}</p>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-3">
              <PlanDetail icon={CalendarDays} label={subscription.trialEndsAt ? "Trial ends" : "Next billing date"} value={nextBillingDate ? formatDate(nextBillingDate) : "No renewal scheduled"} />
              <PlanDetail icon={RefreshCw} label="Renewal" value={subscription.autoRenew ? "Automatic" : "Manual"} />
              <PlanDetail icon={FileText} label="Billing cycle" value={sentenceCase(subscription.interval)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0b1826] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Payment method</p>
              <h2 className="mt-2 text-base font-semibold text-white">Billing source</h2>
            </div>
            <CreditCard className="h-5 w-5 text-slate-500" />
          </div>
          {paymentMethod ? (
            <div className="mt-6">
              <p className="font-medium text-slate-100">{paymentMethod.label}</p>
              <p className="mt-1 text-xs text-slate-500">Last used {formatDate(paymentMethod.lastUsedAt)}</p>
            </div>
          ) : (
            <div className="mt-6 border-l-2 border-amber-400/60 pl-4">
              <p className="text-sm font-medium text-slate-200">No saved payment method</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">A payment method will appear after your first online payment.</p>
            </div>
          )}
        </div>
      </section>

      <section aria-label="Billing summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryMetric icon={Check} label="Total paid" value={formatMoney(summary.totalPaid, summary.currency)} tone="emerald" />
        <SummaryMetric icon={ReceiptText} label="Invoices" value={String(summary.invoiceCount)} tone="cyan" />
        <SummaryMetric icon={RefreshCw} label="Refunded" value={formatMoney(summary.refundedAmount, summary.currency)} tone="orange" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Invoice history</h2>
            <p className="mt-1 text-xs text-slate-500">Receipts and billing documents for this workspace.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block sm:w-64">
              <span className="sr-only">Search invoices</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices"
                className="h-10 w-full rounded-lg border border-slate-700 bg-[#081522] pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </label>
            <select
              aria-label="Filter invoice status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-[#081522] px-3 text-sm text-slate-300 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially refunded</option>
            </select>
          </div>
        </div>

        {invoices.length ? <InvoiceList invoices={invoices} planName={subscription.planName} /> : <InvoiceEmpty filtered={Boolean(search || status !== "all")} />}
      </section>
    </div>
  );
}

function PlanDetail({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-[#091725] px-4 py-4">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value, tone }: { icon: typeof Check; label: string; value: string; tone: "emerald" | "cyan" | "orange" }) {
  const tones = { emerald: "bg-emerald-500/10 text-emerald-400", cyan: "bg-cyan-500/10 text-cyan-400", orange: "bg-orange-500/10 text-orange-400" };
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-800 bg-[#0b1826] p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status === "succeeded" ? "Paid" : sentenceCase(status);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status] ?? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"}`}>{label}</span>;
}

function InvoiceList({ invoices, planName }: { invoices: BillingInvoice[]; planName: string }) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-[#081522] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
            <tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Receipt</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-slate-800/20">
                <td className="px-5 py-4"><p className="font-mono text-sm font-medium text-slate-200">{invoice.invoiceNumber}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-500">{invoice.description}</p></td>
                <td className="px-5 py-4 text-sm text-slate-400">{formatDate(invoice.paidAt || invoice.createdAt)}</td>
                <td className="px-5 py-4 text-sm font-semibold text-white">{formatMoney(invoice.amount, invoice.currency)}</td>
                <td className="px-5 py-4"><StatusBadge status={invoice.status} /></td>
                <td className="px-5 py-4 text-right"><InvoiceActions invoice={invoice} planName={planName} onPreview={setPreviewHtml} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-800 md:hidden">
        {invoices.map((invoice) => (
          <article key={invoice.id} className="p-5">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-mono text-sm font-medium text-slate-200">{invoice.invoiceNumber}</p><p className="mt-1 truncate text-xs text-slate-500">{invoice.description}</p></div><StatusBadge status={invoice.status} /></div>
            <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-xs text-slate-500">{formatDate(invoice.paidAt || invoice.createdAt)}</p><p className="mt-1 font-semibold text-white">{formatMoney(invoice.amount, invoice.currency)}</p></div><InvoiceActions invoice={invoice} planName={planName} onPreview={setPreviewHtml} /></div>
          </article>
        ))}
      </div>

      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button type="button" aria-label="Close preview" className="absolute inset-0 block h-full w-full cursor-default bg-slate-950/80 backdrop-blur-sm" onClick={() => setPreviewHtml(null)} />
          <div className="relative flex h-full max-h-[800px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1826] px-4 py-3">
              <h3 className="font-semibold text-white">Invoice Preview</h3>
              <button onClick={() => setPreviewHtml(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <iframe srcDoc={previewHtml} className="h-full w-full flex-1 bg-white" title="Invoice Preview" />
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceActions({ invoice, planName, onPreview }: { invoice: BillingInvoice; planName: string; onPreview: (html: string) => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        title={`Preview ${invoice.invoiceNumber}`}
        onClick={() => onPreview(getInvoiceHtml(invoice, planName, "preview"))}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <Eye className="mr-2 h-4 w-4" />
        Preview
      </button>
      <button
        type="button"
        title={`Download ${invoice.invoiceNumber}`}
        onClick={() => handleDownloadInvoice(invoice, planName)}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-500 px-3 text-xs font-medium text-slate-950 transition-colors hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#081522]"
      >
        <Download className="mr-2 h-4 w-4" />
        Download
      </button>
    </div>
  );
}

function InvoiceEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-500"><ReceiptText className="h-5 w-5" /></div>
      <h3 className="mt-4 text-sm font-semibold text-slate-200">{filtered ? "No matching invoices" : "No invoices yet"}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{filtered ? "Adjust your search or status filter." : "New invoices will appear here when charges are created for this workspace."}</p>
    </div>
  );
}

function BillingLoading() {
  return <div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-400" /><p className="mt-3 text-sm text-slate-500">Loading billing information</p></div></div>;
}

function BillingError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-sm text-center"><AlertCircle className="mx-auto h-8 w-8 text-rose-400" /><h1 className="mt-4 text-lg font-semibold text-white">Billing information is unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">The billing service could not be reached. Your account has not been changed.</p><button onClick={onRetry} disabled={isRetrying} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">{isRetrying && <Loader2 className="h-4 w-4 animate-spin" />} Retry</button></div>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount || 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : format(date, "dd MMM yyyy");
}

function sentenceCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value: unknown) {
  const entities: Record<string, string> = {
    "&": `&${"amp"};`,
    "<": `&${"lt"};`,
    ">": `&${"gt"};`,
    "'": `&${"#39"};`,
    '"': `&${"quot"};`,
  };
  return String(value ?? "").replace(/[&<>'"]/g, (character) => entities[character] ?? character);
}

function getInvoiceHtml(invoice: BillingInvoice, planName: string, action: "preview" | "download") {
  const address = invoice.billingAddress;
  const addressLine = [address?.name, address?.line1, address?.city, address?.state, address?.postalCode, address?.country].filter(Boolean).map(escapeHtml).join("<br>");
  const taxRows = invoice.taxes.map((tax) => `<tr><td>${escapeHtml(tax.name || "Tax")}${tax.rate != null ? ` (${escapeHtml(tax.rate)}%)` : ""}</td><td>${escapeHtml(formatMoney(tax.amount || 0, invoice.currency))}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;color:#142033;max-width:760px;margin:48px auto;padding:0 24px}header{display:flex;justify-content:space-between;border-bottom:2px solid #0e7490;padding-bottom:24px}h1{font-size:28px;margin:0}.brand{font-weight:700;color:#0e7490}.meta{text-align:right;color:#526071;font-size:13px}.details-row{display:flex;justify-content:space-between;margin-top:32px}.label{font-size:11px;text-transform:uppercase;color:#748094;letter-spacing:.08em}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:13px;border-bottom:1px solid #dce2e8}th:last-child,td:last-child{text-align:right}.total{font-size:18px;font-weight:700}.status{display:inline-block;padding:5px 9px;background:#d1fae5;color:#065f46;border-radius:4px;font-size:12px;font-weight:700}@media print{body{margin:24px auto}.print{display:none}}</style></head><body><header><div><div class="brand">WebMintra</div><h1>Invoice</h1></div><div class="meta"><strong>${escapeHtml(invoice.invoiceNumber)}</strong><br>Issued ${escapeHtml(formatDate(invoice.createdAt))}<br>${invoice.dueDate ? `Due ${escapeHtml(formatDate(invoice.dueDate))}` : ""}</div></header><div class="details-row"><div><div class="label">Billed to</div><p>${addressLine || "Workspace account holder"}</p></div><div style="text-align:right"><div class="label">Payment Details</div><p>${escapeHtml(invoice.methodLabel || sentenceCase(invoice.method))}<br>${invoice.transactionId ? `Txn ID: ${escapeHtml(invoice.transactionId)}<br>` : ""}${invoice.paidAt ? `${escapeHtml(formatDate(invoice.paidAt))}` : ""}</p></div></div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${escapeHtml(invoice.description || `${planName} subscription`)}</td><td>${escapeHtml(formatMoney(invoice.subtotal || invoice.amount, invoice.currency))}</td></tr>${invoice.discountAmount ? `<tr><td>Discount</td><td>-${escapeHtml(formatMoney(invoice.discountAmount, invoice.currency))}</td></tr>` : ""}${taxRows}<tr class="total"><td>Total</td><td>${escapeHtml(formatMoney(invoice.amount, invoice.currency))}</td></tr></tbody></table><section><span class="status">${escapeHtml(sentenceCase(invoice.status === "succeeded" ? "paid" : invoice.status))}</span></section>${action === "download" ? '<script>window.addEventListener("load",()=>window.print())<\/script>' : ''}</body></html>`;
}

function handleDownloadInvoice(invoice: BillingInvoice, planName: string) {
  const html = getInvoiceHtml(invoice, planName, "download");
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  
  if (printWindow) {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
