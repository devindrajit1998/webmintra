import { Outlet, createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import {
  CircleHelp,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Activity,
  Users,
  Monitor,
  Boxes,
  CreditCard,
  Tags,
  Globe2,
  FileText,
  SearchCheck,
  Database,
  Megaphone,
  Mail,
  ShieldCheck,
  BarChart,
  HardDrive,
  Quote,
} from "lucide-react";
import { clearSessionUser, getAuthenticatedUser, type SessionUser } from "@/lib/auth-api";
import { apiFetch, clearCsrfToken } from "@/lib/api-fetch";
import { AdminHeaderControls } from "@/components/HeaderControls";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Administrator | WebMintra" }] }),
});

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin/dashboard" },
  { label: "Tenants", icon: Users, to: "/admin/tenants" },
  { label: "Websites", icon: Monitor, to: "/admin/websites" },
  { label: "Templates", icon: Boxes, to: "/admin/templates" },
  { label: "Domains", icon: Globe2, to: "/admin/domains" },
];

const billing = [
  { label: "Plans", icon: Activity, to: "/admin/plans" },
  { label: "Subscriptions", icon: CreditCard, to: "/admin/subscriptions" },
  { label: "Payments", icon: CreditCard, to: "/admin/payments" },
  { label: "Coupons", icon: Tags, to: "/admin/coupons" },
];

const content = [
  { label: "Blog", icon: FileText, to: "/admin/blog" },
  { label: "Knowledge Base", icon: FileText, to: "/admin/kb" },
  { label: "Testimonials", icon: Quote, to: "/admin/testimonials" },
  { label: "Support", icon: CircleHelp, to: "/admin/support" },
  { label: "Announcements", icon: Megaphone, to: "/admin/announcements" },
];

const system = [
  { label: "Reports", icon: BarChart, to: "/admin/reports" },
  { label: "Storage", icon: HardDrive, to: "/admin/storage" },
  { label: "Email Templates", icon: Mail, to: "/admin/email-templates" },
  { label: "SEO & Settings", icon: SearchCheck, to: "/admin/settings" },
  { label: "Activity Logs", icon: Database, to: "/admin/activity-logs" },
  { label: "Profile", icon: ShieldCheck, to: "/admin/profile" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    async function checkAuth() {
      const sessionUser = await getAuthenticatedUser();
      if (!sessionUser) {
        clearSessionUser();
        await navigate({ to: "/sign-in", replace: true });
        return;
      }
      if (sessionUser.role !== "admin") {
        await navigate({ to: "/", replace: true });
        return;
      }
      setUser(sessionUser);
    }
    void checkAuth();
  }, [navigate]);

  async function signOut() {
    try {
      await apiFetch(
        `${import.meta.env["VITE_API_URL"] ?? "http://localhost:5000/api"}/auth/logout`,
        {
          method: "POST",
        },
      );
    } finally {
      clearCsrfToken();
      clearSessionUser();
      await navigate({ to: "/sign-in", replace: true });
    }
  }

  if (!user) return <div className="min-h-screen bg-background" aria-busy="true" />;

  return (
    <div className="landing-page admin-theme min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#e2e8f0] bg-white px-3 py-5 overflow-y-auto transition-all duration-300 lg:translate-x-0 ${menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <div
          className={`mb-6 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between px-2"}`}
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
                <p className="truncate text-[18px] font-black tracking-tight leading-none text-[#0f172a] lowercase">
                  {settings["site.name"] || "webmintra"}
                </p>
                <p className="truncate text-[10px] font-bold tracking-wide text-[#ea580c] mt-1 flex items-center gap-1">
                  <span>🇮🇳</span> <span>Admin Central</span>
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

        <SidebarGroup
          label="Platform"
          items={navigation}
          collapsed={sidebarCollapsed}
          onClick={() => setMenuOpen(false)}
        />
        <SidebarGroup
          label="Billing & GST"
          items={billing}
          collapsed={sidebarCollapsed}
          onClick={() => setMenuOpen(false)}
        />
        <SidebarGroup
          label="Content & Support"
          items={content}
          collapsed={sidebarCollapsed}
          onClick={() => setMenuOpen(false)}
        />
        <SidebarGroup
          label="System"
          items={system}
          collapsed={sidebarCollapsed}
          onClick={() => setMenuOpen(false)}
        />

        <div
          className={`mt-auto mb-2 pt-4 transition-colors duration-300 ${sidebarCollapsed ? "border-transparent" : "border-t border-[#f1f5f9]"}`}
        >
          <button
            type="button"
            onClick={() => void signOut()}
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
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-[#0f172a]/40 backdrop-blur-xs lg:hidden"
        />
      ) : null}

      <main
        className={`min-h-screen flex flex-col transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header className="flex min-h-16 shrink-0 items-center gap-4 border-b border-[#e2e8f0] bg-white/90 px-4 backdrop-blur-md sm:px-6 sticky top-0 z-20">
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
              <span>🇮🇳</span> Bharat Edge Node
            </span>
          </div>

          <span className="ml-auto" />
          <AdminHeaderControls />

          <div className="flex items-center gap-2">
            <div className="ml-2 flex items-center gap-2.5 border-l border-[#e2e8f0] pl-3">
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
                <p className="text-[10px] font-semibold text-[#64748b]">Super Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({
  label,
  items,
  collapsed,
  onClick,
}: {
  label: string;
  items: Array<{ label: string; icon: LucideIcon; to: string }>;
  collapsed?: boolean;
  onClick?: () => void;
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
            onClick={onClick}
            title={collapsed ? itemLabel : undefined}
            className={`flex w-full items-center ${collapsed ? "justify-center" : "gap-2.5"} rounded-xl px-3 py-2 text-left text-xs font-semibold transition text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] overflow-hidden`}
            activeProps={{ className: "!bg-[#ecfdf5] !text-[#047857] !font-bold border-l-4 !border-[#ea580c] shadow-2xs" }}
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
