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
  fetchMediaLibrary,
  uploadMediaItem,
  deleteMediaItem,
  type MediaLibraryItem,
} from "@/lib/media-api";

export type MediaAsset = MediaLibraryItem;

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
    queryFn: () => fetchMediaLibrary({ websiteId: activeWebsiteId, limit: 100 }),
    enabled: Boolean(activeWebsiteId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) await uploadMediaItem(file, { websiteId: activeWebsiteId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["website-assets", activeWebsiteId] });
      toast.success("Media uploaded and optimized successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (asset: MediaAsset) => deleteMediaItem(asset.id),
    onSuccess: async () => {
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["website-assets", activeWebsiteId] });
      toast.success("Media deleted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assets = useMemo(() => assetsQuery.data?.items ?? [], [assetsQuery.data?.items]);
  const visibleAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesType = filter === "all" || asset.mediaType === filter;
      const matchesSearch =
        !term ||
        `${asset.originalName} ${asset.filename} ${asset.alt}`.toLowerCase().includes(term);
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
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
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
              <ImageIcon className="h-3.5 w-3.5" /> Media & Assets
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Media Library
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Upload, optimize, and reuse images, videos, and documents across your website.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Select website"
              value={activeWebsiteId}
              onChange={(event) => setSelectedWebsiteId(event.target.value)}
              className="h-10 min-w-44 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs font-bold text-[#0f172a] outline-none transition focus:border-[#059669] cursor-pointer"
            >
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name}
                </option>
              ))}
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
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploadMutation.isPending ? "Uploading..." : "Upload Media"}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Summary
          icon={<HardDrive className="h-5 w-5" />}
          label="Storage used"
          value={formatBytes(totalBytes)}
          detail={`${Math.max(storagePercent, 0).toFixed(storagePercent < 1 ? 1 : 0)}% of ${dashboard?.account.limits.storage ?? 1} GB`}
        />
        <Summary
          icon={<ImageIcon className="h-5 w-5" />}
          label="Images"
          value={assets.filter((asset) => asset.mediaType === "image").length.toString()}
          detail="Image assets"
        />
        <Summary
          icon={<File className="h-5 w-5" />}
          label="Total files"
          value={assets.length.toString()}
          detail={`For ${websites.find((website) => website.id === activeWebsiteId)?.name ?? "website"}`}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-[#f1f5f9] p-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between bg-[#f8fafc]">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter media by type">
            {(["all", "image", "video", "document", "audio", "other"] as AssetFilter[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(type)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition cursor-pointer ${
                    filter === type
                      ? "bg-[#059669] text-white shadow-xs"
                      : "bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a]"
                  }`}
                >
                  {type === "all" ? `All files (${assets.length})` : type}
                </button>
              ),
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media files..."
                className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white pl-10 pr-8 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669] transition"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#0f172a] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
            <div className="flex rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-2xs">
              <ViewButton
                label="Grid view"
                active={view === "grid"}
                onClick={() => setView("grid")}
                icon={<Grid2X2 className="h-4 w-4" />}
              />
              <ViewButton
                label="List view"
                active={view === "list"}
                onClick={() => setView("list")}
                icon={<LayoutList className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            uploadFiles(event.dataTransfer.files);
          }}
          className="relative min-h-96 p-6"
        >
          {isDragging ? (
            <div className="absolute inset-4 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-[#059669] bg-[#ecfdf5]/95 backdrop-blur-xs">
              <div className="text-center">
                <Upload className="mx-auto h-10 w-10 text-[#059669] animate-bounce" />
                <p className="mt-3 text-sm font-extrabold text-[#065f46]">
                  Drop files here to upload
                </p>
              </div>
            </div>
          ) : null}
          {assetsQuery.isLoading ? (
            <LoadingState />
          ) : assetsQuery.isError ? (
            <ErrorState
              message={(assetsQuery.error as Error).message}
              retry={() => assetsQuery.refetch()}
            />
          ) : visibleAssets.length ? (
            view === "grid" ? (
              <AssetGrid assets={visibleAssets} onDelete={setPendingDelete} />
            ) : (
              <AssetList assets={visibleAssets} onDelete={setPendingDelete} />
            )
          ) : (
            <EmptyLibrary
              hasAssets={assets.length > 0}
              onUpload={() => fileInputRef.current?.click()}
            />
          )}
        </div>
      </section>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-media-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#e11d48]">
              <Trash2 className="h-5 w-5" />
            </span>
            <h2
              id="delete-media-title"
              className="mt-4 font-display text-base font-extrabold text-[#0f172a]"
            >
              Delete media?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#64748b]">
              "{displayName(pendingDelete)}" will be permanently removed. Existing pages using this
              file may show a broken image.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(pendingDelete)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#e11d48] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#be123c] disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Media
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] shadow-2xs">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#64748b]">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-black text-[#0f172a]">{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-[#94a3b8]">{detail}</p>
      </div>
    </article>
  );
}

function ViewButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition cursor-pointer ${
        active
          ? "bg-[#059669] text-white shadow-2xs"
          : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]"
      }`}
    >
      {icon}
    </button>
  );
}

function AssetGrid({
  assets,
  onDelete,
}: {
  assets: MediaAsset[];
  onDelete: (asset: MediaAsset) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {assets.map((asset) => (
        <AssetTile key={asset._id} asset={asset} onDelete={() => onDelete(asset)} />
      ))}
    </div>
  );
}

function AssetTile({ asset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white transition hover:border-[#059669] hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f8fafc] border-b border-[#f1f5f9]">
        <AssetPreview asset={asset} />
        <div className="absolute inset-x-0 top-0 flex justify-end gap-1.5 bg-gradient-to-b from-[#0f172a]/70 to-transparent p-2.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <AssetActions asset={asset} onDelete={onDelete} />
        </div>
      </div>
      <div className="p-3.5">
        <p className="truncate text-xs font-bold text-[#0f172a]" title={displayName(asset)}>
          {displayName(asset)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#64748b]">
          <span className="capitalize">{asset.mediaType}</span>
          <span>{formatBytes(asset.size)}</span>
        </div>
      </div>
    </article>
  );
}

function AssetList({
  assets,
  onDelete,
}: {
  assets: MediaAsset[];
  onDelete: (asset: MediaAsset) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead>
          <tr className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
            <th className="px-5 py-3.5">File</th>
            <th className="px-5 py-3.5">Type</th>
            <th className="px-5 py-3.5">Size</th>
            <th className="px-5 py-3.5">Uploaded</th>
            <th className="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f5f9]">
          {assets.map((asset) => (
            <tr key={asset._id} className="group hover:bg-[#f8fafc] transition">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
                    <AssetPreview asset={asset} />
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-xs truncate text-xs font-bold text-[#0f172a]">
                      {displayName(asset)}
                    </span>
                    <span className="mt-0.5 block max-w-xs truncate text-[10px] font-medium text-[#64748b]">
                      {asset.mimeType || "Unknown format"}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-5 py-3.5 text-xs font-semibold capitalize text-[#64748b]">
                {asset.mediaType}
              </td>
              <td className="px-5 py-3.5 text-xs font-bold text-[#0f172a]">
                {formatBytes(asset.size)}
              </td>
              <td className="px-5 py-3.5 text-xs font-medium text-[#64748b]">
                {formatDate(asset.createdAt)}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex justify-end gap-1.5">
                  <AssetActions asset={asset} onDelete={() => onDelete(asset)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssetPreview({ asset }: { asset: MediaAsset }) {
  if (asset.mediaType === "image")
    return (
      <img
        src={asset.url}
        alt={asset.alt || displayName(asset)}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  const Icon =
    asset.mediaType === "video" ? Video : asset.mediaType === "document" ? FileText : File;
  return (
    <span className="flex h-full w-full items-center justify-center text-[#94a3b8]">
      <Icon className="h-6 w-6" />
    </span>
  );
}

function AssetActions({ asset, onDelete }: { asset: MediaAsset; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyUrl = async () => {
    await navigator.clipboard.writeText(asset.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <>
      <button
        type="button"
        onClick={copyUrl}
        title="Copy URL"
        aria-label={`Copy URL for ${displayName(asset)}`}
        className="rounded-lg bg-white/90 p-1.5 text-[#0f172a] shadow-xs hover:bg-white hover:text-[#059669] cursor-pointer transition"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[#059669]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      <a
        href={asset.url}
        download
        target="_blank"
        rel="noreferrer"
        title="Download"
        aria-label={`Download ${displayName(asset)}`}
        className="rounded-lg bg-white/90 p-1.5 text-[#0f172a] shadow-xs hover:bg-white hover:text-[#059669] cursor-pointer transition"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        aria-label={`Delete ${displayName(asset)}`}
        className="rounded-lg bg-white/90 p-1.5 text-[#e11d48] shadow-xs hover:bg-[#fff1f2] cursor-pointer transition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-80 place-items-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#059669]" />
        <p className="mt-3 text-xs font-semibold text-[#64748b]">Loading media files...</p>
      </div>
    </div>
  );
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center text-center">
      <div>
        <p className="text-sm font-extrabold text-[#0f172a]">Unable to load media</p>
        <p className="mt-1 max-w-md text-xs text-[#64748b]">{message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function EmptyLibrary({ hasAssets, onUpload }: { hasAssets: boolean; onUpload: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center text-center">
      <div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
          {hasAssets ? <Search className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
        </span>
        <h2 className="mt-4 font-display text-base font-extrabold text-[#0f172a]">
          {hasAssets ? "No matching media found" : "Your media library is empty"}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">
          {hasAssets
            ? "Try clearing your search keyword or switching file type filters."
            : "Upload images, banners, or documents or drag them here to use on your websites."}
        </p>
        {!hasAssets ? (
          <button
            type="button"
            onClick={onUpload}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyWorkspace() {
  return (
    <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center shadow-xs">
      <div>
        <ImageIcon className="mx-auto h-12 w-12 text-[#cbd5e1]" />
        <h1 className="mt-4 font-display text-lg font-extrabold text-[#0f172a]">
          Create a website first
        </h1>
        <p className="mt-1 text-xs text-[#64748b]">
          Media files and assets are organized per website in your workspace.
        </p>
      </div>
    </div>
  );
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
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
