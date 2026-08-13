import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getPayments } from "@/lib/admin-api";
import { Loader2, Search, Filter, DollarSign, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
          <h1 className="font-display text-2xl font-bold tracking-tight">Payments</h1>
          <p className="mt-1 text-xs text-slate-500">Track invoices, refunds, and revenue history.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300"><DollarSign className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] text-slate-500">Total Revenue</p>
              <p className="font-display text-xl font-bold text-slate-200">
                ${data?.summary?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300"><ArrowUpRight className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] text-slate-500">Successful Transactions</p>
              <p className="font-display text-xl font-bold text-slate-200">{data?.summary?.totalTransactions?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-400/15 text-rose-300"><ArrowDownRight className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] text-slate-500">Refunded</p>
              <p className="font-display text-xl font-bold text-slate-200">
                ${data?.summary?.refundedTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input 
                placeholder="Search invoice number..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="relative">
              <select 
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-8 text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /><p className="text-sm text-slate-500">Loading payments...</p></div></td></tr>
              ) : data?.payments?.length ? (
                data.payments.map((payment: any) => (
                  <tr key={payment.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{payment.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{payment.method}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">₹{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-slate-500">{payment.currency}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                        payment.status === 'succeeded' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                        payment.status === 'pending' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                        payment.status === 'failed' ? 'border-rose-500/20 bg-rose-500/10 text-rose-400' :
                        'border-slate-700 bg-slate-800 text-slate-300'
                      }`}>
                        {payment.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{payment.tenant?.businessName || payment.tenant?.name || "Unknown"}</p>
                      <p className="text-[10px] text-slate-500">{payment.tenant?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-cyan-400" title="Download Invoice">
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-500">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 p-4">
            <span className="text-xs text-slate-500">
              Showing page {page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50">Prev</button>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
