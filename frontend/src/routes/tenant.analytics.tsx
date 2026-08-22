import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Eye,
  FileText,
  Globe2,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Rocket,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTenantContext } from "@/components/TenantDashboard";
import {
  getDomains,
  getTenantAnalytics,
  type Domain,
  type TenantAnalytics,
  type Website,
} from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics | WebMintra" }] }),
});

function AnalyticsPage() {
  const { websites } = useTenantContext();
  const analyticsQuery = useQuery({
    queryKey: ["tenant-analytics", 30],
    queryFn: () => getTenantAnalytics(30),
  });
  const domainsQuery = useQuery({
    queryKey: ["tenant-domains"],
    queryFn: getDomains,
  });

  const domains = domainsQuery.data?.domains ?? [];
  const analytics = analyticsQuery.data;
  const liveWebsites = websites.filter((website) => website.status !== "archived");
  const published = liveWebsites.filter((website) => website.status === "published");
  const drafts = liveWebsites.filter((website) => website.status === "draft");
  const activeDomains = domains.filter((domain) => domain.status === "active");
  const securedDomains = activeDomains.filter((domain) =>
    ["active", "issued", "valid"].includes(domain.sslStatus?.toLowerCase()),
  );
  const publishingRate = liveWebsites.length
    ? Math.round((published.length / liveWebsites.length) * 100)
    : 0;
  const readinessSteps = [
    liveWebsites.length > 0,
    published.length > 0,
    domains.length > 0,
    activeDomains.length > 0,
  ];
  const readiness = Math.round(
    (readinessSteps.filter(Boolean).length / readinessSteps.length) * 100,
  );

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
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
              <BarChart3 className="h-3.5 w-3.5" /> Workspace Insights
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Analytics & Traffic
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Monitor visitor trends, page views, lead conversions, and domain setup health.
            </p>
          </div>
          <Link
            to="/tenant/websites"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857]"
          >
            <Rocket className="h-4 w-4" />
            Manage Websites
          </Link>
        </div>
      </section>

      <section aria-label="Analytics summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Eye}
          label="Unique visitors"
          value={analyticsQuery.isLoading ? "..." : (analytics?.summary.uniqueVisitors ?? 0)}
          detail="Last 30 days"
          tone="emerald"
        />
        <MetricCard
          icon={FileText}
          label="Page views"
          value={analyticsQuery.isLoading ? "..." : (analytics?.summary.pageViews ?? 0)}
          detail="Last 30 days"
          tone="cyan"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Conversions"
          value={analyticsQuery.isLoading ? "..." : (analytics?.summary.conversions ?? 0)}
          detail="Form submissions recorded"
          tone="amber"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Connected domains"
          value={domainsQuery.isLoading ? "..." : activeDomains.length}
          detail={
            domainsQuery.isLoading ? "Loading domain state" : `${securedDomains.length} SSL secured`
          }
          tone="violet"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <TrafficPanel
          analytics={analytics}
          isLoading={analyticsQuery.isLoading}
          isError={analyticsQuery.isError}
          onRetry={() => analyticsQuery.refetch()}
        />
        <ReadinessPanel
          readiness={readiness}
          hasWebsite={liveWebsites.length > 0}
          hasPublishedSite={published.length > 0}
          hasDomain={domains.length > 0}
          hasActiveDomain={activeDomains.length > 0}
          domainsLoading={domainsQuery.isLoading}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <WebsitePerformance
          websites={liveWebsites}
          domains={domains}
          domainsLoading={domainsQuery.isLoading}
        />
        <DomainHealth
          domains={domains}
          isLoading={domainsQuery.isLoading}
          isError={domainsQuery.isError}
          onRetry={() => domainsQuery.refetch()}
        />
      </section>
    </div>
  );
}

