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
    if (logStatus === "failure") return "bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]";
    if (logStatus === "success") return "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]";
    return "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]";
  };

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b192c]">Activity Logs</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Comprehensive audit trail of platform events.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] bg-white p-4">
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                placeholder="Search user ID or IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-4 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition placeholder:text-[#94a3b8] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
              />
            </div>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-8 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-6 py-3.5">Event</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5">IP & Location</th>
                <th className="px-6 py-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-7 w-7 animate-spin text-[#ea580c]" />
                      <p className="text-xs font-medium text-[#64748b]">Loading audit logs...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.logs?.length ? (
                data.logs.map((log: any) => (
                  <tr key={log.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${getActionColor(log.status)}`}
                        >
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0b192c]">{log.action}</p>
                          <p className="text-[11px] font-medium text-[#64748b] line-clamp-1">
                            {log.details ? JSON.stringify(log.details) : "No details"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {log.role === "admin" && <Shield className="h-3.5 w-3.5 text-[#ea580c]" />}
                        <div>
                          <p className="text-xs font-semibold text-[#0b192c]">{log.userId || "System"}</p>
                          <p className="text-[10px] font-medium text-[#64748b] capitalize">{log.role || "User"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.targetId ? (
                        <div>
                          <p className="text-xs font-semibold text-[#0b192c]">{log.targetModel || "Item"}</p>
                          <p className="text-[10px] font-mono text-[#64748b]">{log.targetId}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-[#94a3b8]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-mono font-medium text-[#0b192c]">{log.ipAddress || "-"}</p>
                      <p className="text-[10px] text-[#64748b] line-clamp-1" title={log.userAgent}>
                        {log.userAgent?.split(" ")[0] || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-medium text-[#64748b]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs font-medium text-[#64748b]">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
            <span className="text-xs font-medium text-[#64748b]">
              Showing page <strong className="text-[#0b192c]">{page}</strong> of <strong className="text-[#0b192c]">{data.pagination.pages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] disabled:opacity-40"
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
