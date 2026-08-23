import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAdminBackupStatus,
  runAdminBackupNow,
  getAdminBackupDownloadUrl,
  deleteAdminBackup,
} from "@/lib/admin-api";
import {
  Database,
  CloudUpload,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  HardDrive,
  Loader2,
  AlertTriangle,
  Calendar,
  FileArchive,
  Zap,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/backup")({
  component: BackupPage,
  head: () => ({ meta: [{ title: "Database Backups & R2 Storage | WebMintra Admin" }] }),
});

function formatBytes(kb: number): string {
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function BackupPage() {
  const queryClient = useQueryClient();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["adminBackupStatus"],
    queryFn: getAdminBackupStatus,
    refetchInterval: 30000,
  });

  const runBackupMutation = useMutation({
    mutationFn: runAdminBackupNow,
    onSuccess: (res) => {
      toast.success(
        `Backup complete! ${res.totalDocuments.toLocaleString()} documents saved (${res.compressedSizeKb} KB)`,
      );
      queryClient.invalidateQueries({ queryKey: ["adminBackupStatus"] });
    },
    onError: (err: any) => toast.error(err.message || "Backup failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminBackup,
    onSuccess: () => {
      toast.success("Backup deleted.");
      queryClient.invalidateQueries({ queryKey: ["adminBackupStatus"] });
    },
    onError: (err: any) => toast.error(err.message || "Delete failed."),
  });

  async function handleDownload(key: string) {
    setDownloadingKey(key);
    try {
      const { url } = await getAdminBackupDownloadUrl(key);
      const a = document.createElement("a");
      a.href = url;
      a.download = key.split("/").pop() || "backup.json.gz";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started! Link expires in 1 hour.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate download link.");
    } finally {
      setDownloadingKey(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 lg:p-8 space-y-8">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <CloudUpload className="h-4 w-4 text-[#ea580c]" /> Cloudflare R2 · Automated Backups
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-1 flex items-center gap-2.5">
            <Database className="h-7 w-7 text-[#059669]" /> Database Backup Center
          </h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Encrypted daily snapshots of all MongoDB collections streamed to{" "}
            <strong>Cloudflare R2</strong>. Auto-purges after 30 days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetch();
              toast.success("Refreshed.");
            }}
            disabled={isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-bold text-[#0f172a] shadow-2xs hover:bg-[#f8fafc] transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#059669] ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => runBackupMutation.mutate()}
            disabled={runBackupMutation.isPending || !data?.configured}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[#047857] disabled:opacity-50 transition cursor-pointer"
          >
            {runBackupMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Backing up...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" /> Backup Now
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669] mx-auto" />
          <p className="mt-3 text-sm font-bold text-[#64748b]">Loading backup status...</p>
        </div>
      ) : !data?.configured ? (
        /* R2 Not Configured Warning */
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-extrabold text-[#0f172a]">Cloudflare R2 Not Configured</h2>
          <p className="text-sm text-[#64748b] max-w-lg mx-auto">{data?.message}</p>
          <div className="text-left inline-block bg-white border border-amber-200 rounded-xl p-4 text-xs font-mono text-[#0f172a] space-y-1 shadow-xs">
            <p className="text-amber-600 font-bold mb-2"># Add these to your backend/.env:</p>
            <p>
              R2_ACCOUNT_ID=<span className="text-[#059669]">your_cloudflare_account_id</span>
            </p>
            <p>
              R2_ACCESS_KEY_ID=<span className="text-[#059669]">your_r2_access_key</span>
            </p>
            <p>
              R2_SECRET_ACCESS_KEY=<span className="text-[#059669]">your_r2_secret</span>
            </p>
            <p>
              R2_BUCKET_NAME=<span className="text-[#059669]">webmintra-backups</span>
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Status Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* R2 Status */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider">
                <Shield className="h-3.5 w-3.5 text-[#059669]" /> R2 Status
              </div>
              <div className="mt-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#059669]" />
                <span className="text-base font-extrabold text-[#059669]">Connected</span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-1 truncate">
                Bucket: <strong>{data.bucket}</strong>
              </p>
            </div>

            {/* Total Backups */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider">
                <FileArchive className="h-3.5 w-3.5 text-[#ea580c]" /> Total Backups
              </div>
              <div className="mt-3 text-3xl font-black text-[#0f172a]">{data.totalBackups}</div>
              <p className="text-[11px] text-[#64748b] mt-1">{data.retentionPolicy}</p>
            </div>

            {/* Last Backup */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-[#059669]" /> Last Backup
              </div>
              {data.lastBackup ? (
                <>
                  <div className="mt-3 text-base font-extrabold text-[#0f172a]">
                    {timeAgo(data.lastBackup.lastModified)}
                  </div>
                  <p className="text-[11px] text-[#64748b] mt-1">
                    {formatBytes(parseFloat(data.lastBackup.sizeKb))}
                  </p>
                </>
              ) : (
                <div className="mt-3 text-sm font-bold text-[#94a3b8]">No backups yet</div>
              )}
            </div>

            {/* Next Scheduled */}
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-[#059669]" /> Next Scheduled
              </div>
              <div className="mt-3 text-sm font-extrabold text-[#0f172a]">Daily at 2:00 AM IST</div>
              <p className="text-[11px] text-[#64748b] mt-1">Automatic via cron job</p>
            </div>
          </div>

          {/* ── Info Banner ──────────────────────────────────────── */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <strong>How backups work:</strong> Every day at 2:00 AM IST, all critical MongoDB
              collections (users, websites, subscriptions, payments, leads, domains, etc.) are
              dumped, gzip-compressed, and encrypted in transit to your Cloudflare R2 bucket.
              Backups are automatically pruned after 30 days to stay within R2 free limits. You'll
              receive a Gmail notification on success or failure.
            </div>
          </div>

          {/* ── Backup List Table ─────────────────────────────────── */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <h2 className="text-sm font-extrabold text-[#0f172a] flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[#059669]" /> Stored Backups ({data.totalBackups}
                )
              </h2>
              <span className="text-[11px] font-bold text-[#94a3b8]">
                Stored in Cloudflare R2 · {data.bucket}
              </span>
            </div>

            {data.backups.length === 0 ? (
              <div className="py-16 text-center">
                <FileArchive className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#0f172a]">No backups yet</p>
                <p className="text-xs text-[#64748b] mt-1">
                  Click "Backup Now" above to create your first backup instantly.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#f8fafc] text-[#64748b]">
                    <tr>
                      <th className="text-left font-extrabold uppercase tracking-wide px-6 py-3">
                        Backup File
                      </th>
                      <th className="text-left font-extrabold uppercase tracking-wide px-4 py-3">
                        Date & Time
                      </th>
                      <th className="text-left font-extrabold uppercase tracking-wide px-4 py-3">
                        Size
                      </th>
                      <th className="text-right font-extrabold uppercase tracking-wide px-6 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {data.backups.map((backup: any, idx: number) => (
                      <tr
                        key={backup.key}
                        className={`hover:bg-[#fafcfb] transition ${idx === 0 ? "bg-[#ecfdf5]/50" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <FileArchive className="h-4 w-4 text-[#ea580c] shrink-0" />
                            <div>
                              <p className="font-bold text-[#0f172a] font-mono text-[11px]">
                                {backup.filename}
                              </p>
                              {idx === 0 && (
                                <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-[#059669] px-2 py-0.2 text-[9px] font-extrabold text-white">
                                  Latest
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#334155] font-semibold">
                          <div>
                            {new Date(backup.lastModified).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[#94a3b8] text-[10px]">
                            {timeAgo(backup.lastModified)}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-[#0f172a]">
                          {formatBytes(parseFloat(backup.sizeKb))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownload(backup.key)}
                              disabled={downloadingKey === backup.key}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#0f172a] hover:bg-[#f8fafc] transition cursor-pointer disabled:opacity-50"
                            >
                              {downloadingKey === backup.key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              Download
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Delete this backup permanently from R2?")) {
                                  deleteMutation.mutate(backup.key);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Backup"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
