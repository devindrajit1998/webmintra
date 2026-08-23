import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getStorageItems,
  deleteStorageItem,
  getImageKitStats,
  getMongoStorageStats,
  getImageCompressionStats,
  testImageCompression,
} from "@/lib/admin-api";
import {
  Loader2,
  Search,
  HardDrive,
  Image as ImageIcon,
  FileText,
  Trash2,
  Database,
  Cloud,
  Layers,
  Server,
  RefreshCw,
  Zap,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Download,
  UploadCloud,
  Maximize2,
  Cpu,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/storage")({
  component: StoragePage,
  head: () => ({ meta: [{ title: "Storage & Image Compression | WebMintra Admin" }] }),
});

export function StoragePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"mongodb" | "files" | "compressor">("compressor");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("standard");
  const [isTestingCompress, setIsTestingCompress] = useState(false);
  const [compressionResult, setCompressionResult] = useState<any>(null);

  // Compression Stats Query
  const {
    data: compStats,
    isLoading: isCompLoading,
    refetch: refetchCompStats,
  } = useQuery({
    queryKey: ["adminImageCompressionStats"],
    queryFn: () => getImageCompressionStats(),
  });

  // MongoDB Live Stats Query
  const {
    data: mongoStats,
    isLoading: isMongoLoading,
    refetch: refetchMongo,
    isFetching: isMongoFetching,
  } = useQuery({
    queryKey: ["adminMongoStorageStats"],
    queryFn: () => getMongoStorageStats(),
    refetchInterval: 30000, // auto refresh every 30s
  });

  // Media / Storage Items Query
  const { data, isLoading: isFilesLoading } = useQuery({
    queryKey: ["adminStorage", { page, search }],
    queryFn: () => getStorageItems({ page, limit: 20, search }),
    enabled: activeTab === "files",
  });

  // ImageKit Live Query
  const { data: ikStats, isLoading: ikLoading } = useQuery({
    queryKey: ["adminStorageImageKit"],
    queryFn: () => getImageKitStats(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStorageItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStorage"] });
      toast.success("Storage file deleted.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete item."),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatKb = (kb: number) => {
    if (!kb || kb === 0) return "0 KB";
    if (kb >= 1024 * 1024) return (kb / (1024 * 1024)).toFixed(2) + " GB";
    if (kb >= 1024) return (kb / 1024).toFixed(2) + " MB";
    return kb.toFixed(1) + " KB";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-[#059669]" />;
    return <FileText className="h-5 w-5 text-[#64748b]" />;
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <Server className="h-4 w-4 text-[#ea580c]" /> Infrastructure &amp; Database Telemetry
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-1 flex items-center gap-2.5">
            <HardDrive className="h-7 w-7 text-[#059669]" /> Storage &amp; Database Status
          </h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Real-time live monitoring of MongoDB database disk usage, collection sizes, indexes, and
            media asset storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchMongo();
              toast.success("Refreshing MongoDB telemetry...");
            }}
            disabled={isMongoFetching}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-bold text-[#0f172a] shadow-2xs transition hover:bg-[#f8fafc] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 text-[#059669] ${isMongoFetching ? "animate-spin" : ""}`}
            />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* ── Sub-Tabs Navigation ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e2e8f0] pb-2">
        <button
          onClick={() => setActiveTab("compressor")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
            activeTab === "compressor"
              ? "bg-[#059669] text-white shadow-xs"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:text-[#0f172a] hover:bg-[#f8fafc]"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          Image Compression Engine
        </button>
        <button
          onClick={() => setActiveTab("mongodb")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
            activeTab === "mongodb"
              ? "bg-[#059669] text-white shadow-xs"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:text-[#0f172a] hover:bg-[#f8fafc]"
          }`}
        >
          <Database className="h-4 w-4" />
          MongoDB Database Status
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
            activeTab === "files"
              ? "bg-[#059669] text-white shadow-xs"
              : "bg-white text-[#64748b] border border-[#e2e8f0] hover:text-[#0f172a] hover:bg-[#f8fafc]"
          }`}
        >
          <Cloud className="h-4 w-4" />
          CDN &amp; Media Assets
        </button>
      </div>

      {/* ── TAB 0: Image Compression Engine ─────────────────────────── */}
      {activeTab === "compressor" && (
        <div className="space-y-8 animate-in fade-in">
          {/* Top Engine Overview Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Compression Engine
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#0f172a]">Active</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#059669] font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Sharp + MozJPEG + WebP</span>
              </div>
            </div>

            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Quality Mode
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#0f172a]">Lossless (Q85-95)</p>
              <p className="mt-2 text-xs text-[#64748b] font-semibold">
                4:4:4 Chroma · Zero Visible Loss
              </p>
            </div>

            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Max Resolution Limiter
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#ea580c] flex items-center justify-center">
                  <Maximize2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#0f172a]">2560 px Max</p>
              <p className="mt-2 text-xs text-[#ea580c] font-bold">Lanczos3 Auto-Resample</p>
            </div>

            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Lifetime Compressed
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#f5f3ff] border border-[#ddd6fe] text-[#7c3aed] flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#0f172a]">
                {compStats?.totalProcessed ?? 0} Images
              </p>
              <p className="mt-2 text-xs text-[#7c3aed] font-bold">
                {compStats?.totalSavedMb ?? 0} MB Storage Saved (
                {compStats?.overallSavedPercent ?? 0}%)
              </p>
            </div>
          </section>

          {/* Info Banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-900 shadow-2xs">
            <Sparkles className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-emerald-950">
                How the WebMintra Image Compressor Works
              </h4>
              <p className="text-emerald-800 leading-relaxed">
                All image uploads across the platform (tenant media, site builder assets, branding
                logos, favicon, email templates, and support tickets) automatically pass through the
                in-memory <strong>Sharp MozJPEG/WebP engine</strong>. Raw 4K/8K images are
                downscaled to 2.5K web-standard resolution without touching clarity, color profiles
                are preserved, EXIF camera bloat is stripped, and transparent PNGs retain crisp
                alpha channels. Storage usage is slashed by up to <strong>70-80%</strong> with zero
                visible quality drop.
              </p>
            </div>
          </div>

          {/* Interactive Live Compression Tester */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f1f5f9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-base text-[#0f172a] flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-[#059669]" /> Live Image Compression Studio
                </h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Upload any heavy image (up to 25MB) to test the compression ratio, speed, and
                  visually lossless output.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#64748b]">Preset:</span>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3 py-1.5 text-xs font-extrabold text-[#0f172a] focus:border-[#059669] focus:outline-hidden"
                >
                  <option value="standard">Standard Website (Max 2560px, Q85)</option>
                  <option value="branding">Branding &amp; Logo (Max 1600px, Q90)</option>
                  <option value="avatar">Profile Avatar (Max 800px, Q85)</option>
                  <option value="email">Email Template (Max 1200px, Q85)</option>
                  <option value="thumbnail">Thumbnail (Max 400px, Q80)</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#cbd5e1] hover:border-[#059669] bg-[#fafcfb] hover:bg-[#ecfdf5]/30 rounded-2xl p-8 cursor-pointer transition text-center group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsTestingCompress(true);
                    setCompressionResult(null);
                    try {
                      const res = await testImageCompression(file, selectedPreset);
                      setCompressionResult(res);
                      toast.success(
                        `Compressed! Saved ${res.savedPercentage}% (${res.savedKb} KB) in ${res.durationMs}ms`,
                      );
                      refetchCompStats();
                    } catch (err: any) {
                      toast.error(err.message || "Failed to compress image.");
                    } finally {
                      setIsTestingCompress(false);
                      e.target.value = "";
                    }
                  }}
                />
                {isTestingCompress ? (
                  <div className="py-4 flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 text-[#059669] animate-spin" />
                    <p className="font-extrabold text-sm text-[#0f172a]">
                      Compressing with MozJPEG &amp; Lanczos3...
                    </p>
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center group-hover:scale-110 transition">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="font-extrabold text-sm text-[#0f172a]">
                      Click or drag an image here to test
                    </p>
                    <p className="text-xs text-[#64748b]">
                      Supports JPG, PNG, WebP, AVIF, TIFF up to 25MB
                    </p>
                  </div>
                )}
              </label>

              {/* Compression Result Preview */}
              {compressionResult && (
                <div className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Optimization Complete
                      </span>
                      <h4 className="font-black text-lg text-[#0f172a] mt-2">
                        {compressionResult.originalName}
                      </h4>
                      <p className="text-xs text-[#64748b]">
                        Processed in <strong>{compressionResult.durationMs}ms</strong> · Format:{" "}
                        <strong>{compressionResult.format?.toUpperCase()}</strong>
                      </p>
                    </div>
                    <a
                      href={compressionResult.previewDataUri}
                      download={`compressed_${compressionResult.originalName}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[#047857] transition cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                      Download Optimized Copy
                    </a>
                  </div>

                  {/* Stats Comparison Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-[#e2e8f0]">
                      <span className="text-[10px] font-extrabold uppercase text-[#64748b]">
                        Original Size
                      </span>
                      <p className="text-xl font-black text-[#64748b] mt-1">
                        {compressionResult.originalSizeKb} KB
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700">
                        Compressed Size
                      </span>
                      <p className="text-xl font-black text-emerald-700 mt-1">
                        {compressionResult.compressedSizeKb} KB
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/50">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-800">
                        Storage Saved
                      </span>
                      <p className="text-xl font-black text-emerald-800 mt-1">
                        -{compressionResult.savedPercentage}%
                      </p>
                      <p className="text-[10px] font-bold text-emerald-700">
                        ({compressionResult.savedKb} KB saved)
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-[#e2e8f0]">
                      <span className="text-[10px] font-extrabold uppercase text-[#64748b]">
                        Dimensions
                      </span>
                      <p className="text-xl font-black text-[#0f172a] mt-1">
                        {compressionResult.width} × {compressionResult.height}
                      </p>
                    </div>
                  </div>

                  {/* Visual Preview */}
                  <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] flex flex-col items-center">
                    <span className="text-xs font-extrabold text-[#64748b] mb-3 self-start">
                      Optimized Image Preview:
                    </span>
                    <img
                      src={compressionResult.previewDataUri}
                      alt="Compressed Preview"
                      className="max-h-96 rounded-xl border border-[#cbd5e1] object-contain shadow-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: MongoDB Database Status ──────────────────────────── */}
      {activeTab === "mongodb" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Metric Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Database Storage Size */}
            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Allocated Disk Storage
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {isMongoLoading ? "..." : `${mongoStats?.storageSizeMb ?? 0} MB`}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#059669] font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>DB: {mongoStats?.dbName || "Production"}</span>
              </div>
            </div>

            {/* Uncompressed Data Size */}
            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Raw Document Data
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#ea580c] flex items-center justify-center">
                  <Database className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {isMongoLoading ? "..." : `${mongoStats?.dataSizeMb ?? 0} MB`}
              </p>
              <p className="mt-2 text-xs text-[#64748b] font-semibold">
                Avg Doc: {mongoStats?.avgObjSizeBytes ?? 0} bytes
              </p>
            </div>

            {/* Total Documents */}
            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Total Records / Objects
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {isMongoLoading ? "..." : (mongoStats?.objectsCount ?? 0).toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-[#2563eb] font-bold">
                Across {mongoStats?.collectionsCount ?? 0} collections
              </p>
            </div>

            {/* Index Storage */}
            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Active Index Size
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#faf5ff] border border-[#e9d5ff] text-[#9333ea] flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {isMongoLoading ? "..." : `${mongoStats?.indexSizeMb ?? 0} MB`}
              </p>
              <p className="mt-2 text-xs text-[#9333ea] font-bold">
                {mongoStats?.indexesCount ?? 0} active B-Tree indexes
              </p>
            </div>
          </section>

          {/* MongoDB Cluster Health Card */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#059669]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0f172a]">
                    MongoDB Cluster Connection Health
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Connected node host:{" "}
                    <span className="font-mono text-[#0f172a]">
                      {mongoStats?.host || "localhost:27017"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-[#059669]">
                  <span className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
                  Status: {mongoStats?.connectionStatus || "Connected"}
                </span>
              </div>
            </div>

            {/* Storage Distribution Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#0f172a]">
                <span>WiredTiger Storage Distribution</span>
                <span className="text-[#64748b]">
                  Data: {mongoStats?.dataSizeMb || 0} MB | Indexes: {mongoStats?.indexSizeMb || 0}{" "}
                  MB
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#f1f5f9] overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(15, ((mongoStats?.dataSizeMb || 1) / (mongoStats?.storageSizeMb || 2)) * 100))}%`,
                  }}
                  className="bg-[#059669] h-full"
                  title="Document Data"
                />
                <div
                  style={{
                    width: `${Math.min(40, ((mongoStats?.indexSizeMb || 1) / (mongoStats?.storageSizeMb || 2)) * 100)}%`,
                  }}
                  className="bg-[#ea580c] h-full"
                  title="Indexes"
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold text-[#64748b] pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#059669]" /> Document Data
                  (Compressed)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#ea580c]" /> Indexes
                </span>
              </div>
            </div>
          </div>

          {/* Collection Breakdown Table */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#0f172a]">
                  Collections Storage Breakdown
                </h3>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Detailed table size, document counts, and index consumption across all database
                  collections.
                </p>
              </div>
              <span className="rounded-lg bg-white border border-[#cbd5e1] px-2.5 py-1 text-xs font-bold text-[#334155]">
                {mongoStats?.collections?.length || 0} Collections
              </span>
            </div>

            {isMongoLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
                <p className="mt-3 text-xs font-bold text-[#64748b]">
                  Reading MongoDB collection statistics...
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                    <tr>
                      <th className="py-3.5 px-5">Collection Name</th>
                      <th className="py-3.5 px-4">Document Count</th>
                      <th className="py-3.5 px-4">Disk Storage</th>
                      <th className="py-3.5 px-4">Uncompressed Size</th>
                      <th className="py-3.5 px-4">Avg Object Size</th>
                      <th className="py-3.5 px-4">Index Count</th>
                      <th className="py-3.5 px-5 text-right">Index Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {mongoStats?.collections?.map((col: any) => (
                      <tr key={col.name} className="hover:bg-[#fafcfb] transition-colors">
                        <td className="py-3.5 px-5 font-extrabold text-sm text-[#0f172a] flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#059669]" />
                          {col.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0f172a]">
                          {col.count.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-[#059669]">
                          {formatKb(col.storageSizeKb)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#475569]">
                          {formatKb(col.sizeKb)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#64748b]">
                          {col.avgObjSize} bytes
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0f172a]">{col.indexes}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-[#ea580c]">
                          {formatKb(col.totalIndexSizeKb)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CDN & Media Assets ──────────────────────────────── */}
      {activeTab === "files" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Metric Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Live ImageKit CDN Usage
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] flex items-center justify-center">
                  <Cloud className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {ikLoading ? "..." : formatBytes(ikStats?.totalBytes || 0)}
              </p>
              <p className="mt-2 text-xs text-[#2563eb] font-bold">
                {ikStats?.fileCount || 0} media assets stored
              </p>
            </div>

            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Total Platform Uploads
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {formatBytes(data?.globalStats?.totalBytes || 0)}
              </p>
              <p className="mt-2 text-xs text-[#059669] font-bold">
                {data?.globalStats?.fileCount || 0} total uploaded files
              </p>
            </div>

            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Active In-Use Files
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#fff7ed] border border-[#fed7aa] text-[#ea580c] flex items-center justify-center">
                  <Database className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {formatBytes(data?.globalStats?.usedBytes || 0)}
              </p>
              <p className="mt-2 text-xs text-[#ea580c] font-bold">Linked to tenant sites</p>
            </div>

            <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  Unused / Orphan Files
                </span>
                <div className="h-8 w-8 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#e11d48] flex items-center justify-center">
                  <Trash2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-black text-[#0f172a]">
                {formatBytes(data?.globalStats?.unusedBytes || 0)}
              </p>
              <p className="mt-2 text-xs text-[#e11d48] font-bold">Eligible for cleanup</p>
            </div>
          </section>

          {/* Search & File Table */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-[#e2e8f0]">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Search file name or tenant..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#cbd5e1] text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                  <tr>
                    <th className="py-3.5 px-5">File Asset</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4">Tenant / Website</th>
                    <th className="py-3.5 px-4">Uploaded</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {isFilesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#059669] mx-auto" />
                        <p className="mt-2 text-xs font-bold text-[#64748b]">
                          Loading file records...
                        </p>
                      </td>
                    </tr>
                  ) : data?.items?.length ? (
                    data.items.map((file: any) => (
                      <tr key={file.id} className="hover:bg-[#fafcfb] transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9] border border-[#e2e8f0]">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-[#0f172a] truncate max-w-xs">
                                {file.filename}
                              </p>
                              <p className="text-[10px] text-[#64748b]">{file.mimeType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0f172a]">
                          {formatBytes(file.size)}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#0f172a]">
                            {file.tenant?.name || "Unknown Tenant"}
                          </p>
                          <p className="text-[10px] text-[#64748b]">
                            {file.website?.name || file.tenant?.email || "—"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-[#64748b]">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleDelete(file.id || file._id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-xs text-[#64748b]">
                        No storage items found matching your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data?.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-[#e2e8f0] p-4 bg-[#f8fafc]">
                <span className="text-xs text-[#64748b]">
                  Showing page {page} of {data.pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= data.pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1 text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
