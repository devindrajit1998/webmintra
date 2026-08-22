import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Globe2,
  LifeBuoy,
  Loader2,
  LogIn,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
import { getWorkspaceActivity } from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/activity")({
  component: ActivityPage,
  head: () => ({ meta: [{ title: "Activity | WebMintra" }] }),
});

const actionGroups = [
  { value: "", label: "All activity" },
  { value: "ticket_created", label: "Tickets created" },
  { value: "ticket_replied", label: "Ticket replies" },
  { value: "domain_added", label: "Domains added" },
  { value: "settings_updated", label: "Settings changes" },
];

function ActivityPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["tenant-activity", page, search, action],
    queryFn: () => getWorkspaceActivity({ page, limit: 15, search, action }),
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Header Section */}
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
              <Activity className="h-3.5 w-3.5" /> Workspace Audit Trail
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Activity History
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Review account changes, team member actions, and events performed across your workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh activity"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 text-xs font-bold text-[#0f172a] shadow-2xs transition hover:border-[#059669] hover:bg-[#ecfdf5] hover:text-[#059669] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-[#059669]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Activity List Container */}
      <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-[#f1f5f9] p-5 sm:px-6 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search activity</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search descriptions, resources, or changes..."
              className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-10 pr-3 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669] focus:bg-white transition"
            />
          </label>
          <label>
            <span className="sr-only">Filter by action</span>
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] focus:bg-white transition cursor-pointer md:w-52"
            >
              {actionGroups.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <StatePanel
            icon={<Loader2 className="h-8 w-8 animate-spin text-[#059669]" />}
            title="Loading activity"
            description="Fetching your latest workspace events..."
          />
        ) : isError ? (
          <StatePanel
            icon={<AlertCircle className="h-8 w-8 text-rose-500" />}
            title="Activity could not be loaded"
            description="Please check your connection and try again."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
              >
                Try again
              </button>
            }
          />
        ) : logs.length === 0 ? (
          <StatePanel
            icon={<Activity className="h-10 w-10 text-[#cbd5e1]" />}
            title="No activity found"
            description={
              search || action
                ? "Clear the current filters to see other events."
                : "Workspace events and updates will appear here automatically."
            }
          />
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {logs.map((log) => {
              const Icon = iconForAction(log.action);
              return (
                <article
                  key={log.id}
                  className="grid gap-3 px-6 py-5 transition hover:bg-[#f8fafc] sm:grid-cols-[44px_1fr_auto] sm:items-center"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] text-[#059669] shadow-2xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-extrabold text-[#0f172a]">
                        {humanize(log.action)}
                      </h2>
                      {log.resource?.name && (
                        <span className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
                          {log.resource.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#64748b]">{log.description}</p>
                  </div>
                  <time
                    title={format(new Date(log.createdAt), "PPpp")}
                    className="whitespace-nowrap text-[11px] font-semibold text-[#94a3b8] sm:text-right"
                  >
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </time>
                </article>
              );
            })}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <footer className="flex items-center justify-between border-t border-[#f1f5f9] bg-[#f8fafc] px-6 py-3.5">
            <p className="text-xs font-bold text-[#64748b]">
              Page {pagination.page} of {pagination.pages} · {pagination.total} events
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                title="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] shadow-2xs hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Next page"
                disabled={page >= pagination.pages}
                onClick={() => setPage((value) => value + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] shadow-2xs hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}

function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      {icon}
      <h2 className="mt-3.5 text-base font-extrabold text-[#0f172a]">{title}</h2>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function humanize(action: string) {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function iconForAction(action: string) {
  if (action.includes("ticket")) return LifeBuoy;
  if (action.includes("domain")) return Globe2;
  if (action.includes("login") || action.includes("auth")) return LogIn;
  if (action.includes("settings")) return Settings;
  if (action.includes("website") || action.includes("blog")) return FileEdit;
  return Activity;
}
