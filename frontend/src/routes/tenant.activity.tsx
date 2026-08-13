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
    <div className="mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-cyan-400">
            <Activity className="h-4 w-4" /> Workspace audit trail
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Activity</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review account changes and actions performed in your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh activity"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-[#0b1826] text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <section className="border-y border-slate-800 bg-[#0b1826] sm:rounded-lg sm:border">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search activity</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search descriptions or resources"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
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
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500 md:w-48"
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
            icon={<Loader2 className="h-7 w-7 animate-spin text-cyan-400" />}
            title="Loading activity"
            description="Fetching your latest workspace events."
          />
        ) : isError ? (
          <StatePanel
            icon={<AlertCircle className="h-7 w-7 text-rose-400" />}
            title="Activity could not be loaded"
            description="Check your connection and try again."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950"
              >
                Try again
              </button>
            }
          />
        ) : logs.length === 0 ? (
          <StatePanel
            icon={<Activity className="h-8 w-8 text-slate-600" />}
            title="No activity found"
            description={
              search || action
                ? "Clear the current filters to see other events."
                : "Workspace events will appear here as you make changes."
            }
          />
        ) : (
          <div className="divide-y divide-slate-800/70">
            {logs.map((log) => {
              const Icon = iconForAction(log.action);
              return (
                <article
                  key={log.id}
                  className="grid gap-3 px-4 py-5 transition hover:bg-slate-900/30 sm:grid-cols-[40px_1fr_auto] sm:px-6"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-cyan-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-slate-100">
                        {humanize(log.action)}
                      </h2>
                      {log.resource?.name && (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                          {log.resource.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{log.description}</p>
                  </div>
                  <time
                    title={format(new Date(log.createdAt), "PPpp")}
                    className="whitespace-nowrap text-xs text-slate-500 sm:pt-1"
                  >
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </time>
                </article>
              );
            })}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <footer className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} events
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                title="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Next page"
                disabled={page >= pagination.pages}
                onClick={() => setPage((value) => value + 1)}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 text-slate-400 hover:text-white disabled:opacity-30"
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
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      {icon}
      <h2 className="mt-4 text-base font-semibold text-slate-200">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
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
