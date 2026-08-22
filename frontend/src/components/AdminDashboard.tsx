import {
  Activity,
  Bell,
  Boxes,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { AdminDashboard as AdminDashboardData, SessionUser } from "@/lib/auth-api";

type Props = {
  user: SessionUser;
  dashboard: AdminDashboardData | null;
  error: string;
  onSignOut: () => void;
};

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Analytics", icon: Activity },
  { label: "Tenants", icon: Users, to: "/admin-tenants" },
  { label: "Websites", icon: Monitor },
  { label: "Templates", icon: Boxes },
  { label: "Subscriptions", icon: CreditCard },
  { label: "Payments", icon: CreditCard },
  { label: "Coupons", icon: Tags },
  { label: "Domains", icon: Globe2 },
];

const management = [
  { label: "Blog", icon: FileText },
  { label: "Pages", icon: FileText },
  { label: "Support tickets", icon: CircleHelp },
  { label: "Settings", icon: Settings },
];

export function AdminDashboard({ user, dashboard, error, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const metrics = dashboard?.metrics;
  const totalUsers = metrics?.totalUsers ?? 0;
  const tenants = metrics?.tenantUsers ?? 0;
  const verified = metrics?.verifiedUsers ?? 0;

  return (
    <div className="landing-page min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#e2e8f0] bg-white px-3 py-5 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ea580c] to-[#059669] text-white shadow-xs font-bold text-sm shrink-0">
              W
            </div>
            <div>
              <p className="font-extrabold text-base text-[#0f172a] lowercase">webmintra</p>
              <p className="text-[10px] font-bold text-[#ea580c]">🇮🇳 Admin Central</p>
            </div>
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
        <SidebarGroup label="Main" items={navigation} />
        <SidebarGroup label="Content" items={management.slice(0, 2)} />
        <SidebarGroup label="Support" items={management.slice(2, 3)} />
        <SidebarGroup label="System" items={management.slice(3)} />
        <button
          type="button"
          onClick={onSignOut}
          className="mt-auto flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#64748b] transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f172a]/40 backdrop-blur-xs lg:hidden"
        />
      ) : null}

      <main className="min-h-screen lg:pl-64">
        <header className="flex min-h-16 items-center gap-4 border-b border-[#e2e8f0] bg-white/90 px-4 backdrop-blur-md sm:px-6 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-[#cbd5e1] p-2 text-[#475569] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden flex-1 md:block">
            <label className="relative block max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                aria-label="Search dashboard"
                placeholder="Search anything across India..."
                className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-10 text-xs text-[#0f172a] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#94a3b8]">
                ⌘K
              </span>
            </label>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <IconButton
              label="Notifications"
              icon={<Bell className="h-4 w-4 text-[#475569]" />}
              badge="4"
            />
            <IconButton label="Help" icon={<CircleHelp className="h-4 w-4 text-[#475569]" />} />
            <div className="ml-2 flex items-center gap-2.5 border-l border-[#e2e8f0] pl-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#059669] text-xs font-bold text-white shadow-xs">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-extrabold text-[#0f172a]">{user.name}</p>
                <p className="text-[10px] font-semibold text-[#64748b]">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c] tracking-tight">
                Admin Overview
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#64748b]">
                Welcome back, {user.name}. Here&apos;s what&apos;s happening with your Indian
                business network today.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc]"
            >
              <Activity className="h-4 w-4 text-[#059669]" />
              This Week
            </button>
          </div>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Users"
              value={totalUsers}
              note="Platform-wide accounts"
              icon={<Users className="h-4 w-4" />}
              color="emerald"
            />
            <StatCard
              label="Active Tenants"
              value={tenants}
              note="Indian business owners"
              icon={<Users className="h-4 w-4" />}
              color="blue"
            />
            <StatCard
              label="Verified Accounts"
              value={verified}
              note="Email & OTP verified"
              icon={<ShieldCheck className="h-4 w-4" />}
              color="violet"
            />
            <StatCard
              label="Super Administrators"
              value={metrics?.administrators ?? 0}
              note="Platform operators"
              icon={<ShieldCheck className="h-4 w-4" />}
              color="amber"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
            <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                    Platform Growth
                  </span>
                  <p className="mt-2 text-3xl font-extrabold text-[#0b192c]">
                    {totalUsers.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#059669]">
                    Live total registered accounts
                  </p>
                </div>
                <select
                  aria-label="Growth period"
                  className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-bold text-[#475569] shadow-2xs"
                >
                  <option>This week</option>
                  <option>This month</option>
                </select>
              </div>
              <GrowthChart />
            </article>
            <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Account Status
              </h2>
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-6 justify-around">
                <Donut value={totalUsers ? Math.round((verified / totalUsers) * 100) : 0} />
                <div className="space-y-3 text-xs w-full sm:w-auto">
                  <Legend color="bg-[#059669]" label="Verified" value={verified} />
                  <Legend
                    color="bg-[#ea580c]"
                    label="Awaiting verification"
                    value={Math.max(totalUsers - verified, 0)}
                  />
                  <Legend
                    color="bg-[#3b82f6]"
                    label="Administrators"
                    value={metrics?.administrators ?? 0}
                  />
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
            <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-4">
                <div>
                  <h2 className="text-sm font-extrabold text-[#0b192c]">Recent Tenants</h2>
                  <p className="mt-0.5 text-xs text-[#64748b]">Latest accounts from the platform</p>
                </div>
                <a
                  href="/admin-tenants"
                  className="text-xs font-bold text-[#059669] hover:underline"
                >
                  View all →
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-xs">
                  <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10.5px] uppercase tracking-wider text-[#64748b]">
                    <tr>
                      <th className="px-6 py-3 font-bold">Tenant</th>
                      <th className="px-4 py-3 font-bold">Role</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-6 py-3 text-right font-bold">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {dashboard?.recentUsers.length ? (
                      dashboard.recentUsers.map((recent) => (
                        <tr key={recent.email} className="hover:bg-[#f8fafc] transition">
                          <td className="px-6 py-3.5">
                            <p className="font-bold text-[#0f172a]">{recent.name}</p>
                            <p className="text-[11px] text-[#64748b]">{recent.email}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10.5px] font-bold capitalize text-[#475569] border border-[#e2e8f0]">
                              {recent.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold border ${
                                recent.isEmailVerified
                                  ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
                                  : "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]"
                              }`}
                            >
                              {recent.isEmailVerified ? "✓ Verified" : "Pending"}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-medium text-[#64748b]">
                            {new Intl.DateTimeFormat(undefined, {
                              month: "short",
                              day: "numeric",
                            }).format(new Date(recent.createdAt))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-[#64748b]">
                          Loading recent account activity…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
            <aside className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3.5">
                <h2 className="text-sm font-extrabold text-[#0b192c]">Quick Actions</h2>
                <PanelLeftClose className="h-4 w-4 text-[#94a3b8]" />
              </div>
              <div className="mt-4 space-y-2.5">
                <a
                  href="/admin-tenants"
                  className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 transition hover:border-[#cbd5e1] hover:bg-white hover:shadow-xs"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                    <Users className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-[#0f172a]">Invite Tenant</span>
                    <span className="mt-0.5 block text-[10.5px] text-[#64748b]">
                      Provision a secure workspace
                    </span>
                  </span>
                </a>
                <QuickAction
                  icon={<Boxes className="h-4 w-4" />}
                  title="Add Template"
                  detail="Upload or create a template"
                />
                <QuickAction
                  icon={<Tags className="h-4 w-4" />}
                  title="Create Coupon"
                  detail="Add a subscription coupon"
                />
                <QuickAction
                  icon={<Settings className="h-4 w-4" />}
                  title="System Settings"
                  detail="Configure platform settings"
                />
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({
  label,
  items,
}: {
  label: string;
  items: Array<{
    label: string;
    icon: typeof LayoutDashboard;
    active?: boolean;
    to?: "/admin-tenants";
  }>;
}) {
  return (
    <section className="mb-4">
      <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map(({ label: itemLabel, icon: Icon, active, to }) =>
          to ? (
            <a
              href={to}
              key={itemLabel}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                active
                  ? "bg-[#ecfdf5] text-[#047857] font-bold border-l-4 border-[#ea580c] shadow-2xs"
                  : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {itemLabel}
            </a>
          ) : (
            <button
              type="button"
              key={itemLabel}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                active
                  ? "bg-[#ecfdf5] text-[#047857] font-bold border-l-4 border-[#ea580c] shadow-2xs"
                  : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {itemLabel}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
function IconButton({
  label,
  icon,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative rounded-xl p-2 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
    >
      {icon}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ea580c] px-1 text-[8px] font-bold text-white shadow-2xs">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
function StatCard({
  label,
  value,
  note,
  icon,
  color,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  const styles = {
    emerald: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
    blue: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
    violet: "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]",
    amber: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]",
  };
  return (
    <article className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${styles[color]}`}
        >
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[#0b192c]">{value.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#64748b]">{note}</p>
    </article>
  );
}
function GrowthChart() {
  return (
    <div className="mt-6 h-36 rounded-lg border border-slate-800 bg-[linear-gradient(to_bottom,transparent_24%,rgba(51,65,85,.38)_25%,transparent_26%,transparent_49%,rgba(51,65,85,.38)_50%,transparent_51%,transparent_74%,rgba(51,65,85,.38)_75%,transparent_76%)] px-3 pb-4 pt-5">
      <svg
        viewBox="0 0 600 130"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="growth" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#14b8a6" stopOpacity=".3" />
            <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 105 C70 77 100 88 150 72 S230 92 290 58 S370 68 430 43 S510 49 600 18 V130 H0Z"
          fill="url(#growth)"
        />
        <path
          d="M0 105 C70 77 100 88 150 72 S230 92 290 58 S370 68 430 43 S510 49 600 18"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
function Donut({ value }: { value: number }) {
  return (
    <div
      className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#34d399 ${value * 3.6}deg, #fbbf24 0)` }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-[#0b1826]">
        <div className="text-center">
          <p className="font-display text-2xl font-bold">{value}%</p>
          <p className="text-[10px] text-slate-500">verified</p>
        </div>
      </div>
    </div>
  );
}
function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-slate-400">
        <i className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </span>
      <strong className="font-medium text-slate-200">{value}</strong>
    </div>
  );
}
function QuickAction({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
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
