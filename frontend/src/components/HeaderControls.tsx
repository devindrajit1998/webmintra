import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, CircleHelp, Loader2, Search, X } from "lucide-react";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from "@/lib/admin-api";
import {
  getTenantNotifications,
  markAllTenantNotificationsRead,
  markTenantNotificationRead,
  type UserNotification,
  type Website,
} from "@/lib/auth-api";

type NotificationItem = AdminNotification | UserNotification;

const tenantDestinations = [
  { label: "Dashboard", description: "Workspace overview", to: "/tenant" },
  { label: "Websites", description: "Manage websites", to: "/tenant/websites" },
  { label: "Pages", description: "Review website pages", to: "/tenant/pages" },
  { label: "Media", description: "Browse uploaded assets", to: "/tenant/media" },
  { label: "Forms", description: "View form submissions", to: "/tenant/forms" },
  { label: "Blog", description: "Manage blog posts", to: "/tenant/blog" },
  { label: "SEO", description: "Configure search visibility", to: "/tenant/seo" },
  { label: "Analytics", description: "Review website traffic", to: "/tenant/analytics" },
  { label: "Domains", description: "Manage custom domains", to: "/tenant/domains" },
  { label: "Billing", description: "Invoices and payments", to: "/tenant/billing" },
  { label: "Support", description: "Support tickets", to: "/tenant/support" },
  { label: "Settings", description: "Account settings", to: "/tenant/settings" },
] as const;

export function TenantHeaderControls({ websites }: { websites: Website[] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: ["tenant-header-notifications"],
    queryFn: () => getTenantNotifications(),
    refetchInterval: 60_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["tenant-header-notifications"] });
  const readMutation = useMutation({
    mutationFn: markTenantNotificationRead,
    onSuccess: invalidate,
  });
  const readAllMutation = useMutation({
    mutationFn: markAllTenantNotificationsRead,
    onSuccess: invalidate,
  });

  const term = search.trim().toLowerCase();
  const destinations = term
    ? tenantDestinations.filter((item) =>
        `${item.label} ${item.description}`.toLowerCase().includes(term),
      )
    : tenantDestinations.slice(0, 5);
  const matchingWebsites = term
    ? websites.filter((website) => website.name.toLowerCase().includes(term)).slice(0, 4)
    : [];

  return (
    <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
      <div className="relative hidden min-w-0 max-w-md flex-1 md:block">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Search workspace"
            placeholder="Search websites, pages, and tools..."
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-9 text-xs text-slate-100 outline-none transition focus:border-cyan-400"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </label>
        {searchOpen ? (
          <div className="absolute left-0 top-11 z-50 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="max-h-80 overflow-y-auto p-2">
              {matchingWebsites.map((website) => (
                <Link
                  key={website.id}
                  to="/tenant/builder/$id"
                  params={{ id: website.id }}
                  onClick={() => setSearchOpen(false)}
                  className="block rounded-lg px-3 py-2 hover:bg-slate-800"
                >
                  <span className="block text-xs font-semibold text-slate-200">{website.name}</span>
                  <span className="text-[10px] text-slate-500">Open website editor</span>
                </Link>
              ))}
              {destinations.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSearchOpen(false)}
                  className="block rounded-lg px-3 py-2 hover:bg-slate-800"
                >
                  <span className="block text-xs font-semibold text-slate-200">{item.label}</span>
                  <span className="text-[10px] text-slate-500">{item.description}</span>
                </Link>
              ))}
              {!destinations.length && !matchingWebsites.length ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500">
                  No workspace results found.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {searchOpen ? (
        <button
          type="button"
          aria-label="Close search"
          onClick={() => setSearchOpen(false)}
          className="fixed inset-0 z-40 hidden md:block"
        />
      ) : null}
      <Link
        to="/tenant/kb"
        aria-label="Documentation"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        <CircleHelp className="h-4 w-4" />
      </Link>
      <NotificationControl
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={notificationsQuery.data?.notifications ?? []}
        unreadCount={notificationsQuery.data?.unreadCount ?? 0}
        isLoading={notificationsQuery.isLoading}
        onRead={(id) => readMutation.mutate(id)}
        onReadAll={() => readAllMutation.mutate()}
      />
    </div>
  );
}

export function AdminHeaderControls() {
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: ["admin-header-notifications"],
    queryFn: () => getAdminNotifications(),
    refetchInterval: 60_000,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-header-notifications"] });
  const readMutation = useMutation({
    mutationFn: markAdminNotificationRead,
    onSuccess: invalidate,
  });
  const readAllMutation = useMutation({
    mutationFn: markAllAdminNotificationsRead,
    onSuccess: invalidate,
  });

  return (
    <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
      <form action="/admin/search" method="get" className="hidden min-w-0 max-w-md flex-1 md:block">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="q"
            minLength={2}
            required
            aria-label="Search platform"
            placeholder="Search tenants, websites, payments..."
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-3 text-xs text-slate-100 outline-none transition focus:border-cyan-400"
          />
        </label>
      </form>
      <NotificationControl
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        notifications={notificationsQuery.data?.notifications ?? []}
        unreadCount={notificationsQuery.data?.unreadCount ?? 0}
        isLoading={notificationsQuery.isLoading}
        onRead={(id) => readMutation.mutate(id)}
        onReadAll={() => readAllMutation.mutate()}
      />
      <Link
        to="/admin/kb"
        aria-label="Help"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        <CircleHelp className="h-4 w-4" />
      </Link>
    </div>
  );
}

function NotificationControl({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  isLoading,
  onRead,
  onReadAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[8px] font-bold text-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-white">Notifications</p>
              <p className="text-[10px] text-slate-500">{unreadCount} unread</p>
            </div>
            {unreadCount ? (
              <button
                type="button"
                onClick={onReadAll}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading ? (
              <div className="grid h-28 place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              </div>
            ) : notifications.length ? (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => {
                    if (!notification.isRead) onRead(notification._id);
                    if (notification.link.startsWith("/"))
                      window.location.assign(notification.link);
                  }}
                  className={`block w-full rounded-lg px-3 py-3 text-left hover:bg-slate-800 ${notification.isRead ? "opacity-70" : "bg-emerald-400/5"}`}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-slate-700" : "bg-emerald-400"}`}
                    />
                    <span>
                      <span className="block text-xs font-semibold text-slate-200">
                        {notification.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-slate-500">
                        {notification.message}
                      </span>
                      <span className="mt-1.5 block text-[9px] text-slate-600">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-xs text-slate-500">No notifications yet.</p>
            )}
          </div>
        </div>
      ) : null}
      {open ? (
        <button
          type="button"
          aria-label="Close notifications"
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-40"
        />
      ) : null}
    </div>
  );
}
