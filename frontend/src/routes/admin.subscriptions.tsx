import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSubscriptions } from "@/lib/admin-api";
import { Loader2, Search, Filter, CalendarDays, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/subscriptions")({
  component: SubscriptionsPage,
});

type SubscriptionRow = {
  id: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  tenant?: { businessName?: string; name?: string; email?: string };
  plan?: { slug?: string; name?: string; price?: number; interval?: string };
};

function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminSubscriptions", { page, status }],
    queryFn: () => getSubscriptions({ page, limit: 10, status }),
  });

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Subscriptions</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            View and manage tenant subscription lifecycles.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#fafcfb]">
          <div className="flex w-full items-center gap-2 sm:w-auto">
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
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#475569] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Tenant</th>
                <th className="px-6 py-3.5 font-bold">Plan</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Billing Period</th>
                <th className="px-6 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                      <p className="text-sm font-medium text-[#64748b]">Loading subscriptions...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.subscriptions?.length ? (
                data.subscriptions.map((sub: SubscriptionRow) => (
                  <tr key={sub.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">
                        {sub.tenant?.businessName || sub.tenant?.name || "Unknown Tenant"}
                      </p>
                      <p className="text-xs text-[#64748b]">{sub.tenant?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">
                        {sub.plan?.slug === "pro" ? "Business" : sub.plan?.name || "Unknown Plan"}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        ₹{sub.plan?.price} / {sub.plan?.interval}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          sub.status === "active"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : sub.status === "trialing"
                              ? "border border-cyan-200 bg-cyan-50 text-cyan-700"
                              : sub.status === "cancelled"
                                ? "border border-rose-200 bg-rose-50 text-rose-700"
                                : "border border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-[#475569]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <CalendarDays className="h-3.5 w-3.5 text-[#059669]" />
                          <span>Started: {new Date(sub.startDate).toLocaleDateString()}</span>
                        </div>
                        {sub.endDate && (
                          <div className="flex items-center gap-1.5 text-[#64748b]">
                            <RefreshCw className="h-3.5 w-3.5 text-[#ea580c]" />
                            <span>Renews: {new Date(sub.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-bold text-[#059669] hover:underline cursor-pointer">Manage</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b] font-medium">
                    No subscriptions found.
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