type MetricTone = "cyan" | "emerald" | "amber" | "violet";

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Globe2;
  label: string;
  value: string | number;
  detail: string;
  tone: MetricTone;
}) {
  const colors: Record<MetricTone, string> = {
    cyan: "bg-[#f0fdfa] border-[#99f6e4] text-[#0d9488]",
    emerald: "bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]",
    amber: "bg-[#fff7ed] border-[#fed7aa] text-[#ea580c]",
    violet: "bg-[#faf5ff] border-[#e9d5ff] text-[#9333ea]",
  };

  return (
    <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">
            {label}
          </p>
          <p className="mt-1 font-display text-3xl font-black text-[#0f172a]">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${colors[tone]} shadow-2xs`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-[10px] font-semibold text-[#94a3b8]">{detail}</p>
    </article>
  );
}

function TrafficPanel({
  analytics,
  isLoading,
  isError,
  onRetry,
}: {
  analytics?: TenantAnalytics;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const hasData = Boolean(analytics?.daily.some((day) => day.pageViews > 0));
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#0f172a]">
            Website Traffic Trend
          </h2>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Visitors and page views over the last 30 days
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-1 text-[10px] font-extrabold text-[#065f46]">
          <Activity className="h-3 w-3 text-[#059669]" /> Tracking Active
        </span>
      </div>

      {isLoading ? (
        <div className="grid min-h-72 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        </div>
      ) : isError ? (
        <div className="grid min-h-72 place-items-center text-center">
          <div>
            <p className="text-xs font-bold text-[#e11d48]">
              Traffic analytics could not be loaded
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : hasData ? (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={analytics?.daily ?? []}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trafficViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="pageViews"
                name="Page views"
                stroke="#059669"
                strokeWidth={2.5}
                fill="url(#trafficViews)"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="#0284c7"
                strokeWidth={2}
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 grid min-h-72 place-items-center rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center">
          <div>
            <BarChart3 className="mx-auto h-10 w-10 text-[#cbd5e1]" />
            <h3 className="mt-3 text-sm font-extrabold text-[#0f172a]">No traffic recorded yet</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">
              Visits to published sites and pages will appear here in real-time.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ReadinessPanel({
  readiness,
  hasWebsite,
  hasPublishedSite,
  hasDomain,
  hasActiveDomain,
  domainsLoading,
}: {
  readiness: number;
  hasWebsite: boolean;
  hasPublishedSite: boolean;
  hasDomain: boolean;
  hasActiveDomain: boolean;
  domainsLoading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-[#f1f5f9] pb-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#0f172a]">Launch Readiness</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">Workspace setup progress</p>
        </div>
        <span className="font-display text-2xl font-black text-[#059669]">
          {domainsLoading ? "..." : `${readiness}%`}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
        <div
          className="h-full rounded-full bg-[#059669] transition-all"
          style={{ width: `${domainsLoading ? 0 : readiness}%` }}
        />
      </div>
      <div className="mt-6 space-y-3.5">
        <ReadinessItem label="Create a website" complete={hasWebsite} />
        <ReadinessItem label="Publish a website" complete={hasPublishedSite} />
        <ReadinessItem label="Add a custom domain" complete={hasDomain} loading={domainsLoading} />
        <ReadinessItem
          label="Verify domain connection"
          complete={hasActiveDomain}
          loading={domainsLoading}
        />
      </div>
      <Link
        to="/tenant/domains"
        className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white text-xs font-bold text-[#0f172a] transition hover:bg-[#f8fafc] shadow-2xs"
      >
        Review Domains <ArrowRight className="h-3.5 w-3.5 text-[#059669]" />
      </Link>
    </section>
  );
}

function ReadinessItem({
  label,
  complete,
  loading,
}: {
  label: string;
  complete: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#94a3b8]" />
      ) : complete ? (
        <CheckCircle2 className="h-4 w-4 text-[#059669]" />
      ) : (
        <CircleDashed className="h-4 w-4 text-[#cbd5e1]" />
      )}
      <span className={complete ? "text-[#0f172a] font-bold" : "text-[#94a3b8]"}>{label}</span>
    </div>
  );
}

function WebsitePerformance({
  websites,
  domains,
  domainsLoading,
}: {
  websites: Website[];
  domains: Domain[];
  domainsLoading: boolean;
}) {
  const sortedWebsites = [...websites].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-4 bg-[#f8fafc]">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#0f172a]">Website Status</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Publishing state and domain routing coverage
          </p>
        </div>
        <Activity className="h-5 w-5 text-[#059669]" />
      </div>
      {sortedWebsites.length ? (
        <div className="divide-y divide-[#f1f5f9]">
          {sortedWebsites.map((website) => {
            const domain = domains.find((item) => item.websiteId === website.id);
            return (
              <article
                key={website.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-[#f8fafc] transition"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-xs font-bold text-[#0f172a]">{website.name}</h3>
                    <StatusBadge status={website.status} />
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-[#64748b]">
                    Updated {formatDate(website.updatedAt)} ·{" "}
                    {website.templateName || "WebMintra template"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#059669]">
                  <Globe2 className="h-3.5 w-3.5 text-[#059669]" />
                  {domainsLoading
                    ? "Checking domain..."
                    : domain
                      ? domain.domain
                      : "Default subdomain only"}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <Globe2 className="mx-auto h-10 w-10 text-[#cbd5e1]" />
          <h3 className="mt-3 text-sm font-extrabold text-[#0f172a]">No websites to analyze</h3>
          <p className="mt-1 text-xs text-[#64748b]">
            Create a website to begin tracking launch readiness.
          </p>
        </div>
      )}
    </section>
  );
}

function DomainHealth({
  domains,
  isLoading,
  isError,
  onRetry,
}: {
  domains: Domain[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const active = domains.filter((domain) => domain.status === "active").length;
  const pending = domains.length - active;

  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#0f172a]">Domain Health</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">Connection status across your workspace</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-[#059669]" />
      </div>
      {isLoading ? (
        <div className="grid min-h-48 place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        </div>
      ) : isError ? (
        <div className="grid min-h-48 place-items-center text-center">
          <div>
            <p className="text-xs font-bold text-[#e11d48]">Domain status could not be loaded</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <DomainMetric label="Active" value={active} color="text-[#059669]" />
            <DomainMetric label="Pending" value={pending} color="text-[#ea580c]" />
          </div>
          <div className="mt-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
              <p className="text-xs leading-relaxed text-[#64748b]">
                {domains.length
                  ? `${active} of ${domains.length} domains are ready to serve published websites.`
                  : "Connect a custom domain to establish your distinct brand URL."}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function DomainMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">{label}</p>
      <p className={`mt-1 font-display text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Website["status"] }) {
  const published = status === "published";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold capitalize ${published ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]" : "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]"}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
