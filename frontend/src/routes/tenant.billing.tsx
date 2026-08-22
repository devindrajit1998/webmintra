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
      const matchesSearch =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.description.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [data?.invoices, search, status]);

  if (isLoading) return <BillingLoading />;
  if (isError || !data) return <BillingError onRetry={() => refetch()} isRetrying={isFetching} />;

  const { subscription, paymentMethod, summary } = data;
  const nextBillingDate = subscription.trialEndsAt || subscription.renewalDate;

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white px-5 py-6 shadow-xs sm:px-7">
        <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
          <span className="flex-1 bg-[#ea580c]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#059669]" />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#fff7ed] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-[#ecfdf5] blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c2410c]">
              <WalletCards className="h-3.5 w-3.5" /> Billing & Invoices
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Billing Overview
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Review your active plan, upcoming charges, payment sources, and invoice history.
            </p>
          </div>
          <Link
            to="/tenant/subscription"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857]"
          >
            Manage plan <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Plan Details & Payment Method */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] text-[#059669] shadow-2xs">
                  <WalletCards className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-xl font-extrabold text-[#0f172a]">
                      {subscription.planName}
                    </h2>
                    <StatusBadge status={subscription.status} />
                  </div>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#64748b]">
                    {subscription.description || "Active WebMintra workspace subscription."}
                  </p>
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="text-2xl font-black text-[#0f172a]">
                  {formatMoney(subscription.price, subscription.currency)}
                </p>
                <p className="mt-0.5 text-xs font-bold capitalize text-[#64748b]">
                  per {subscription.interval.replace("ly", "")}
                </p>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#e2e8f0] sm:grid-cols-3">
              <PlanDetail
                icon={CalendarDays}
                label={subscription.trialEndsAt ? "Trial ends" : "Next billing date"}
                value={nextBillingDate ? formatDate(nextBillingDate) : "No renewal scheduled"}
              />
              <PlanDetail
                icon={RefreshCw}
                label="Renewal"
                value={subscription.autoRenew ? "Automatic" : "Manual"}
              />
              <PlanDetail
                icon={FileText}
                label="Billing cycle"
                value={sentenceCase(subscription.interval)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#059669]">
                Payment method
              </p>
              <h2 className="mt-0.5 text-base font-extrabold text-[#0f172a]">Billing source</h2>
            </div>
            <CreditCard className="h-5 w-5 text-[#64748b]" />
          </div>
          {paymentMethod ? (
            <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <p className="font-extrabold text-sm text-[#0f172a]">{paymentMethod.label}</p>
              <p className="mt-1 text-xs text-[#64748b]">
                Last used {formatDate(paymentMethod.lastUsedAt)}
              </p>
            </div>
          ) : (
            <div className="mt-5 border-l-3 border-[#ea580c] bg-[#fff7ed] p-4 rounded-r-xl">
              <p className="text-xs font-bold text-[#7c2d12]">No saved card yet</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#9a3412]">
                Your payment source will appear here automatically after your first online checkout.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Summary Metrics */}
      <section aria-label="Billing summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryMetric
          icon={Check}
          label="Total paid"
          value={formatMoney(summary.totalPaid, summary.currency)}
          tone="emerald"
        />
        <SummaryMetric
          icon={ReceiptText}
          label="Invoices"
          value={String(summary.invoiceCount)}
          tone="cyan"
        />
        <SummaryMetric
          icon={RefreshCw}
          label="Refunded"
          value={formatMoney(summary.refundedAmount, summary.currency)}
          tone="orange"
        />
      </section>

      {/* Invoices List */}
      <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="flex flex-col gap-4 border-b border-[#f1f5f9] p-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#0f172a]">Invoice history</h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Receipts and tax invoices for this workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block sm:w-64">
              <span className="sr-only">Search invoices</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices..."
                className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-10 pr-3 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669] focus:bg-white transition"
              />
            </label>
            <select
              aria-label="Filter invoice status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] focus:bg-white transition cursor-pointer"
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

        {invoices.length ? (
          <InvoiceList invoices={invoices} planName={subscription.planName} />
        ) : (
          <InvoiceEmpty filtered={Boolean(search || status !== "all")} />
        )}
      </section>
    </div>
  );
}

function PlanDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-[#f8fafc] px-4 py-4">
      <Icon className="h-4 w-4 shrink-0 text-[#94a3b8]" />
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#64748b]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-bold text-[#0f172a]">{value}</p>
      </div>
    </div>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Check;
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "orange";
}) {
  const tones = {
    emerald: "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
    cyan: "bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]",
    orange: "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]} shadow-2xs`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">{label}</p>
        <p className="mt-0.5 text-2xl font-black text-[#0f172a]">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status === "succeeded" ? "Paid" : sentenceCase(status);
  const isPaid = status === "succeeded" || status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${
        isPaid
          ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]"
          : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
      }`}
    >
      {label}
    </span>
  );
}

function InvoiceList({ invoices, planName }: { invoices: BillingInvoice[]; planName: string }) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
            <tr>
              <th className="px-6 py-3.5">Invoice</th>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Amount</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-[#f8fafc]">
                <td className="px-6 py-4">
                  <p className="font-mono text-xs font-bold text-[#0f172a]">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="mt-0.5 max-w-xs truncate text-[11px] font-medium text-[#64748b]">
                    {invoice.description}
                  </p>
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-[#64748b]">
                  {formatDate(invoice.paidAt || invoice.createdAt)}
                </td>
                <td className="px-6 py-4 text-sm font-black text-[#0f172a]">
                  {formatMoney(invoice.amount, invoice.currency)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <InvoiceActions
                    invoice={invoice}
                    planName={planName}
                    onPreview={setPreviewHtml}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[#f1f5f9] md:hidden">
        {invoices.map((invoice) => (
          <article key={invoice.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-bold text-[#0f172a]">
                  {invoice.invoiceNumber}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#64748b]">
                  {invoice.description}
                </p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-[#64748b]">
                  {formatDate(invoice.paidAt || invoice.createdAt)}
                </p>
                <p className="mt-0.5 text-base font-black text-[#0f172a]">
                  {formatMoney(invoice.amount, invoice.currency)}
                </p>
              </div>
              <InvoiceActions invoice={invoice} planName={planName} onPreview={setPreviewHtml} />
            </div>
          </article>
        ))}
      </div>

      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 block h-full w-full cursor-default bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setPreviewHtml(null)}
          />
          <div className="relative flex h-full max-h-[800px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1826] px-4 py-3">
              <h3 className="font-semibold text-white">Invoice Preview</h3>
              <button
                onClick={() => setPreviewHtml(null)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="h-full w-full flex-1 bg-white"
              title="Invoice Preview"
            />
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceActions({
  invoice,
  planName,
  onPreview,
}: {
  invoice: BillingInvoice;
  planName: string;
  onPreview: (html: string) => void;
}) {
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
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
        <ReceiptText className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-200">
        {filtered ? "No matching invoices" : "No invoices yet"}
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {filtered
          ? "Adjust your search or status filter."
          : "New invoices will appear here when charges are created for this workspace."}
      </p>
    </div>
  );
}

function BillingLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-400" />
        <p className="mt-3 text-sm text-slate-500">Loading billing information</p>
      </div>
    </div>
  );
}

function BillingError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
        <h1 className="mt-4 text-lg font-semibold text-white">
          Billing information is unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The billing service could not be reached. Your account has not been changed.
        </p>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />} Retry
        </button>
      </div>
    </div>
  );
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: amount % 1 ? 2 : 0,
  }).format(amount || 0);
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
  const addressLine = [
    address?.name,
    address?.line1,
    address?.city,
    address?.state,
    address?.postalCode,
    address?.country,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
  const taxRows = invoice.taxes
    .map(
      (tax) =>
        `<tr><td>${escapeHtml(tax.name || "Tax")}${tax.rate != null ? ` (${escapeHtml(tax.rate)}%)` : ""}</td><td>${escapeHtml(formatMoney(tax.amount || 0, invoice.currency))}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;color:#142033;max-width:760px;margin:48px auto;padding:0 24px}header{display:flex;justify-content:space-between;border-bottom:2px solid #0e7490;padding-bottom:24px}h1{font-size:28px;margin:0}.brand{font-weight:700;color:#0e7490}.meta{text-align:right;color:#526071;font-size:13px}.details-row{display:flex;justify-content:space-between;margin-top:32px}.label{font-size:11px;text-transform:uppercase;color:#748094;letter-spacing:.08em}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:13px;border-bottom:1px solid #dce2e8}th:last-child,td:last-child{text-align:right}.total{font-size:18px;font-weight:700}.status{display:inline-block;padding:5px 9px;background:#d1fae5;color:#065f46;border-radius:4px;font-size:12px;font-weight:700}@media print{body{margin:24px auto}.print{display:none}}</style></head><body><header><div><div class="brand">WebMintra</div><h1>Invoice</h1></div><div class="meta"><strong>${escapeHtml(invoice.invoiceNumber)}</strong><br>Issued ${escapeHtml(formatDate(invoice.createdAt))}<br>${invoice.dueDate ? `Due ${escapeHtml(formatDate(invoice.dueDate))}` : ""}</div></header><div class="details-row"><div><div class="label">Billed to</div><p>${addressLine || "Workspace account holder"}</p></div><div style="text-align:right"><div class="label">Payment Details</div><p>${escapeHtml(invoice.methodLabel || sentenceCase(invoice.method))}<br>${invoice.transactionId ? `Txn ID: ${escapeHtml(invoice.transactionId)}<br>` : ""}${invoice.paidAt ? `${escapeHtml(formatDate(invoice.paidAt))}` : ""}</p></div></div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${escapeHtml(invoice.description || `${planName} subscription`)}</td><td>${escapeHtml(formatMoney(invoice.subtotal || invoice.amount, invoice.currency))}</td></tr>${invoice.discountAmount ? `<tr><td>Discount</td><td>-${escapeHtml(formatMoney(invoice.discountAmount, invoice.currency))}</td></tr>` : ""}${taxRows}<tr class="total"><td>Total</td><td>${escapeHtml(formatMoney(invoice.amount, invoice.currency))}</td></tr></tbody></table><section><span class="status">${escapeHtml(sentenceCase(invoice.status === "succeeded" ? "paid" : invoice.status))}</span></section>${action === "download" ? '<script>window.addEventListener("load",()=>window.print())</script>' : ""}</body></html>`;
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
