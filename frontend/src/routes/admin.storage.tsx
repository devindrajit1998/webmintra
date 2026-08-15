import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getStorageItems, deleteStorageItem, getImageKitStats } from "@/lib/admin-api";
import {
  Loader2,
  Search,
  Filter,
  HardDrive,
  Image as ImageIcon,
  FileText,
  Trash2,
  Database,
  AlertCircle,
  Cloud,
} from "lucide-react";

export const Route = createFileRoute("/admin/storage")({
  component: StoragePage,
});

function StoragePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminStorage", { page, search }],
    queryFn: () => getStorageItems({ page, limit: 20, search }),
  });

  const { data: ikStats, isLoading: ikLoading } = useQuery({
    queryKey: ["adminStorageImageKit"],
    queryFn: () => getImageKitStats(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStorageItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStorage"] });
    },
  });

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this file? This action cannot be undone and may break tenant websites if the file is in use.",
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-cyan-400" />;
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Storage Management</h1>
          <p className="mt-1 text-xs text-slate-500">
            Monitor and manage tenant file uploads and storage limits.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <article className="rounded-xl border border-indigo-900/50 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
              <Cloud className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] text-slate-500">Live ImageKit Usage</p>
              <div className="flex items-center gap-2">
                <p className="font-display text-xl font-bold text-indigo-400">
                  {ikLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  ) : (
                    formatBytes(ikStats?.totalBytes || 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] text-slate-500">Total Storage Used</p>
              <p className="font-display text-xl font-bold text-slate-200">
                {formatBytes(data?.globalStats?.totalBytes || 0)}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-slate-800 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] text-slate-500">Total Files</p>
              <p className="font-display text-xl font-bold text-slate-200">
                {data?.globalStats?.fileCount?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-rose-900/50 bg-[#0b1826] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-400/15 text-rose-300">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] text-slate-500">Unused Files</p>
              <p className="font-display text-xl font-bold text-rose-400">
                {data?.globalStats?.unusedBytes ? formatBytes(data.globalStats.unusedBytes) : 0}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search file name or tenant ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Uploaded</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      <p className="text-sm text-slate-500">Loading files...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.items?.length ? (
                data.items.map((file: any) => (
                  <tr key={file.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{file.filename}</p>
                          <p className="text-[10px] text-slate-500">{file.mimeType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{formatBytes(file.size)}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">
                        {file.tenant?.businessName || "Unknown"}
                      </p>
                      <p className="text-[10px] text-slate-500">{file.tenant?.id || "N/A"}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(file.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(file.id || file._id)}
                        disabled={deleteMutation.isPending}
                        className="text-slate-400 hover:text-rose-400 disabled:opacity-50"
                        title="Delete File"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No storage items found.
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
