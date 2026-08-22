import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboard, type AdminDashboard as AdminDashboardData } from "@/lib/auth-api";
import {
  Loader2,
  Users,
  ShieldCheck,
  Activity,
  PanelLeftClose,
  Boxes,
  Tags,
  Settings,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const {
    data: dashboard,
    error,
    isLoading,
  } = useQuery<AdminDashboardData>({
    queryKey: ["adminDashboard"],
    queryFn: () => getDashboard("admin"),
  });

  if (isLoading)
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );

  const metrics = dashboard?.metrics;
  const totalUsers = metrics?.totalUsers ?? 0;
  const tenants = metrics?.tenantUsers ?? 0;
  const verified = metrics?.verifiedUsers ?? 0;

  return (
    <div className="mx-auto max-w-[1600px] text-[#0f172a] font-sans space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c] tracking-tight">
            Platform Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#64748b]">
            Here&apos;s what&apos;s happening with your Indian business network today.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
        >
          <Activity className="h-4 w-4 text-[#059669]" />
          This Week
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error.message || "Failed to load dashboard."}
        </p>
      )}

      {/* 4 Stat Cards with Tiranga Highlights */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Registered Users"
          value={totalUsers}
          note="Platform-wide accounts"
          icon={<Users className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          label="Active Indian Tenants"
          value={tenants}
          note="Verified business owners"
          icon={<Users className="h-4 w-4" />}
          color="saffron"
        />
        <StatCard
          label="Verified Accounts"
          value={verified}
          note="Email & OTP verified"
          icon={<ShieldCheck className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Super Administrators"
          value={metrics?.administrators ?? 0}
          note="Platform operators"
          icon={<ShieldCheck className="h-4 w-4" />}
          color="amber"
        />
      </section>

      {/* Platform Growth & Account Status */}
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
              <p className="mt-1 text-xs font-semibold text-[#059669] flex items-center gap-1">
                <span>↗</span> Live registered businesses across India
              </p>
            </div>
            <select
              aria-label="Growth period"
              className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-bold text-[#475569] shadow-2xs outline-none"
            >
              <option>This week</option>
              <option>This month</option>
              <option>All time</option>
            </select>
          </div>
          <GrowthChart />
        </article>

        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
            Account Verification Status
          </h2>
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-6 justify-around">
            <Donut value={totalUsers ? Math.round((verified / totalUsers) * 100) : 0} />
            <div className="space-y-3 text-xs w-full sm:w-auto">
              <Legend color="bg-[#059669]" label="Verified Accounts" value={verified} />
              <Legend
                color="bg-[#ea580c]"
                label="Awaiting OTP"
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

      {/* Recent Tenants Table & Quick Actions */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <article className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-[#0b192c]">Recent Indian Businesses</h2>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Latest registered workspaces and tenant accounts
              </p>
            </div>
            <a href="/admin/tenants" className="text-xs font-bold text-[#059669] hover:underline">
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10.5px] uppercase tracking-wider text-[#64748b]">
                <tr>
                  <th className="px-6 py-3 font-bold">Tenant Business</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Verification</th>
                  <th className="px-6 py-3 text-right font-bold">Joined Date</th>
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
                          {recent.isEmailVerified ? "✓ Verified" : "Pending OTP"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-[#64748b]">
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(recent.createdAt))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#64748b]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                        <p className="text-xs">Loading recent account activity…</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3.5">
            <h2 className="text-sm font-extrabold text-[#0b192c]">Quick Operations</h2>
            <PanelLeftClose className="h-4 w-4 text-[#94a3b8]" />
          </div>
          <div className="mt-4 space-y-2.5">
            <a
              href="/admin/tenants"
              className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 transition hover:border-[#cbd5e1] hover:bg-white hover:shadow-xs"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                <Users className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-[#0f172a]">
                  Invite Business Tenant
                </span>
                <span className="mt-0.5 block text-[10.5px] text-[#64748b]">
                  Provision a new workspace
                </span>
              </span>
            </a>
            <QuickAction
              icon={<Boxes className="h-4 w-4" />}
              title="Add Template"
              detail="Upload or configure website template"
            />
            <QuickAction
              icon={<Tags className="h-4 w-4" />}
              title="Create Coupon"
              detail="Add discount code for Indian businesses"
            />
            <QuickAction
              icon={<Settings className="h-4 w-4" />}
              title="System Settings"
              detail="Configure payment gateway & edge CDN"
            />
          </div>
        </aside>
      </section>
    </div>
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
  color: "emerald" | "saffron" | "blue" | "amber";
}) {
  const styles = {
    emerald: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
    saffron: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
    blue: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
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
          <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[#0b192c]">{value.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-[#64748b]">{note}</p>
    </article>
  );
}

function GrowthChart() {
  return (
    <div className="mt-6 h-36 rounded-xl border border-[#f1f5f9] bg-[linear-gradient(to_bottom,transparent_24%,rgba(226,232,240,.6)_25%,transparent_26%,transparent_49%,rgba(226,232,240,.6)_50%,transparent_51%,transparent_74%,rgba(226,232,240,.6)_75%,transparent_76%)] px-3 pb-4 pt-5">
      <svg
        viewBox="0 0 600 130"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="growth" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#059669" stopOpacity=".25" />
            <stop offset="1" stopColor="#059669" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 105 C70 77 100 88 150 72 S230 92 290 58 S370 68 430 43 S510 49 600 18 V130 H0Z"
          fill="url(#growth)"
        />
        <path
          d="M0 105 C70 77 100 88 150 72 S230 92 290 58 S370 68 430 43 S510 49 600 18"
          fill="none"
          stroke="#059669"
          strokeWidth="3.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function Donut({ value }: { value: number }) {
  return (
    <div
      className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full shadow-inner"
      style={{ background: `conic-gradient(#059669 ${value * 3.6}deg, #ea580c 0)` }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-white shadow-md">
        <div className="text-center">
          <p className="text-2xl font-extrabold text-[#0b192c]">{value}%</p>
          <p className="text-[10px] font-bold text-[#64748b] uppercase">Verified</p>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1">
      <span className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
        <i className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <strong className="font-extrabold text-[#0f172a]">{value}</strong>
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
