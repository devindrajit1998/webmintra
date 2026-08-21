import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSubscriptions, updateSubscription, cancelSubscription, getPlans } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/ui/SaaSSkeletons";
import {
  Loader2,
  Filter,
  CalendarDays,
  RefreshCw,
  X,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  User,
  Sparkles,
  CreditCard,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/subscriptions")({
  component: SubscriptionsPage,
});

type SubscriptionRow = {
  id: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  trialEndsAt?: string | null;
  notes?: string;
  autoRenew?: boolean;
  tenant?: { id?: string; businessName?: string; name?: string; email?: string };
  plan?: { id?: string; slug?: string; name?: string; price?: number; interval?: string; currency?: string };
};

function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selectedSub, setSelectedSub] = useState<SubscriptionRow | null>(null);

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
            View, audit, and manage tenant subscription lifecycles and billing access.
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
                className="h-9 appearance-none rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-8 text-xs font-bold text-[#0f172a] focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 outline-none cursor-pointer shadow-2xs"
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

        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
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
                {data?.subscriptions?.length ? (
                  data.subscriptions.map((sub: SubscriptionRow) => (
                    <tr key={sub.id} className="transition-colors hover:bg-[#f8fafc]">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#0f172a]">
                          {sub.tenant?.businessName || sub.tenant?.name || "Unknown Tenant"}
                        </p>
                        <p className="text-xs font-medium text-[#64748b]">{sub.tenant?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#0f172a]">
                          {sub.plan?.slug === "pro" ? "Business" : sub.plan?.name || "Standard Plan"}
                        </p>
                        <p className="text-xs font-semibold text-[#059669]">
                          {sub.plan?.price !== undefined ? `₹${sub.plan.price.toLocaleString("en-IN")}` : "Free"}
                          {sub.plan?.interval ? ` / ${sub.plan.interval}` : ""}
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
                        <button
                          type="button"
                          onClick={() => setSelectedSub(sub)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#059669] hover:bg-[#ecfdf5] hover:border-[#a7f3d0] shadow-2xs transition cursor-pointer"
                        >
                          Manage
                        </button>
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
        )}

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

      {/* Manage Subscription Modal / Drawer */}
      {selectedSub && (
        <ManageSubscriptionDrawer
          sub={selectedSub}
          onClose={() => setSelectedSub(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["adminSubscriptions"] });
            setSelectedSub(null);
          }}
        />
      )}
    </div>
  );
}

function ManageSubscriptionDrawer({
  sub,
  onClose,
  onSaved,
}: {
  sub: SubscriptionRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(sub.status);
  const [endDate, setEndDate] = useState(
    sub.endDate ? new Date(sub.endDate).toISOString().split("T")[0] : "",
  );
  const [notes, setNotes] = useState(sub.notes || "");
  const [cancelReason, setCancelReason] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateSubscription(sub.id, data),
    onSuccess: () => {
      toast.success("Subscription updated successfully!");
      onSaved();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update subscription."),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelSubscription(sub.id, reason),
    onSuccess: () => {
      toast.success("Subscription cancelled successfully.");
      onSaved();
    },
    onError: (err: any) => toast.error(err.message || "Failed to cancel subscription."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      status,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      notes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex h-screen w-full max-w-[500px] flex-col border-l border-[#e2e8f0] bg-white shadow-2xl overflow-hidden text-[#0f172a]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 bg-[#f8fafc] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#059669]" />
              <h2 className="font-display text-lg font-bold text-[#0f172a]">Manage Subscription</h2>
            </div>
            <p className="text-xs text-[#64748b] mt-0.5 font-medium">
              Tenant: {sub.tenant?.businessName || sub.tenant?.name || sub.tenant?.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          id="manage-sub-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6"
        >
          {/* Summary Card */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-[#fafcfb] p-4 space-y-3 shadow-2xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-bold text-[#ea580c] shadow-2xs">
              <Sparkles className="h-3 w-3" /> Active Plan Details
            </span>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#0f172a]">
                  {sub.plan?.slug === "pro" ? "Business" : sub.plan?.name || "Standard Plan"}
                </h3>
                <p className="text-xs text-[#64748b] font-medium">
                  Billing cycle: {sub.plan?.interval || "monthly"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-[#059669]">
                  {sub.plan?.price !== undefined ? `₹${sub.plan.price.toLocaleString("en-IN")}` : "Free"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#e2e8f0] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#64748b] block font-medium">Start Date:</span>
                <span className="font-bold text-[#0f172a]">
                  {new Date(sub.startDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[#64748b] block font-medium">Expires / Renews:</span>
                <span className="font-bold text-[#0f172a]">
                  {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Status Changer */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0f172a]">Subscription Lifecycle Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs font-bold text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 cursor-pointer"
            >
              <option value="active">Active (Paid & Operational)</option>
              <option value="trialing">Trialing (Free Trial Window)</option>
              <option value="past_due">Past Due (Grace Period)</option>
              <option value="cancelled">Cancelled (Tenant Cancelled)</option>
              <option value="expired">Expired (Access Terminated)</option>
            </select>
          </div>

          {/* Expiry Date Editor */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0f172a]">Extend / Modify Renewal Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs font-bold text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
              />
            </div>
            <p className="text-[11px] text-[#64748b]">
              Adjust the renewal date to offer bonus days or manual extensions.
            </p>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0f172a]">Internal Admin Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Granted 1 month extension due to support delay..."
              className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3 text-xs font-medium text-[#0f172a] shadow-xs outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 resize-none placeholder:text-[#94a3b8]"
            />
          </div>

          {/* Danger Zone: Immediate Cancel */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <Ban className="h-4 w-4 text-rose-600" />
              <span>Cancel Subscription</span>
            </div>
            <p className="text-[11px] text-rose-700 font-medium">
              Immediately terminate this tenant's subscription and revoke premium plan limits.
            </p>
            <input
              type="text"
              placeholder="Reason for cancellation (optional)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-9 w-full rounded-xl border border-rose-300 bg-white px-3 text-xs text-[#0f172a] placeholder:text-rose-300 outline-none focus:border-rose-500"
            />
            <button
              type="button"
              disabled={cancelMutation.isPending || sub.status === "cancelled"}
              onClick={() => {
                if (confirm(`Are you sure you want to cancel the subscription for ${sub.tenant?.name || "this tenant"}?`)) {
                  cancelMutation.mutate(cancelReason);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
            >
              {cancelMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {sub.status === "cancelled" ? "Already Cancelled" : "Confirm Cancellation"}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] shadow-2xs transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="submit"
            form="manage-sub-form"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#047857] active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
