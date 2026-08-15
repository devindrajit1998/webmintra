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
          <h1 className="font-display text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="mt-1 text-xs text-slate-500">
            View and manage tenant subscription lifecycles.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-8 text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Billing Period</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      <p className="text-sm text-slate-500">Loading subscriptions...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.subscriptions?.length ? (
                data.subscriptions.map((sub: SubscriptionRow) => (
                  <tr key={sub.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">
                        {sub.tenant?.businessName || sub.tenant?.name || "Unknown Tenant"}
                      </p>
                      <p className="text-xs text-slate-500">{sub.tenant?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">
                        {sub.plan?.slug === "pro" ? "Business" : sub.plan?.name || "Unknown Plan"}
                      </p>
                      <p className="text-xs text-slate-500">
                        ₹{sub.plan?.price} / {sub.plan?.interval}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          sub.status === "active"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : sub.status === "trialing"
                              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                              : sub.status === "cancelled"
                                ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                                : "border-slate-700 bg-slate-800 text-slate-300"
                        }`}
                      >
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>Started: {new Date(sub.startDate).toLocaleDateString()}</span>
                        </div>
                        {sub.endDate && (
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Renews: {new Date(sub.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs text-cyan-400 hover:text-cyan-300">Manage</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
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
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50"
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
