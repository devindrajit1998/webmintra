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
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-300">Workspace insights</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Monitor publishing coverage, domain readiness, and the sites prepared to collect
            traffic.
          </p>
        </div>
        <Link
          to="/tenant/websites"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
        >
          <Rocket className="h-4 w-4" />
          Manage websites
        </Link>
      </header>

      <section aria-label="Analytics summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Eye}
          label="Unique visitors"
          value={analyticsQuery.isLoading ? "..." : (analytics?.summary.uniqueVisitors ?? 0)}
          detail="Last 30 days"
          tone="violet"
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
          detail="Form submissions attempted"
          tone="emerald"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Connected domains"
          value={domainsQuery.isLoading ? "..." : activeDomains.length}
          detail={
            domainsQuery.isLoading ? "Loading domain state" : `${securedDomains.length} SSL secured`
          }
          tone="amber"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
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
    cyan: "bg-cyan-400/10 text-cyan-300",
    emerald: "bg-emerald-400/10 text-emerald-300",
    amber: "bg-amber-400/10 text-amber-300",
    violet: "bg-violet-400/10 text-violet-300",
  };

  return (
    <article className="rounded-lg border border-slate-800 bg-[#0b1826] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{detail}</p>
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
    <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Website traffic</h2>
          <p className="mt-1 text-xs text-slate-500">
            Visitors and page views over the last 30 days
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
          <Activity className="h-3 w-3" /> Tracking active
        </span>
      </div>

      {isLoading ? (
        <div className="grid min-h-72 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      ) : isError ? (
        <div className="grid min-h-72 place-items-center text-center">
          <div>
            <p className="text-sm font-semibold">Traffic analytics could not be loaded</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-300"
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
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#1e293b",
                  borderRadius: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="pageViews"
                name="Page views"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#trafficViews)"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke="#a78bfa"
                strokeWidth={2}
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 grid min-h-72 place-items-center border-y border-slate-800 text-center">
          <div>
            <BarChart3 className="mx-auto h-8 w-8 text-slate-700" />
            <h3 className="mt-3 text-sm font-semibold">No traffic recorded yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Visits to newly published pages will appear here automatically.
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
    <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Analytics readiness</h2>
          <p className="mt-1 text-xs text-slate-500">Workspace setup progress</p>
        </div>
        <span className="font-display text-2xl font-bold text-emerald-300">
          {domainsLoading ? "..." : `${readiness}%`}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${domainsLoading ? 0 : readiness}%` }}
        />
      </div>
      <div className="mt-6 space-y-4">
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
        className="mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
      >
        Review domains <ArrowRight className="h-3.5 w-3.5" />
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
    <div className="flex items-center gap-3 text-xs">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      ) : complete ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      ) : (
        <CircleDashed className="h-5 w-5 text-slate-600" />
      )}
      <span className={complete ? "text-slate-200" : "text-slate-500"}>{label}</span>
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
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b1826]">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold">Website status</h2>
          <p className="mt-1 text-xs text-slate-500">Publishing and domain coverage by site</p>
        </div>
        <Activity className="h-5 w-5 text-cyan-300" />
      </div>
      {sortedWebsites.length ? (
        <div className="divide-y divide-slate-800">
          {sortedWebsites.map((website) => {
            const domain = domains.find((item) => item.websiteId === website.id);
            return (
              <article
                key={website.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-200">
                      {website.name}
                    </h3>
                    <StatusBadge status={website.status} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Updated {formatDate(website.updatedAt)} ·{" "}
                    {website.templateName || "WebMintra template"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                  <Globe2 className="h-3.5 w-3.5" />
                  {domainsLoading
                    ? "Checking domain"
                    : domain
                      ? domain.domain
                      : "No domain connected"}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <Globe2 className="mx-auto h-8 w-8 text-slate-700" />
          <h3 className="mt-3 text-sm font-semibold">No websites to analyze</h3>
          <p className="mt-1 text-xs text-slate-500">
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
    <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold">Domain health</h2>
          <p className="mt-1 text-xs text-slate-500">Connection status across your workspace</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-300" />
      </div>
      {isLoading ? (
        <div className="grid min-h-48 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      ) : isError ? (
        <div className="grid min-h-48 place-items-center text-center">
          <div>
            <p className="text-sm font-semibold">Domain status could not be loaded</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-cyan-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <DomainMetric label="Active" value={active} color="text-emerald-300" />
            <DomainMetric label="Pending" value={pending} color="text-amber-300" />
          </div>
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/25 p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <p className="text-xs leading-5 text-slate-400">
                {domains.length
                  ? `${active} of ${domains.length} domains are ready to serve published sites.`
                  : "Connect a custom domain to establish a public analytics surface."}
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
    <div className="rounded-lg border border-slate-800 p-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Website["status"] }) {
  const published = status === "published";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${published ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
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
