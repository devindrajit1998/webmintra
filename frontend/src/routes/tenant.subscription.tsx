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
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">Account</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
            Subscription
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Manage your WebMintra plan and see what is included in your workspace.
          </p>
        </div>
        <Link
          to="/tenant/billing"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/60 hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          View billing history <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="rounded-xl border border-slate-800 bg-[#0b1826] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Choose your billing cycle
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Plans that scale with your workspace
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Switch between monthly flexibility and yearly value.
            </p>
          </div>
          <div
            className="inline-flex rounded-lg border border-slate-700 bg-[#081522] p-1"
            role="group"
            aria-label="Billing interval"
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={`rounded-md px-4 py-2 text-xs font-semibold capitalize transition ${interval === value ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
              >
                {value}
                {value === "yearly" && <span className="ml-1.5 text-[10px]">save yearly</span>}
              </button>
            ))}
          </div>
        </div>
        {plansQuery.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : plansQuery.isError ? (
          <p className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
            Unable to load available plans.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
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

      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0b1826] shadow-[0_20px_60px_-35px_rgba(34,211,238,0.45)]">
        <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
                  Current plan
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-white">
                    {subscription.planName}
                  </h2>
                  <StatusBadge status={subscription.status} />
                </div>
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">
              {subscription.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              {subscription.startDate && (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  Started {formatDate(subscription.startDate)}
                </span>
              )}
              {nextDate && (
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-500" />
                  {isTrial ? "Trial ends" : "Renews"} {formatDate(nextDate)}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-[#081522]/80 p-5 lg:text-right">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Plan price
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              {formatMoney(subscription.price, subscription.currency)}
            </p>
            <p className="mt-1 text-xs capitalize text-slate-500">
              per {subscription.interval.replace("ly", "")}
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400 lg:justify-end">
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              {subscription.autoRenew ? "Auto-renew is on" : "Manual renewal"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="rounded-xl border border-slate-800 bg-[#0b1826] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Workspace capacity
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">Your plan includes</h2>
            </div>
            <Zap className="h-5 w-5 text-amber-300" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {limits.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#091725] p-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {formatLimit(key, subscription.limits[key])}
                  </p>
                </div>
              </div>
            ))}
            {!limits.length && (
              <p className="text-sm text-slate-500">
                Plan limits will appear here once configured.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1826] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Plan benefits
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Everything in your plan</h2>
          <ul className="mt-5 space-y-3">
            {(subscription.highlights.length
              ? subscription.highlights
              : ["No additional benefits listed for this plan."]
            ).map((highlight, index) => (
              <li
                key={`${highlight}-${index}`}
                className="flex gap-3 text-sm leading-5 text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0b1826] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">Need a different plan?</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Contact your WebMintra administrator to upgrade, downgrade, or change your billing
              cycle.
            </p>
          </div>
        </div>
        <Link
          to="/tenant/support"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
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
      className={`relative flex flex-col rounded-xl border p-5 ${isCurrent ? "border-cyan-400/60 bg-cyan-400/5" : "border-slate-800 bg-[#091725]"}`}
    >
      {isCurrent && (
        <span className="absolute right-4 top-4 rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
          Current plan
        </span>
      )}
      <h3 className="font-display text-lg font-bold text-white">{plan.name}</h3>
      <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">
        {plan.description || "A flexible WebMintra workspace plan."}
      </p>
      <p className="mt-5 text-2xl font-bold text-white">
        {formatMoney(price, plan.currency)}
        <span className="ml-1 text-xs font-normal text-slate-500">
          / {interval === "yearly" ? "year" : "month"}
        </span>
      </p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {(plan.highlights.slice(0, 4).length
          ? plan.highlights.slice(0, 4)
          : ["WebMintra workspace tools"]
        ).map((item) => (
          <li key={item} className="flex gap-2 text-xs text-slate-300">
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {item}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={isCurrent || price == null}
        onClick={() => onSelect(plan)}
        className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${isCurrent ? "border border-slate-700 text-slate-500" : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"}`}
      >
        {isCurrent ? "Current plan" : "Choose plan"}
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
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
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-[#0b1826] p-6 shadow-2xl">
        <h2 className="font-display text-xl font-bold text-white">Change your plan?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Change from <strong className="text-slate-200">{currentPlan}</strong> to{" "}
          <strong className="text-cyan-300">{plan.name}</strong> on the{" "}
          <strong className="text-slate-200">{interval}</strong> billing cycle.
        </p>
        <div className="mt-5 rounded-lg border border-slate-800 bg-[#081522] p-4">
          <p className="text-xs text-slate-500">New recurring price</p>
          <p className="mt-1 text-xl font-bold text-white">
            {discountInfo && !discountInfo.error ? (
              <span className="line-through text-slate-500 text-sm mr-2">
                {formatMoney(plan.pricing[interval], plan.currency)}
              </span>
            ) : null}
            {formatMoney(finalPrice, plan.currency)}{" "}
            <span className="text-xs font-normal text-slate-500">
              per {interval === "yearly" ? "year" : "month"}
            </span>
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-300 mb-1">Have a coupon code?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER20"
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-mono uppercase"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={validating || !couponCode.trim()}
              className="rounded-md bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {validating ? "..." : "Apply"}
            </button>
          </div>
          {discountInfo?.error && (
            <p className="mt-1 text-xs text-rose-400">{discountInfo.error}</p>
          )}
          {discountInfo && !discountInfo.error && (
            <p className="mt-1 text-xs text-emerald-400">
              Coupon applied! Save {formatMoney(discountInfo.discount, plan.currency)}
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Keep current plan
          </button>
          <button
            type="button"
            onClick={() => onConfirm(discountInfo && !discountInfo.error ? couponCode : undefined)}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}Confirm change
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "trialing"
      ? "Trial"
      : status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const tone =
    status === "active" || status === "trialing"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}
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
      <div className="text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-400" />
        <p className="mt-3 text-sm text-slate-500">Loading subscription</p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
        <h1 className="mt-4 text-lg font-semibold text-white">
          Subscription information is unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          We could not load your current plan. Your account has not been changed.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}Retry
        </button>
      </div>
    </div>
  );
}
