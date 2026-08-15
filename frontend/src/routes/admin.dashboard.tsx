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
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-xs text-slate-500">
            Here&apos;s what&apos;s happening with your platform today.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-300"
        >
          <Activity className="h-4 w-4" />
          This week
        </button>
      </div>

      {error && (
        <p className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error.message || "Failed to load dashboard."}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={totalUsers}
          note="Platform accounts"
          icon={<Users />}
          color="emerald"
        />
        <StatCard
          label="Total tenants"
          value={tenants}
          note="Business owners"
          icon={<Users />}
          color="blue"
        />
        <StatCard
          label="Verified accounts"
          value={verified}
          note="Email verified"
          icon={<ShieldCheck />}
          color="violet"
        />
        <StatCard
          label="Administrators"
          value={metrics?.administrators ?? 0}
          note="Platform operators"
          icon={<ShieldCheck />}
          color="amber"
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Platform growth</h2>
              <p className="mt-3 font-display text-3xl font-bold">{totalUsers.toLocaleString()}</p>
              <p className="mt-1 text-xs text-emerald-400">Live total registered accounts</p>
            </div>
            <select
              aria-label="Growth period"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
            >
              <option>This week</option>
            </select>
          </div>
          <GrowthChart />
        </article>

        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
          <h2 className="text-sm font-semibold">Account status</h2>
          <div className="mt-6 flex items-center gap-6">
            <Donut value={totalUsers ? Math.round((verified / totalUsers) * 100) : 0} />
            <div className="space-y-3 text-xs">
              <Legend color="bg-emerald-400" label="Verified" value={verified} />
              <Legend
                color="bg-amber-400"
                label="Awaiting verification"
                value={Math.max(totalUsers - verified, 0)}
              />
              <Legend
                color="bg-violet-400"
                label="Administrators"
                value={metrics?.administrators ?? 0}
              />
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <article className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1826]">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Recent tenants</h2>
              <p className="mt-1 text-xs text-slate-500">Latest accounts from the platform</p>
            </div>
            <a href="/admin/tenants" className="text-xs text-cyan-400">
              View all
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.recentUsers.length ? (
                  dashboard.recentUsers.map((recent) => (
                    <tr key={recent.email} className="border-b border-slate-800/70 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-200">{recent.name}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{recent.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-violet-500/15 px-2 py-1 text-[10px] capitalize text-violet-300">
                          {recent.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-[10px] ${recent.isEmailVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}
                        >
                          {recent.isEmailVerified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(recent.createdAt))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                        <p className="text-sm text-slate-500">Loading recent account activity…</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <PanelLeftClose className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-4 space-y-2">
            <a
              href="/admin/tenants"
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 transition hover:border-slate-600"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
                <Users className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-medium text-slate-200">Invite tenant</span>
                <span className="mt-0.5 block text-[10px] text-slate-500">
                  Provision a secure workspace invitation
                </span>
              </span>
            </a>
            <QuickAction
              icon={<Boxes />}
              title="Add template"
              detail="Upload or create a template"
            />
            <QuickAction icon={<Tags />} title="Create coupon" detail="Add a subscription coupon" />
            <QuickAction
              icon={<Settings />}
              title="System settings"
              detail="Configure platform settings"
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
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  const styles = {
    emerald: "bg-emerald-400/15 text-emerald-300",
    blue: "bg-sky-400/15 text-sky-300",
    violet: "bg-violet-400/15 text-violet-300",
    amber: "bg-amber-400/15 text-amber-300",
  };
  return (
    <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles[color]}`}>
          {icon}
        </span>
        <div>
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="mt-0.5 font-display text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-500">{note}</p>
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
