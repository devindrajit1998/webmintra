import { useState, createContext, useContext } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import {
  Activity,
  BookOpen,
  Boxes,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  FolderOpen,
  Globe2,
  Image,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  MousePointer2,
  PanelLeftClose,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  BarChart3,
} from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import { TenantHeaderControls } from "@/components/HeaderControls";
import type { SessionUser, TenantDashboard as TenantDashboardData, Website } from "@/lib/auth-api";

export type TenantLayoutProps = {
  user: SessionUser;
  dashboard: TenantDashboardData | null;
  websites: Website[];
  error?: string;
  websiteError?: string;
  isCreating?: boolean;
  onOpenWebsite?: (websiteId: string) => void;
  onArchiveWebsite?: (websiteId: string) => void;
  onSignOut: () => void;
};

export const TenantContext = createContext<TenantLayoutProps | null>(null);

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenantContext must be used within TenantLayout");
  return context;
}

const mainNavigation = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/tenant" },
  { label: "My websites", icon: Globe2, to: "/tenant/websites" },
  { label: "Media library", icon: Image, to: "/tenant/media" },
  { label: "Forms", icon: FileText, to: "/tenant/forms" },
  { label: "Blog", icon: BookOpen, to: "/tenant/blog" },
  { label: "Pages", icon: FileText, to: "/tenant/pages" },
  { label: "SEO manager", icon: Sparkles, to: "/tenant/seo" },
  { label: "Business info", icon: FolderOpen, to: "/tenant/business" },
  { label: "Analytics", icon: BarChart3, to: "/tenant/analytics" },
  { label: "Domains", icon: Globe2, to: "/tenant/domains" },
];

const accountNavigation = [
  { label: "Subscription", icon: CreditCard, to: "/tenant/subscription" },
  { label: "Billing & invoices", icon: FileText, to: "/tenant/billing" },
  { label: "Activity", icon: Activity, to: "/tenant/activity" },
  { label: "Support tickets", icon: CircleHelp, to: "/tenant/support" },
  { label: "Knowledge base", icon: BookOpen, to: "/tenant/kb" },
  { label: "Settings", icon: Settings, to: "/tenant/settings" },
];

