import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getPayments } from "@/lib/admin-api";
import {
  Loader2,
  Search,
  Filter,
  IndianRupee,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminPayments", { page, search, status }],
    queryFn: () => getPayments({ page, limit: 10, search, status }),
  });

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Payments</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Track invoices, refunds, and revenue history.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                Total Revenue
              </p>
              <p className="text-xl font-black text-[#0f172a]">
                ₹
                {data?.summary?.totalRevenue?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) ?? "0.00"}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#ea580c]">
              <ArrowUpRight className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                Successful Transactions
              </p>
              <p className="text-xl font-black text-[#0f172a]">
                {data?.summary?.totalTransactions?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
              <ArrowDownRight className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                Refunded
              </p>
              <p className="text-xl font-black text-[#0f172a]">
                ₹
                {data?.summary?.refundedTotal?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) ?? "0.00"}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#fafcfb]">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                placeholder="Search invoice number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-4 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-8 text-xs font-medium text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
              >
                <option value="">All statuses</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#475569] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Invoice</th>
                <th className="px-6 py-3.5 font-bold">Amount</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Tenant</th>
                <th className="px-6 py-3.5 font-bold">Date</th>
                <th className="px-6 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                      <p className="text-sm font-medium text-[#64748b]">Loading payments...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.payments?.length ? (
                data.payments.map((payment: any) => (
                  <tr key={payment.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">{payment.invoiceNumber}</p>
                      <p className="text-[10px] font-medium text-[#64748b] capitalize">
                        {payment.method}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">
                        ₹{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] font-medium text-[#64748b]">{payment.currency}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          payment.status === "succeeded"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : payment.status === "pending"
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : payment.status === "failed"
                                ? "border border-rose-200 bg-rose-50 text-rose-700"
                                : "border border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {payment.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">
                        {payment.tenant?.businessName || payment.tenant?.name || "Unknown"}
                      </p>
                      <p className="text-[10px] text-[#64748b]">{payment.tenant?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-[#475569]">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="rounded-lg border border-[#e2e8f0] p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748b] font-medium">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#fafcfb] p-4">
            <span className="text-xs font-medium text-[#64748b]">
              Showing page {page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 transition"
              >
                Prev
              </button>
              <button
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
