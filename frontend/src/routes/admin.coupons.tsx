import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCoupons, createCoupon } from "@/lib/admin-api";
import { Loader2, Plus, Tag, Calendar, Users, X } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
});

function CouponsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percent",
    discountValue: 0,
    intervalType: "all",
    maxUses: 100,
    expiresAt: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["adminCoupons", { page }],
    queryFn: () => getCoupons({ page, limit: 10 }),
  });

  const createMutation = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      setIsCreateOpen(false);
      setForm({
        code: "",
        discountType: "percent",
        discountValue: 0,
        intervalType: "all",
        maxUses: 100,
        expiresAt: "",
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let applicableIntervals: string[] = [];
    if (form.intervalType === "monthly") applicableIntervals = ["monthly"];
    if (form.intervalType === "yearly") applicableIntervals = ["yearly"];

    createMutation.mutate({
      ...form,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxUses: Number(form.maxUses),
      applicableIntervals,
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Coupons & Discounts</h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage promotional codes for tenant subscriptions.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#059669] px-4 text-sm font-semibold text-white transition hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" /> Create Coupon
        </button>
      </div>

      {isCreateOpen && (
        <form
          onSubmit={handleSubmit}
          className="relative mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setIsCreateOpen(false)}
            className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-display text-lg font-bold mb-4">Create New Coupon</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label className="text-xs font-semibold text-slate-600">
              Code
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-mono uppercase placeholder-slate-600"
                placeholder="e.g. SUMMER20"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Type
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
              >
                <option value="percent">Percentage</option>
                <option value="flat">Flat Amount</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Discount Value
              <input
                required
                type="number"
                min="1"
                max={form.discountType === "percent" ? 100 : undefined}
                value={form.discountValue || ""}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                placeholder="20"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Billing Cycle
              <select
                value={form.intervalType}
                onChange={(e) => setForm({ ...form, intervalType: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
              >
                <option value="all">All Plans</option>
                <option value="monthly">Monthly Only</option>
                <option value="yearly">Yearly Only</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Max Uses
              <input
                required
                type="number"
                min="1"
                value={form.maxUses || ""}
                onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                placeholder="100"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Expires At
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 [color-scheme:light]"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c2410c] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] focus-visible:ring-offset-2"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {createMutation.isPending ? "Creating..." : "Create Coupon"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-10 text-center text-slate-500">
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-sm text-slate-500">Loading coupons...</p>
            </div>
          </div>
        ) : data?.coupons?.length ? (
          data.coupons.map((coupon: any) => {
            const isExpired = new Date(coupon.expiresAt) < new Date();
            const isExhausted = coupon.usedCount >= coupon.maxUses;
            const status =
              coupon.status === "active" && !isExpired && !isExhausted ? "active" : "inactive";

            return (
              <div
                key={coupon.id || coupon._id}
                className="relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#059669]/40 hover:shadow-md"
              >
                <div className="-mx-6 -mt-6 mb-1 flex items-start justify-between border-t-4 border-[#ea580c] px-6 pt-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#fed7aa] bg-[#fff7ed]">
                      <Tag className="h-4 w-4 text-[#ea580c]" />
                    </div>
                    <div>
                      <h3 className="font-display font-mono text-lg font-bold text-[#0b192c]">
                        {coupon.code}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${status === "active"
                      ? "border border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                      : "border border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-5 border-b border-slate-200 pb-5">
                  <p className="font-display text-4xl font-black text-[#0b192c]">
                    {coupon.discountType === "percent"
                      ? `${coupon.discountValue}%`
                      : `₹${coupon.discountValue}`}{" "}
                    <span className="text-sm font-semibold text-slate-500">off</span>
                  </p>
                  {coupon.applicableIntervals && coupon.applicableIntervals.length > 0 && (
                    <p className="mt-1 text-xs font-semibold capitalize text-[#047857]">
                      {coupon.applicableIntervals.join(" & ")} plans only
                    </p>
                  )}
                </div>

                <div className="mt-4 flex-1 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" /> Usage
                    </span>
                    <span className="font-medium text-[#0b192c]">
                      {coupon.usedCount} / {coupon.maxUses}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" /> Expires
                    </span>
                    <span
                      className={`font-medium ${isExpired ? "text-rose-600" : "text-[#0b192c]"}`}
                    >
                      {new Date(coupon.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-lg border border-dashed border-[#a7f3d0] bg-white p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#fed7aa] bg-[#fff7ed]">
              <Tag className="h-6 w-6 text-[#ea580c]" />
            </div>
            <h3 className="font-display text-lg font-bold text-[#0b192c]">No coupons found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create discount codes to offer promotions to tenants.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
