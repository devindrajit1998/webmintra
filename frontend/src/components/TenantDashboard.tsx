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
  Puzzle,
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
  { label: "Plugins & Apps", icon: Puzzle, to: "/tenant/plugins" },
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
    <div className="landing-page min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#e2e8f0] bg-white px-3 py-5 transition-all duration-300 lg:translate-x-0 ${menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div
          className={`mb-8 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between px-2"}`}
        >
          <div className="flex items-center gap-2.5">
            {settings["brand.logoUrl"] ? (
              <img
                src={settings["brand.logoUrl"]}
                alt="Logo"
                className="h-8 w-8 rounded-lg object-contain shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-bold text-sm shrink-0">
                W
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-[18px] font-black tracking-tight leading-none text-[#0f172a] lowercase flex items-baseline">
                  <span>web</span>
                  <span className="bg-gradient-to-r from-[#ea580c] via-[#f59e0b] to-[#059669] bg-clip-text text-transparent">
                    mintra
                  </span>
                </p>
                <p className="truncate text-[10px] font-bold tracking-wide text-[#ea580c] mt-1 flex items-center gap-1">
                  <span>🇮🇳</span> <span>{user.name}&apos;s workspace</span>
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded p-1 text-[#64748b] hover:text-[#0f172a] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <TenantNavGroup label="Workspace" items={mainNavigation} collapsed={sidebarCollapsed} />
        <TenantNavGroup label="Account & GST" items={accountNavigation} collapsed={sidebarCollapsed} />

        <div
          className={`mt-auto overflow-hidden transition-all duration-300 ${sidebarCollapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"}`}
        >
          <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-3.5 shadow-2xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#047857] flex items-center justify-between">
              <span>{planName} plan</span>
              <span>🇮🇳</span>
            </p>
            <p className="mt-1 text-xs text-[#475569] font-semibold">
              {websites.length} website{websites.length === 1 ? "" : "s"} in workspace
            </p>
          </div>
        </div>
        <div
          className={`mt-auto pt-3 transition-colors duration-300 ${sidebarCollapsed ? "border-transparent" : "border-t border-[#f1f5f9]"}`}
        >
          <button
            type="button"
            onClick={onSignOut}
            className={`flex w-full items-center ${sidebarCollapsed ? "justify-center" : "gap-2.5"} rounded-xl px-3 py-2 text-xs font-bold text-[#64748b] transition hover:bg-rose-50 hover:text-rose-600`}
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
          className="fixed inset-0 z-30 bg-[#0f172a]/40 backdrop-blur-xs lg:hidden"
        />
      ) : null}
      <main
        className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b border-[#e2e8f0] bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] lg:block"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-[#cbd5e1] p-2 text-[#475569] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full bg-[#fff7ed] border border-[#fed7aa] px-2.5 py-0.5 text-[11px] font-bold text-[#c2410c] flex items-center gap-1 shadow-2xs">
              <span>🇮🇳</span> Mumbai Edge Node
            </span>
          </div>

          <span className="ml-auto" />
          <TenantHeaderControls websites={websites} />
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-1 text-[10.5px] font-extrabold text-[#047857] sm:inline capitalize shadow-2xs">
              {planName} plan
            </span>
            <div className="ml-1 flex items-center gap-2.5 border-l border-[#e2e8f0] pl-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-[#059669]"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#059669] text-xs font-bold text-white shrink-0 shadow-xs">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-extrabold text-[#0f172a]">{user.name}</p>
                <p className="text-[10px] font-semibold text-[#64748b]">{user.email}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1600px] py-6 px-4 sm:px-6">
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
        <div className="tiranga-border-top flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#fed7aa] bg-gradient-to-r from-[#fff7ed] via-white to-[#ecfdf5] p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#0b192c] flex items-center gap-2">
                <span>🇮🇳 14-Day Free Trial Active</span>
                <span className="rounded-full bg-[#fff7ed] px-2.5 py-0.5 text-[11px] font-extrabold text-[#c2410c] border border-[#fed7aa]">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining
                </span>
              </p>
              <p className="text-xs text-[#64748b] mt-0.5">
                Full access to edit, publish, connect your .in domain, and receive WhatsApp enquiries directly.
              </p>
            </div>
          </div>

          <Link
            to="/tenant/billing"
            className="shrink-0 whitespace-nowrap rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857]"
          >
            Upgrade / Subscribe
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
              Welcome back, {user.name}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-1 text-[10.5px] font-bold text-[#047857] shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Active Workspace
            </span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-[#64748b]">
            Manage your websites, WhatsApp leads, and custom domain publishing.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#64748b]">
          <span className="font-bold text-[#0f172a]">{planName} plan</span>
          <span className="h-1 w-1 rounded-full bg-[#cbd5e1]" />
          <span>Member since {memberSince}</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Globe2 className="h-5 w-5" />} label="Total Websites" value={websites.length} tone="cyan" />
        <Kpi icon={<Sparkles className="h-5 w-5" />} label="Live Published" value={published} tone="emerald" />
        <Kpi icon={<FileText className="h-5 w-5" />} label="Draft Projects" value={drafts} tone="amber" />
        <Kpi icon={<Image className="h-5 w-5" />} label="Cloud Storage" value="0 MB" tone="violet" />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-[#0b192c]">My Websites</h2>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Manage every stage of your website lifecycle.
              </p>
            </div>
            <Link
              to="/tenant/websites"
              className="text-xs font-bold text-[#059669] transition hover:underline"
            >
              View all →
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
    <section className="mb-4">
      <p
        className={`px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#94a3b8] transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "max-h-0 mb-0 opacity-0" : "max-h-6 mb-1.5 opacity-100"}`}
      >
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map(({ label: itemLabel, icon: Icon, to }) => (
          <Link
            to={to}
            key={itemLabel}
            title={collapsed ? itemLabel : undefined}
            className={`flex w-full items-center ${collapsed ? "justify-center" : "gap-2.5"} rounded-xl px-3 py-2 text-left text-xs font-semibold transition text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] overflow-hidden`}
            activeProps={{ className: "!bg-[#ecfdf5] !text-[#047857] !font-bold border-l-4 !border-[#ea580c] shadow-2xs" }}
            activeOptions={{ exact: to === "/tenant" }}
          >
            <Icon className="h-4 w-4 shrink-0" />
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
    cyan: "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]",
    emerald: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
    violet: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
    amber: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
  }[tone];
  return (
    <article className="tiranga-border-top flex min-h-24 items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${color}`}>
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-[#0b192c]">{value}</p>
      </div>
    </article>
  );
}

function WebsiteCard({ website, onArchive }: { website: Website; onArchive: () => void }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative h-32 overflow-hidden bg-gradient-to-r from-[#ea580c]/80 via-[#059669]/80 to-[#0284c7]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,.3),transparent_30%)]" />
        <div className="absolute bottom-3 left-4 rounded-lg border border-white/40 bg-[#0b192c]/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
          {website.templateName || "WebMintra Template"}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-extrabold text-base text-[#0b192c]">{website.name}</h3>
            <p className="mt-0.5 text-[11px] text-[#64748b]">
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                new Date(website.updatedAt),
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label={`More actions for ${website.name}`}
            className="rounded-lg p-1 text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          {website.status === "published" ? (
            <span className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
              ✓ Published
            </span>
          ) : (
            <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
              Draft Mode
            </span>
          )}
          <span className="text-[10px] font-semibold text-[#64748b]">🇮🇳 Ready to connect .in</span>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to="/tenant/builder/$id"
            params={{ id: website.id }}
            className="flex-1 flex items-center justify-center rounded-xl bg-[#059669] px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857]"
          >
            Open Editor
          </Link>
          <button
            type="button"
            onClick={onArchive}
            className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
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
    <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-6 py-14 text-center shadow-2xs">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
        <Globe2 className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-extrabold text-[#0b192c]">Your Indian Business Site is Ready to Create</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#64748b]">
        Pick a template to build your clinic, restaurant, or business landing page with instant WhatsApp leads.
      </p>
    </div>
  );
}

function QuickActions() {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
        <h2 className="text-sm font-extrabold text-[#0b192c]">Quick Actions</h2>
        <PanelLeftClose className="h-4 w-4 text-[#94a3b8]" />
      </div>
      <div className="mt-3.5 space-y-2">
        <QuickAction
          icon={<Globe2 className="h-4 w-4" />}
          title="Connect .IN Domain"
          detail="Link your custom Indian domain"
        />
        <QuickAction
          icon={<Sparkles className="h-4 w-4" />}
          title="WhatsApp Leads Setup"
          detail="Receive direct customer bookings"
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
      className="flex w-full items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-left transition hover:border-[#cbd5e1] hover:bg-white hover:shadow-xs cursor-pointer"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-[#0f172a]">{title}</span>
        <span className="mt-0.5 block truncate text-[10.5px] text-[#64748b]">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
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
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#ea580c]">
            Current Plan
          </p>
          <h2 className="mt-0.5 text-lg font-extrabold capitalize text-[#0b192c]">{planName}</h2>
        </div>
        <CreditCard className="h-6 w-6 text-[#059669]" />
      </div>
      <div className="mt-4 space-y-3 text-xs">
        <Progress
          label="Active Websites"
          value={`${websiteCount} / ${limits.websites}`}
          percent={Math.min((websiteCount / limits.websites) * 100, 100)}
        />
        <Progress label="Storage Used" value={`0 MB / ${limits.storage} GB`} percent={2} />
      </div>
      <Link
        to="/tenant/billing"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#059669] py-2 text-xs font-bold text-white transition hover:bg-[#047857] shadow-xs"
      >
        Manage Subscription
      </Link>
    </section>
  );
}

function Progress({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-[#64748b] text-[11px] font-semibold">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
        <div className="h-full rounded-full bg-[#059669]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AnalyticsCard() {
  return (
    <section className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#0b192c]">Website Traffic & WhatsApp Leads</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Publish your website to start tracking visitor engagement.
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-[#059669]" />
      </div>
      <div className="mt-5 grid h-36 place-items-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center">
        <div>
          <p className="text-xs font-bold text-[#0f172a]">Live analytics will appear here</p>
          <p className="mt-1 text-[11px] text-[#64748b]">
            Direct clicks, WhatsApp enquiries, top pages, and devices.
          </p>
        </div>
      </div>
    </section>
  );
}

function ActivityCard({ websites }: { websites: Website[] }) {
  return (
    <section className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#0b192c]">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">Your latest workspace updates.</p>
        </div>
        <Link to="/tenant/activity" className="text-xs font-bold text-[#059669] hover:underline">
          View all →
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {websites.length ? (
          websites.slice(0, 3).map((website) => (
            <div className="flex gap-3 items-center rounded-xl border border-[#f1f5f9] p-2.5 bg-[#f8fafc]" key={website.id}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                <Globe2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#0f172a]">{website.name}</p>
                <p className="text-[10.5px] text-[#64748b]">
                  Created on{" "}
                  {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
                    new Date(website.createdAt),
                  )}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-xs text-[#64748b]">
            Your workspace activity will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

function WorkspaceHealth({ done }: { done: { create: boolean; publish: boolean } }) {
  return (
    <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-[#0b192c]">Launch Checklist</h2>
      <p className="mt-0.5 text-xs text-[#64748b]">Complete these steps to go live.</p>
      <div className="mt-4 space-y-2.5">
        <Readiness label="Select Indian Business Template" done={done.create} />
        <Readiness label="Connect .in Custom Domain" />
        <Readiness label="Add WhatsApp Contact Button" />
        <Readiness label="Publish Website to Edge" done={done.publish} />
      </div>
    </section>
  );
}

function Readiness({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-xs font-semibold">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-bold ${
          done
            ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
            : "border-[#cbd5e1] bg-[#f8fafc] text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={done ? "text-[#0f172a]" : "text-[#64748b]"}>{label}</span>
    </div>
  );
}
