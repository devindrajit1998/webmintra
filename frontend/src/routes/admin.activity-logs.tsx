import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getActivityLogs } from "@/lib/admin-api";
import {
  Loader2,
  Activity,
  Search,
  Filter,
  Shield,
  Database,
  Trash2,
  Edit3,
  LogIn,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/activity-logs")({
  component: ActivityLogsPage,
});

function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminActivityLogs", { page, search, action, status }],
    queryFn: () => getActivityLogs({ page, limit: 20, search, action, status }),
  });

  const getActionIcon = (logAction: string) => {
    if (logAction.includes("delete")) return <Trash2 className="h-4 w-4" />;
    if (logAction.includes("update") || logAction.includes("edit"))
      return <Edit3 className="h-4 w-4" />;
    if (logAction.includes("login") || logAction.includes("auth"))
      return <LogIn className="h-4 w-4" />;
    if (logAction.includes("failed") || logAction.includes("error"))
      return <AlertTriangle className="h-4 w-4" />;
    return <Database className="h-4 w-4" />;
  };

  const getActionColor = (logStatus: string) => {
    if (logStatus === "failure") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (logStatus === "success") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Activity Logs</h1>
          <p className="mt-1 text-xs text-slate-500">
            Comprehensive audit trail of platform events.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search user ID or IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-8 text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Event</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="px-6 py-4 font-medium">Target</th>
                <th className="px-6 py-4 font-medium">IP & Location</th>
                <th className="px-6 py-4 text-right font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      <p className="text-sm text-slate-500">Loading audit logs...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.logs?.length ? (
                data.logs.map((log: any) => (
                  <tr key={log.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${getActionColor(log.status)}`}
                        >
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{log.action}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            {log.details ? JSON.stringify(log.details) : "No details"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.role === "admin" && <Shield className="h-3 w-3 text-cyan-400" />}
                        <div>
                          <p className="text-xs font-medium text-slate-300">{log.userId}</p>
                          <p className="text-[9px] text-slate-500 capitalize">{log.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.targetId ? (
                        <div>
                          <p className="text-xs text-slate-300">{log.targetModel}</p>
                          <p className="text-[9px] text-slate-500">{log.targetId}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-400 font-mono">{log.ipAddress}</p>
                      <p className="text-[9px] text-slate-500 line-clamp-1" title={log.userAgent}>
                        {log.userAgent?.split(" ")[0]}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 p-4">
            <span className="text-xs text-slate-500">
              Showing page {page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