export function TenantLayout({ user, dashboard, websites, onSignOut }: TenantLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const planName =
    dashboard?.account.planName ||
    (dashboard?.account.plan === "pro" ? "Business" : dashboard?.account.plan) ||
    "Starter";

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-[#091521] px-3 py-5 transition-all duration-300 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div
          className={`mb-8 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between px-2"}`}
        >
          <div className="flex items-center gap-2">
            {settings["brand.logoUrl"] ? (
              <img
                src={settings["brand.logoUrl"]}
                alt="Logo"
                className="h-8 w-8 rounded-lg object-contain shrink-0"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 font-display text-lg font-black text-slate-950 shrink-0">
                {settings["site.name"] ? settings["site.name"].charAt(0) : "W"}
              </span>
            )}
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[17px] font-black tracking-tight leading-none bg-gradient-to-r from-[#0055ff] via-[#00c9a7] to-[#10e793] bg-clip-text text-transparent lowercase font-sans">
                  {settings["site.name"] || "webmintra"}
                </p>
                <p className="truncate text-[10px] font-medium tracking-wide text-slate-500 mt-0.5">
                  {user.name}&apos;s workspace
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded p-1 text-slate-400 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <TenantNavGroup label="Workspace" items={mainNavigation} collapsed={sidebarCollapsed} />
        <TenantNavGroup label="Account" items={accountNavigation} collapsed={sidebarCollapsed} />

        <div
          className={`mt-auto overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"}`}
        >
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {planName} plan
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {websites.length} websites in your workspace
            </p>
          </div>
        </div>
        <div
          className={`mt-auto pt-3 transition-colors duration-300 ${sidebarCollapsed ? "border-transparent" : "border-t border-slate-800"}`}
        >
          <button
            type="button"
            onClick={onSignOut}
            className={`flex w-full items-center ${sidebarCollapsed ? "justify-center" : "gap-2"} rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white`}
            title="Sign out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
            >
              Sign out
            </span>
          </button>
        </div>
      </aside>
      {menuOpen ? (
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden"
        />
      ) : null}
      <main
        className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b border-slate-800 bg-[#091521]/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:block"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="ml-auto md:hidden" />
          <TenantHeaderControls websites={websites} />
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 sm:inline capitalize">
              {planName} plan
            </span>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              <Moon className="h-4 w-4" />
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-700 pl-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-700 text-xs font-bold shrink-0">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-semibold">{user.name}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1600px] py-6">
          <TenantContext.Provider value={{ user, dashboard, websites, onSignOut }}>
            <Outlet />
          </TenantContext.Provider>
        </div>
      </main>
    </div>
  );
}

export function TenantDashboardIndex() {
  const { user, dashboard, websites } = useTenantContext();

  const drafts = websites.filter((website) => website.status === "draft").length;
  const published = websites.filter((website) => website.status === "published").length;
  const memberSince = dashboard
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
        new Date(dashboard.account.memberSince),
      )
    : "Recently";
  const planName =
    dashboard?.account.planName ||
    (dashboard?.account.plan === "pro" ? "Business" : dashboard?.account.plan) ||
    "Starter";
  const limits = dashboard?.account.limits || { websites: 1, storage: 1 };

  const isTrialing = dashboard?.account?.isTrialing;
  const trialDaysLeft = dashboard?.account?.trialDaysLeft ?? 0;

  return (
    <div className="space-y-6">
      {/* Free Trial Banner */}
      {isTrialing && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[#0a1b2d] to-emerald-950/30 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>Free Trial Active</span>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-cyan-300 border border-cyan-500/30">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining
                </span>
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                You have full access to edit, design, and preview your website templates without
                restrictions.
              </p>
            </div>
          </div>

          <Link
            to="/tenant/billing"
            className="shrink-0 whitespace-nowrap rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:bg-cyan-400"
          >
            Upgrade / Subscribe
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              Welcome back, {user.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Active
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Manage your websites and keep your workspace ready to publish.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{planName} plan</span>
          <span className="h-1 w-1 rounded-full bg-slate-600" />
          <span>Member since {memberSince}</span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Globe2 />} label="Total websites" value={websites.length} tone="cyan" />
        <Kpi icon={<Sparkles />} label="Published" value={published} tone="emerald" />
        <Kpi icon={<FileText />} label="Drafts" value={drafts} tone="violet" />
        <Kpi icon={<Image />} label="Storage used" value="0 MB" tone="amber" />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">My websites</h2>
              <p className="mt-1 text-xs text-slate-500">
                Manage every stage of your website lifecycle.
              </p>
            </div>
            <Link
              to="/tenant/websites"
              className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              View all
            </Link>
          </div>
          {websites.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {websites.map((website) => (
                <WebsiteCard
                  key={website.id}
                  website={website}
                  onArchive={() => console.log("Archive", website.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyWebsites />
          )}
        </div>
        <aside className="space-y-4 xl:col-span-4">
          <WorkspaceHealth done={{ create: websites.length > 0, publish: published > 0 }} />
          <QuickActions />
        </aside>
      </section>

      <section className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <AnalyticsCard />
        </div>
        <div className="xl:col-span-4">
          <ActivityCard websites={websites} />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <SubscriptionCard websiteCount={websites.length} limits={limits} planName={planName} />
        </div>
      </section>
    </div>
  );
}

function TenantNavGroup({
  label,
  items,
  collapsed,
}: {
  label: string;
  items: Array<{ label: string; icon: typeof LayoutDashboard; to: string }>;
  collapsed?: boolean;
}) {
  return (
    <section className="mb-5">
      <p
        className={`px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600 transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "max-h-0 mb-0 opacity-0" : "max-h-6 mb-2 opacity-100"}`}
      >
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map(({ label: itemLabel, icon: Icon, to }) => (
          <Link
            to={to}
            key={itemLabel}
            title={collapsed ? itemLabel : undefined}
            className={`flex w-full items-center ${collapsed ? "justify-center" : "gap-2"} rounded-md px-3 py-2 text-left text-xs transition text-slate-400 hover:bg-slate-800 hover:text-slate-100 overflow-hidden`}
            activeProps={{ className: "!bg-emerald-500/15 !text-emerald-300" }}
            activeOptions={{ exact: to === "/tenant" }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span
              className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
            >
              {itemLabel}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "cyan" | "emerald" | "violet" | "amber";
}) {
  const color = {
    cyan: "bg-cyan-400/15 text-cyan-300",
    emerald: "bg-emerald-400/15 text-emerald-300",
    violet: "bg-violet-400/15 text-violet-300",
    amber: "bg-amber-400/15 text-amber-300",
  }[tone];
  return (
    <article className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-800 bg-[#0b1826] p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </span>
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      </div>
    </article>
  );
}
function WebsiteCard({ website, onArchive }: { website: Website; onArchive: () => void }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-800 bg-[#0b1826] transition hover:-translate-y-0.5 hover:border-slate-600">
      <div className="relative h-32 overflow-hidden bg-[linear-gradient(125deg,#0f766e,#0e7490_48%,#312e81)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,.24),transparent_20%),linear-gradient(to_bottom,transparent,rgba(2,6,23,.55))]" />
        <div className="absolute bottom-3 left-4 rounded-lg border border-white/20 bg-slate-950/35 px-2 py-1 text-[10px] font-semibold text-white">
          {website.templateName || "WebMintra template"}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold">{website.name}</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                new Date(website.updatedAt),
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label={`More actions for ${website.name}`}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {website.status === "published" ? (
            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-400">
              Published
            </span>
          ) : (
            <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-300">
              Draft
            </span>
          )}
          <span className="text-[10px] text-slate-500">No domain connected</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to="/tenant/builder/$id"
            params={{ id: website.id }}
            className="flex-1 flex items-center justify-center rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            Open editor
          </Link>
          <button
            type="button"
            onClick={onArchive}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
          >
            Archive
          </button>
        </div>
      </div>
    </article>
  );
}
function EmptyWebsites() {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-[#0b1826] px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
        <Globe2 className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold">Your draft website is being prepared</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        Your selected template becomes available here after onboarding.
      </p>
    </div>
  );
}
function QuickActions() {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold">Quick actions</h2>
        <PanelLeftClose className="h-4 w-4 text-slate-600" />
      </div>
      <div className="mt-4 space-y-2">
        <QuickAction
          icon={<Globe2 />}
          title="Connect domain"
          detail="Point your domain to WebMintra"
        />
        <QuickAction
          icon={<Sparkles />}
          title="SEO settings"
          detail="Improve your site discovery"
        />
      </div>
    </section>
  );
}
function QuickAction({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-slate-600 hover:bg-slate-800"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-slate-200">{title}</span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-600" />
    </button>
  );
}
function SubscriptionCard({
  websiteCount,
  limits,
  planName,
}: {
  websiteCount: number;
  limits: { websites: number; storage: number };
  planName: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-violet-400/20 bg-[linear-gradient(145deg,rgba(109,40,217,.2),rgba(11,24,38,1)_65%)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
            Current plan
          </p>
          <h2 className="mt-1 font-display text-xl font-bold capitalize">{planName}</h2>
        </div>
        <CreditCard className="h-8 w-8 text-violet-300" />
      </div>
      <div className="mt-5 space-y-3 text-xs">
        <Progress
          label="Websites"
          value={`${websiteCount} / ${limits.websites}`}
          percent={Math.min((websiteCount / limits.websites) * 100, 100)}
        />
        <Progress label="Storage" value={`0 MB / ${limits.storage} GB`} percent={2} />
      </div>
      <button
        type="button"
        className="mt-5 w-full rounded-lg border border-violet-300/30 bg-violet-300/10 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-300/20"
      >
        Upgrade plan
      </button>
    </section>
  );
}
function Progress({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-slate-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-violet-400" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
function AnalyticsCard() {
  return (
    <section className="h-full rounded-xl border border-slate-800 bg-[#0b1826] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold">Website analytics</h2>
          <p className="mt-1 text-xs text-slate-500">
            Connect a domain and publish to start tracking traffic.
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-cyan-300" />
      </div>
      <div className="mt-5 grid h-36 place-items-center rounded-lg border border-dashed border-slate-700 bg-slate-950/25 text-center">
        <div>
          <p className="text-sm font-semibold text-slate-300">Analytics will appear here</p>
          <p className="mt-1 text-xs text-slate-500">
            Visitors, leads, top pages, and conversions.
          </p>
        </div>
      </div>
    </section>
  );
}
function ActivityCard({ websites }: { websites: Website[] }) {
  return (
    <section className="h-full rounded-xl border border-slate-800 bg-[#0b1826] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold">Recent activity</h2>
          <p className="mt-1 text-xs text-slate-500">Your latest workspace changes.</p>
        </div>
        <Link to="/tenant/activity" className="text-xs font-semibold text-cyan-300">
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-4">
        {websites.length ? (
          websites.slice(0, 3).map((website) => (
            <div className="flex gap-3" key={website.id}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Globe2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium">Website workspace created</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {website.name} ·{" "}
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                    new Date(website.createdAt),
                  )}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-xs text-slate-500">
            Your workspace activity will appear here.
          </p>
        )}
      </div>
    </section>
  );
}
function WorkspaceHealth({ done }: { done: { create: boolean; publish: boolean } }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
      <h2 className="font-display text-base font-bold">Website readiness</h2>
      <p className="mt-1 text-xs text-slate-500">Complete these steps to launch your website.</p>
      <div className="mt-5 space-y-3">
        <Readiness label="Create a website" done={done.create} />
        <Readiness label="Connect a domain" />
        <Readiness label="Review SEO settings" />
        <Readiness label="Publish your website" done={done.publish} />
      </div>
      <button
        type="button"
        className="mt-5 w-full rounded-lg border border-slate-700 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
      >
        View launch checklist
      </button>
    </section>
  );
}
function Readiness({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600 text-transparent"}`}
      >
        ✓
      </span>
      <span className={done ? "text-slate-300" : "text-slate-500"}>{label}</span>
    </div>
  );
}
