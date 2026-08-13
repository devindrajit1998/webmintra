import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Download,
  File,
  FileText,
  Grid2X2,
  HardDrive,
  Image as ImageIcon,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/components/TenantDashboard";
import {
  deleteWebsiteAsset,
  getWebsiteAssets,
  uploadWebsiteImage,
  type MediaAsset,
} from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/media")({
  component: MediaPage,
  head: () => ({ meta: [{ title: "Media Library | WebMintra" }] }),
});

type AssetFilter = "all" | MediaAsset["mediaType"];
type ViewMode = "grid" | "list";

function MediaPage() {
  const { websites, dashboard } = useTenantContext();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MediaAsset | null>(null);
  const activeWebsiteId = selectedWebsiteId || websites[0]?.id || "";

  const assetsQuery = useQuery({
    queryKey: ["website-assets", activeWebsiteId],
    queryFn: () => getWebsiteAssets(activeWebsiteId),
    enabled: Boolean(activeWebsiteId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadWebsiteImage(activeWebsiteId, file);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-assets", activeWebsiteId] });
      toast.success("Media uploaded successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (asset: MediaAsset) => deleteWebsiteAsset(activeWebsiteId, asset._id),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["website-assets", activeWebsiteId] });
      toast.success("Media deleted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assets = assetsQuery.data?.assets ?? [];
  const visibleAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesType = filter === "all" || asset.mediaType === filter;
      const matchesSearch = !term || `${asset.originalName} ${asset.filename} ${asset.alt}`.toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [assets, filter, search]);

  const totalBytes = assets.reduce((total, asset) => total + asset.size, 0);
  const storageLimitBytes = (dashboard?.account.limits.storage ?? 1) * 1024 * 1024 * 1024;
  const storagePercent = Math.min((totalBytes / storageLimitBytes) * 100, 100);

  const uploadFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => file.size > 0);
    if (!accepted.length || !activeWebsiteId) return;
    uploadMutation.mutate(accepted);
  };

  if (!websites.length) {
    return <EmptyWorkspace />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Media library</h1>
          <p className="mt-2 text-sm text-slate-400">Upload and reuse images, videos, and documents across your website.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select website"
            value={activeWebsiteId}
            onChange={(event) => setSelectedWebsiteId(event.target.value)}
            className="h-10 min-w-44 rounded-lg border border-slate-700 bg-[#0b1826] px-3 text-xs text-slate-200 outline-none transition focus:border-cyan-400"
          >
            {websites.map((website) => <option key={website.id} value={website.id}>{website.name}</option>)}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={(event) => {
              if (event.target.files) uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadMutation.isPending ? "Uploading" : "Upload media"}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary icon={<HardDrive className="h-5 w-5" />} label="Storage used" value={formatBytes(totalBytes)} detail={`${Math.max(storagePercent, 0).toFixed(storagePercent < 1 ? 1 : 0)}% of ${dashboard?.account.limits.storage ?? 1} GB`} />
        <Summary icon={<ImageIcon className="h-5 w-5" />} label="Images" value={assets.filter((asset) => asset.mediaType === "image").length.toString()} detail="Image assets" />
        <Summary icon={<File className="h-5 w-5" />} label="Total files" value={assets.length.toString()} detail={`For ${websites.find((website) => website.id === activeWebsiteId)?.name ?? "website"}`} />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter media by type">
            {(["all", "image", "video", "document", "audio", "other"] as AssetFilter[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`rounded-md px-3 py-2 text-xs font-medium capitalize transition ${filter === type ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                {type === "all" ? `All files (${assets.length})` : type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media"
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/30 pl-9 pr-8 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
              {search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"><X className="h-3.5 w-3.5" /></button> : null}
            </label>
            <div className="flex rounded-lg border border-slate-700 p-0.5">
              <ViewButton label="Grid view" active={view === "grid"} onClick={() => setView("grid")} icon={<Grid2X2 className="h-4 w-4" />} />
              <ViewButton label="List view" active={view === "list"} onClick={() => setView("list")} icon={<LayoutList className="h-4 w-4" />} />
            </div>
          </div>
        </div>

        <div
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); uploadFiles(event.dataTransfer.files); }}
          className="relative min-h-96 p-4 sm:p-5"
        >
          {isDragging ? <div className="absolute inset-3 z-20 grid place-items-center rounded-lg border-2 border-dashed border-emerald-400 bg-[#0b1826]/95"><div className="text-center"><Upload className="mx-auto h-8 w-8 text-emerald-300" /><p className="mt-3 text-sm font-semibold">Drop files to upload</p></div></div> : null}
          {assetsQuery.isLoading ? <LoadingState /> : assetsQuery.isError ? <ErrorState message={(assetsQuery.error as Error).message} retry={() => assetsQuery.refetch()} /> : visibleAssets.length ? (
            view === "grid" ? <AssetGrid assets={visibleAssets} onDelete={setPendingDelete} /> : <AssetList assets={visibleAssets} onDelete={setPendingDelete} />
          ) : <EmptyLibrary hasAssets={assets.length > 0} onUpload={() => fileInputRef.current?.click()} />}
        </div>
      </section>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-media-title">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-[#0b1826] p-5 shadow-2xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10 text-red-300"><Trash2 className="h-5 w-5" /></span>
            <h2 id="delete-media-title" className="mt-4 font-display text-lg font-bold">Delete media?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{displayName(pendingDelete)} will be permanently removed. Existing pages using this file may show a broken link.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingDelete(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={() => deleteMutation.mutate(pendingDelete)} disabled={deleteMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-400 disabled:opacity-60">{deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <article className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-800 bg-[#0b1826] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">{icon}</span><div><p className="text-[11px] text-slate-500">{label}</p><p className="mt-0.5 font-display text-xl font-bold">{value}</p><p className="mt-0.5 text-[10px] text-slate-600">{detail}</p></div></article>;
}

function ViewButton({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`rounded-md p-2 transition ${active ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-200"}`}>{icon}</button>;
}

function AssetGrid({ assets, onDelete }: { assets: MediaAsset[]; onDelete: (asset: MediaAsset) => void }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{assets.map((asset) => <AssetTile key={asset._id} asset={asset} onDelete={() => onDelete(asset)} />)}</div>;
}

function AssetTile({ asset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  return <article className="group min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/20 transition hover:border-slate-600">
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
      <AssetPreview asset={asset} />
      <div className="absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-slate-950/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <AssetActions asset={asset} onDelete={onDelete} />
      </div>
    </div>
    <div className="p-3"><p className="truncate text-xs font-medium text-slate-200" title={displayName(asset)}>{displayName(asset)}</p><div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-500"><span className="capitalize">{asset.mediaType}</span><span>{formatBytes(asset.size)}</span></div></div>
  </article>;
}

function AssetList({ assets, onDelete }: { assets: MediaAsset[]; onDelete: (asset: MediaAsset) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500"><th className="pb-3 font-semibold">File</th><th className="pb-3 font-semibold">Type</th><th className="pb-3 font-semibold">Size</th><th className="pb-3 font-semibold">Uploaded</th><th className="pb-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-800/70">{assets.map((asset) => <tr key={asset._id} className="group"><td className="py-3 pr-4"><div className="flex items-center gap-3"><span className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-slate-900"><AssetPreview asset={asset} /></span><span className="min-w-0"><span className="block max-w-xs truncate text-xs font-medium text-slate-200">{displayName(asset)}</span><span className="mt-0.5 block max-w-xs truncate text-[10px] text-slate-600">{asset.mimeType || "Unknown format"}</span></span></div></td><td className="py-3 text-xs capitalize text-slate-400">{asset.mediaType}</td><td className="py-3 text-xs text-slate-400">{formatBytes(asset.size)}</td><td className="py-3 text-xs text-slate-400">{formatDate(asset.createdAt)}</td><td className="py-3"><div className="flex justify-end gap-1"><AssetActions asset={asset} onDelete={() => onDelete(asset)} /></div></td></tr>)}</tbody></table></div>;
}

function AssetPreview({ asset }: { asset: MediaAsset }) {
  if (asset.mediaType === "image") return <img src={asset.url} alt={asset.alt || displayName(asset)} loading="lazy" className="h-full w-full object-cover" />;
  const Icon = asset.mediaType === "video" ? Video : asset.mediaType === "document" ? FileText : File;
  return <span className="flex h-full w-full items-center justify-center text-slate-600"><Icon className="h-8 w-8" /></span>;
}

function AssetActions({ asset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyUrl = async () => {
    await navigator.clipboard.writeText(asset.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return <>
    <button type="button" onClick={copyUrl} title="Copy URL" aria-label={`Copy URL for ${displayName(asset)}`} className="rounded-md bg-slate-950/75 p-2 text-slate-300 hover:bg-slate-700 hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}</button>
    <a href={asset.url} download target="_blank" rel="noreferrer" title="Download" aria-label={`Download ${displayName(asset)}`} className="rounded-md bg-slate-950/75 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"><Download className="h-3.5 w-3.5" /></a>
    <button type="button" onClick={onDelete} title="Delete" aria-label={`Delete ${displayName(asset)}`} className="rounded-md bg-slate-950/75 p-2 text-slate-300 hover:bg-red-500 hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
  </>;
}

function LoadingState() {
  return <div className="grid min-h-80 place-items-center"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-300" /><p className="mt-3 text-xs text-slate-500">Loading media</p></div></div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="grid min-h-80 place-items-center text-center"><div><p className="text-sm font-semibold text-slate-200">Unable to load media</p><p className="mt-2 max-w-md text-xs text-slate-500">{message}</p><button type="button" onClick={retry} className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-800">Try again</button></div></div>;
}

function EmptyLibrary({ hasAssets, onUpload }: { hasAssets: boolean; onUpload: () => void }) {
  return <div className="grid min-h-80 place-items-center text-center"><div><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">{hasAssets ? <Search className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}</span><h2 className="mt-4 font-display text-base font-bold">{hasAssets ? "No matching media" : "Your media library is empty"}</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">{hasAssets ? "Adjust the search or file type filter." : "Upload files or drag them here to use them in your website."}</p>{!hasAssets ? <button type="button" onClick={onUpload} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"><Upload className="h-4 w-4" />Choose files</button> : null}</div></div>;
}

function EmptyWorkspace() {
  return <div className="grid min-h-[60vh] place-items-center rounded-xl border border-dashed border-slate-700 bg-[#0b1826]/60 text-center"><div><ImageIcon className="mx-auto h-10 w-10 text-slate-600" /><h1 className="mt-4 font-display text-xl font-bold">Create a website first</h1><p className="mt-2 text-sm text-slate-500">Media is organized by website in your workspace.</p></div></div>;
}

function displayName(asset: MediaAsset) {
  return asset.originalName || asset.filename || "Untitled media";
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
