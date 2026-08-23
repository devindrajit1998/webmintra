import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Globe2,
  HardDrive,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  changeSubscriptionPlan,
  getSubscriptionPlans,
  getTenantBilling,
  type SubscriptionPlan,
  validateCoupon,
} from "@/lib/auth-api";
import { toast } from "sonner";

export const Route = createFileRoute("/tenant/subscription")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Subscription | WebMintra" }] }),
});

const limitConfig = [
  { key: "websites", label: "Websites", icon: Globe2 },
  { key: "storageMb", label: "Storage", icon: HardDrive },
  { key: "customDomains", label: "Custom domains", icon: Layers3 },
  { key: "collaborators", label: "Collaborators", icon: Users },
] as const;

function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["tenant-billing"],
    queryFn: getTenantBilling,
  });
  const plansQuery = useQuery({ queryKey: ["subscription-plans"], queryFn: getSubscriptionPlans });
  const changePlanMutation = useMutation({
    mutationFn: ({
      planId,
      billingInterval,
      couponCode,
    }: {
      planId: string;
      billingInterval: "monthly" | "yearly";
      couponCode?: string;
    }) => changeSubscriptionPlan(planId, billingInterval, couponCode),
    onSuccess: async (result) => {
      setSelectedPlan(null);
      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: ["tenant-billing"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Unable to change your plan."),
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />;

  const { subscription } = data;
  const nextDate = subscription.trialEndsAt || subscription.renewalDate;
  const isTrial = subscription.status === "trialing" || Boolean(subscription.trialEndsAt);
  const limits = limitConfig.filter(({ key }) => subscription.limits[key] != null);

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Page Header */}
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
              <Sparkles className="h-3.5 w-3.5" /> Workspace Membership
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Subscription & Plan
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Manage your WebMintra workspace plan, upgrade limits, and billing cycles.
            </p>
          </div>
          <Link
            to="/tenant/billing"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 text-xs font-bold text-[#0f172a] shadow-2xs transition hover:border-[#059669] hover:bg-[#ecfdf5] hover:text-[#059669]"
          >
            View billing history <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Available Plans Selector */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f1f5f9] pb-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#059669]">
              Choose your billing cycle
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-[#0f172a]">
              Plans that scale with your business
            </h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Switch between monthly flexibility and discounted yearly pricing.
            </p>
          </div>
          <div
            className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-1 shadow-2xs"
            role="group"
            aria-label="Billing interval"
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={`rounded-lg px-4 py-2 text-xs font-extrabold capitalize transition cursor-pointer ${
                  interval === value
                    ? "bg-[#059669] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                {value}
                {value === "yearly" && (
                  <span className="ml-1.5 rounded-full bg-[#fef3c7] px-1.5 py-0.5 text-[9px] font-black text-[#b45309]">
                    Save Yearly
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {plansQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#059669]" />
          </div>
        ) : plansQuery.isError ? (
          <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
            Unable to load available plans.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {(plansQuery.data?.plans ?? []).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                interval={interval}
                currentPlan={data.subscription.planName}
                onSelect={setSelectedPlan}
              />
            ))}
          </div>
        )}
      </section>

      {/* Current Active Plan Card */}
      <section className="relative overflow-hidden rounded-2xl border border-[#a7f3d0] bg-[linear-gradient(135deg,#ffffff,#f0fdf4)] p-6 shadow-xs sm:p-8">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#ecfdf5] blur-3xl pointer-events-none" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#059669] shadow-2xs border border-[#a7f3d0]">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#059669]">
                  Current Active Plan
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2.5">
                  <h2 className="font-display text-2xl font-extrabold text-[#0f172a]">
                    {subscription.planName}
                  </h2>
                  <StatusBadge status={subscription.status} />
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[#475569]">
              {subscription.description || "Your active WebMintra workspace plan."}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#475569]">
              {subscription.startDate && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#94a3b8]" />
                  Started {formatDate(subscription.startDate)}
                </span>
              )}
              {nextDate && (
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[#94a3b8]" />
                  {isTrial ? "Trial ends" : "Renews"} {formatDate(nextDate)}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-2xs lg:text-right">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
              Plan Price
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[#0f172a]">
              {formatMoney(subscription.price, subscription.currency)}
            </p>
            <p className="mt-0.5 text-xs font-semibold capitalize text-[#64748b]">
              per {subscription.interval.replace("ly", "")}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#059669] lg:justify-end">
              <RefreshCw className="h-3.5 w-3.5 text-[#059669]" />
              {subscription.autoRenew ? "Auto-renew active" : "Manual renewal"}
            </div>
          </div>
        </div>
      </section>

      {/* Workspace Capacity & Plan Benefits */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
          <div className="flex items-start justify-between gap-4 border-b border-[#f1f5f9] pb-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#059669]">
                Workspace capacity
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-[#0f172a]">Your plan includes</h2>
            </div>
            <Zap className="h-5 w-5 text-[#ea580c]" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {limits.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 shadow-2xs"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#e2e8f0] text-[#059669] shadow-2xs">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#64748b]">{label}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#0f172a]">
                    {formatLimit(key, subscription.limits[key])}
                  </p>
                </div>
              </div>
            ))}
            {!limits.length && (
              <p className="text-xs text-[#64748b]">
                Plan limits will appear here once configured.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
          <div className="border-b border-[#f1f5f9] pb-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#059669]">
              Plan benefits
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[#0f172a]">Included Features</h2>
          </div>
          <ul className="mt-5 space-y-3">
            {(subscription.highlights.length
              ? subscription.highlights
              : [
                  "Full access to WebMintra website builder",
                  "Free SSL certificate & CDN",
                  "Responsive mobile layouts",
                ]
            ).map((highlight, index) => (
              <li
                key={`${highlight}-${index}`}
                className="flex gap-3 text-xs font-semibold leading-5 text-[#334155]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Need Help CTA */}
      <section className="flex flex-col gap-4 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 shadow-xs">
        <div className="flex items-start gap-3.5">
          <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#c2410c]" />
          <div>
            <h2 className="text-sm font-extrabold text-[#7c2d12]">
              Need a custom enterprise plan?
            </h2>
            <p className="mt-0.5 text-xs text-[#9a3412]">
              Contact our dedicated team to adjust storage, custom domains, or setup multi-brand
              workspaces.
            </p>
          </div>
        </div>
        <Link
          to="/tenant/support"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857]"
        >
          Contact support <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      {selectedPlan && (
        <SubscriptionConfirmation
          plan={selectedPlan}
          interval={interval}
          currentPlan={subscription.planName}
          pending={changePlanMutation.isPending}
          onCancel={() => setSelectedPlan(null)}
          onConfirm={(couponCode) =>
            changePlanMutation.mutate({
              planId: selectedPlan.id,
              billingInterval: interval,
              couponCode,
            })
          }
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  currentPlan,
  onSelect,
}: {
  plan: SubscriptionPlan;
  interval: "monthly" | "yearly";
  currentPlan: string;
  onSelect: (plan: SubscriptionPlan) => void;
}) {
  const price = plan.pricing[interval];
  const isCurrent = plan.name.toLowerCase() === currentPlan.toLowerCase();
  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 ${
        isCurrent
          ? "border-[#059669] bg-[#ecfdf5]/40 shadow-[0_12px_30px_-15px_rgba(5,150,105,0.2)]"
          : "border-[#e2e8f0] bg-white hover:border-[#a7f3d0] hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-extrabold text-[#0f172a]">{plan.name}</h3>
          {plan.isOfferActive && plan.discountBadge && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#fff7ed] border border-[#fed7aa] px-2 py-0.5 text-[10px] font-extrabold text-[#c2410c]">
              🔥 {plan.discountBadge}
            </span>
          )}
        </div>
        {isCurrent && (
          <span className="shrink-0 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#065f46]">
            Current plan
          </span>
        )}
      </div>
      <p className="mt-2 min-h-10 text-xs leading-relaxed text-[#64748b]">
        {plan.description || "A flexible WebMintra workspace plan."}
      </p>
      <div className="mt-5 border-y border-[#f1f5f9] py-4">
        {plan.isOfferActive && plan.originalPricing?.[interval] && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#94a3b8] line-through">
              {formatMoney(plan.originalPricing[interval]!, plan.currency)}
            </span>
            <span className="text-[10px] font-black text-[#ea580c] bg-[#fff7ed] px-1.5 py-0.2 rounded border border-[#fed7aa]">
              SPECIAL OFFER
            </span>
          </div>
        )}
        <p className="text-3xl font-black text-[#0f172a]">
          {formatMoney(price, plan.currency)}
          <span className="ml-1.5 text-xs font-bold text-[#64748b]">
            / {interval === "yearly" ? "year" : "month"}
          </span>
        </p>
      </div>
      <ul className="mt-5 flex-1 space-y-3">
        {(plan.highlights.slice(0, 5).length
          ? plan.highlights.slice(0, 5)
          : ["WebMintra workspace tools", "Website publishing", "SSL & CDN included"]
        ).map((item) => (
          <li key={item} className="flex gap-2.5 text-xs font-semibold text-[#334155]">
            <Check className="h-4 w-4 shrink-0 text-[#059669]" />
            {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={isCurrent || price == null}
        onClick={() => onSelect(plan)}
        className={`mt-6 inline-flex h-11 items-center justify-center rounded-xl px-4 text-xs font-extrabold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
          isCurrent
            ? "border border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"
            : "bg-[#059669] text-white shadow-xs hover:bg-[#047857]"
        }`}
      >
        {isCurrent ? "Current plan" : "Choose plan"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>
    </article>
  );
}

function SubscriptionConfirmation({
  plan,
  interval,
  currentPlan,
  pending,
  onCancel,
  onConfirm,
}: {
  plan: SubscriptionPlan;
  interval: "monthly" | "yearly";
  currentPlan: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (couponCode?: string) => void;
}) {
  const [couponCode, setCouponCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [discountInfo, setDiscountInfo] = useState<{
    discountedPrice: number;
    discount: number;
    error?: string;
  } | null>(null);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
      const res = await validateCoupon(couponCode, plan.id, interval);
      setDiscountInfo({ discountedPrice: res.discountedPrice, discount: res.discount });
    } catch (err: any) {
      setDiscountInfo({ discountedPrice: 0, discount: 0, error: err.message || "Invalid coupon" });
    } finally {
      setValidating(false);
    }
  }

  const finalPrice =
    discountInfo && !discountInfo.error ? discountInfo.discountedPrice : plan.pricing[interval];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        onClick={onCancel}
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-xs"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <h2 className="font-display text-xl font-extrabold text-[#0f172a]">Change your plan?</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
          Change from <strong className="text-[#0f172a]">{currentPlan}</strong> to{" "}
          <strong className="text-[#059669]">{plan.name}</strong> on the{" "}
          <strong className="text-[#0f172a]">{interval}</strong> billing cycle.
        </p>
        <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
            New recurring price
          </p>
          <p className="mt-1 text-2xl font-black text-[#0f172a]">
            {discountInfo && !discountInfo.error ? (
              <span className="line-through text-slate-400 text-sm mr-2 font-semibold">
                {formatMoney(plan.pricing[interval], plan.currency)}
              </span>
            ) : null}
            {formatMoney(finalPrice, plan.currency)}{" "}
            <span className="text-xs font-bold text-[#64748b]">
              per {interval === "yearly" ? "year" : "month"}
            </span>
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold text-[#0f172a] mb-1.5">Have a discount coupon?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20"
              className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-mono uppercase text-[#0f172a] outline-none focus:border-[#059669]"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={validating || !couponCode.trim()}
              className="rounded-xl bg-[#0f172a] px-4 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              {validating ? "..." : "Apply"}
            </button>
          </div>
          {discountInfo?.error && (
            <p className="mt-1.5 text-xs font-bold text-rose-600">{discountInfo.error}</p>
          )}
          {discountInfo && !discountInfo.error && (
            <p className="mt-1.5 text-xs font-bold text-[#059669]">
              ✓ Coupon applied! Saved {formatMoney(discountInfo.discount, plan.currency)}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(discountInfo && !discountInfo.error ? couponCode : undefined)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm & Change Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "trialing"
      ? "Trial Active"
      : status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const tone =
    status === "active" || status === "trialing"
      ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]"
      : "border-[#fef08a] bg-[#fefce8] text-[#854d0e]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-extrabold ${tone}`}
    >
      <Check className="h-3 w-3" />
      {label}
    </span>
  );
}

function formatLimit(key: string, value: number) {
  if (key === "storageMb")
    return value >= 1024 ? `${(value / 1024).toFixed(value % 1024 ? 1 : 0)} GB` : `${value} MB`;
  return value < 0 ? "Unlimited" : value.toLocaleString("en-IN");
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

function LoadingState() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        <p className="text-xs font-bold text-[#64748b]">Loading subscription details...</p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-sm rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h1 className="mt-4 text-base font-extrabold text-[#0f172a]">
          Subscription information unavailable
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
          We could not load your current plan details. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer disabled:opacity-50"
        >
          {isRetrying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Retry
        </button>
      </div>
    </div>
  );
}
