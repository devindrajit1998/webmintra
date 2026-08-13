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
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-[#091521] px-3 py-5 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 font-display text-lg font-black text-slate-950">W</span><div><p className="font-display text-sm font-bold">WebMintra</p><p className="text-[10px] text-slate-500">Admin Panel</p></div></div>
          <button type="button" onClick={() => setMenuOpen(false)} className="rounded p-1 text-slate-400 lg:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
        <SidebarGroup label="Main" items={navigation} />
        <SidebarGroup label="Content" items={management.slice(0, 2)} />
        <SidebarGroup label="Support" items={management.slice(2, 3)} />
        <SidebarGroup label="System" items={management.slice(3)} />
        <button type="button" onClick={onSignOut} className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
      </aside>
      {menuOpen ? <button type="button" aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" /> : null}

      <main className="min-h-screen lg:pl-64">
        <header className="flex min-h-16 items-center gap-4 border-b border-slate-800 bg-[#091521]/80 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMenuOpen(true)} className="rounded-lg border border-slate-700 p-2 text-slate-300 lg:hidden" aria-label="Open navigation"><Menu className="h-4 w-4" /></button>
          <div className="hidden flex-1 md:block"><label className="relative block max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input aria-label="Search dashboard" placeholder="Search anything..." className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-10 text-xs text-slate-100 outline-none transition focus:border-cyan-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">⌘K</span></label></div>
          <div className="ml-auto flex items-center gap-2"><IconButton label="Notifications" icon={<Bell className="h-4 w-4" />} badge="4" /><IconButton label="Help" icon={<CircleHelp className="h-4 w-4" />} /><div className="ml-2 flex items-center gap-2 border-l border-slate-700 pl-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700 text-xs font-bold">{user.name.slice(0, 1).toUpperCase()}</span><div className="hidden sm:block"><p className="text-xs font-semibold">{user.name}</p><p className="text-[10px] text-slate-500">Administrator</p></div></div></div>
        </header>

        <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1><p className="mt-1 text-xs text-slate-500">Welcome back, {user.name}. Here&apos;s what&apos;s happening with your platform today.</p></div><button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-medium text-slate-300"><Activity className="h-4 w-4" />This week</button></div>
          {error ? <p className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total users" value={totalUsers} note="Platform accounts" icon={<Users />} color="emerald" /><StatCard label="Total tenants" value={tenants} note="Business owners" icon={<Users />} color="blue" /><StatCard label="Verified accounts" value={verified} note="Email verified" icon={<ShieldCheck />} color="violet" /><StatCard label="Administrators" value={metrics?.administrators ?? 0} note="Platform operators" icon={<ShieldCheck />} color="amber" /></section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]"><article className="rounded-xl border border-slate-800 bg-[#0b1826] p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">Platform growth</h2><p className="mt-3 font-display text-3xl font-bold">{totalUsers.toLocaleString()}</p><p className="mt-1 text-xs text-emerald-400">Live total registered accounts</p></div><select aria-label="Growth period" className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"><option>This week</option></select></div><GrowthChart /></article><article className="rounded-xl border border-slate-800 bg-[#0b1826] p-5"><h2 className="text-sm font-semibold">Account status</h2><div className="mt-6 flex items-center gap-6"><Donut value={totalUsers ? Math.round((verified / totalUsers) * 100) : 0} /><div className="space-y-3 text-xs"><Legend color="bg-emerald-400" label="Verified" value={verified} /><Legend color="bg-amber-400" label="Awaiting verification" value={Math.max(totalUsers - verified, 0)} /><Legend color="bg-violet-400" label="Administrators" value={metrics?.administrators ?? 0} /></div></div></article></section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]"><article className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1826]"><div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="text-sm font-semibold">Recent tenants</h2><p className="mt-1 text-xs text-slate-500">Latest accounts from the platform</p></div><a href="/admin-tenants" className="text-xs text-cyan-400">View all</a></div><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-medium">Tenant</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Joined</th></tr></thead><tbody>{dashboard?.recentUsers.length ? dashboard.recentUsers.map((recent) => <tr key={recent.email} className="border-b border-slate-800/70 last:border-0"><td className="px-5 py-3"><p className="font-medium text-slate-200">{recent.name}</p><p className="mt-1 text-[11px] text-slate-500">{recent.email}</p></td><td className="px-4 py-3"><span className="rounded bg-violet-500/15 px-2 py-1 text-[10px] capitalize text-violet-300">{recent.role}</span></td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] ${recent.isEmailVerified ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{recent.isEmailVerified ? "Verified" : "Pending"}</span></td><td className="px-5 py-3 text-right text-slate-500">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(recent.createdAt))}</td></tr>) : <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading recent account activity…</td></tr>}</tbody></table></div></article><aside className="rounded-xl border border-slate-800 bg-[#0b1826] p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Quick actions</h2><PanelLeftClose className="h-4 w-4 text-slate-500" /></div><div className="mt-4 space-y-2"><a href="/admin-tenants" className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 transition hover:border-slate-600"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300"><Users className="h-4 w-4" /></span><span><span className="block text-xs font-medium text-slate-200">Invite tenant</span><span className="mt-0.5 block text-[10px] text-slate-500">Provision a secure workspace invitation</span></span></a><QuickAction icon={<Boxes />} title="Add template" detail="Upload or create a template" /><QuickAction icon={<Tags />} title="Create coupon" detail="Add a subscription coupon" /><QuickAction icon={<Settings />} title="System settings" detail="Configure platform settings" /></div></aside></section>
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({ label, items }: { label: string; items: Array<{ label: string; icon: typeof LayoutDashboard; active?: boolean; to?: "/admin-tenants" }> }) { return <section className="mb-5"><p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">{label}</p><div className="space-y-0.5">{items.map(({ label: itemLabel, icon: Icon, active, to }) => to ? <a href={to} key={itemLabel} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition ${active ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}><Icon className="h-3.5 w-3.5" />{itemLabel}</a> : <button type="button" key={itemLabel} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition ${active ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}><Icon className="h-3.5 w-3.5" />{itemLabel}</button>)}</div></section>; }
function IconButton({ label, icon, badge }: { label: string; icon: React.ReactNode; badge?: string }) { return <button type="button" aria-label={label} className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100">{icon}{badge ? <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[8px] font-bold text-slate-950">{badge}</span> : null}</button>; }
function StatCard({ label, value, note, icon, color }: { label: string; value: number; note: string; icon: React.ReactNode; color: "emerald" | "blue" | "violet" | "amber" }) { const styles = { emerald: "bg-emerald-400/15 text-emerald-300", blue: "bg-sky-400/15 text-sky-300", violet: "bg-violet-400/15 text-violet-300", amber: "bg-amber-400/15 text-amber-300" }; return <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles[color]}`}>{icon}</span><div><p className="text-[11px] text-slate-500">{label}</p><p className="mt-0.5 font-display text-2xl font-bold">{value.toLocaleString()}</p></div></div><p className="mt-3 text-[10px] text-slate-500">{note}</p></article>; }
function GrowthChart() { return <div className="mt-6 h-36 rounded-lg border border-slate-800 bg-[linear-gradient(to_bottom,transparent_24%,rgba(51,65,85,.38)_25%,transparent_26%,transparent_49%,rgba(51,65,85,.38)_50%,transparent_51%,transparent_74%,rgba(51,65,85,.38)_75%,transparent_76%)] px-3 pb-4 pt-5"><svg viewBox="0 0 600 130" preserveAspectRatio="none" className="h-full w-full overflow-visible"><defs><linearGradient id="growth" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#14b8a6" stopOpacity=".3" /><stop offset="1" stopColor="#14b8a6" stopOpacity="0" /></linearGradient></defs><path d="M0 105 C70 77 100 88 150 72 S230 92 290 58 S370 68 430 43 S510 49 600 18 V130 H0Z" fill="url(#growth)" /><path d="M0 105 C70 77 100 88 150 72 S230 92 290 58 S370 68 430 43 S510 49 600 18" fill="none" stroke="#2dd4bf" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg></div>; }
function Donut({ value }: { value: number }) { return <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#34d399 ${value * 3.6}deg, #fbbf24 0)` }}><div className="grid h-24 w-24 place-items-center rounded-full bg-[#0b1826]"><div className="text-center"><p className="font-display text-2xl font-bold">{value}%</p><p className="text-[10px] text-slate-500">verified</p></div></div></div>; }
function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center justify-between gap-5"><span className="flex items-center gap-2 text-slate-400"><i className={`h-2 w-2 rounded-full ${color}`} />{label}</span><strong className="font-medium text-slate-200">{value}</strong></div>; }
function QuickAction({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <button type="button" className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-left transition hover:border-slate-600 hover:bg-slate-800"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">{icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-200">{title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{detail}</span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button>; }
