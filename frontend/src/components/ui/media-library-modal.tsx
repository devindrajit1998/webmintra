import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMediaLibrary,
  uploadMediaItem,
  deleteMediaItem,
  type MediaLibraryItem,
} from "@/lib/media-api";
import {
  X,
  Search,
  UploadCloud,
  ImageIcon,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  Link2,
  HardDrive,
  Maximize2,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item?: MediaLibraryItem) => void;
  title?: string;
  initialSelectedUrl?: string;
  websiteId?: string;
  aspectRatioHint?: string;
}

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  title = "Select or Upload Image",
  initialSelectedUrl = "",
  websiteId,
  aspectRatioHint,
}: MediaLibraryModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"library" | "upload" | "url">("library");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaLibraryItem | null>(null);
  const [customUrl, setCustomUrl] = useState(initialSelectedUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");

  // Fetch Media Library items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mediaLibrary", { search, websiteId }],
    queryFn: () => fetchMediaLibrary({ search, websiteId, mediaType: "image", limit: 60 }),
    enabled: isOpen,
    staleTime: 10000,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadMediaItem(file, { websiteId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["mediaLibrary"] });
      setSelectedItem(res.item);
      setActiveTab("library");
      toast.success(
        `Uploaded & optimized! ${res.item.savedPercentage ? `Saved ${res.item.savedPercentage}% storage` : ""}`,
      );
    },
    onError: (err: any) => toast.error(err.message || "Failed to upload image."),
    onSettled: () => {
      setIsUploading(false);
      setUploadProgressText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMediaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaLibrary"] });
      setSelectedItem(null);
      toast.success("Image deleted from library.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete item."),
  });

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP, SVG, AVIF, GIF).");
      return;
    }
    setIsUploading(true);
    setUploadProgressText("Compressing & uploading...");
    uploadMutation.mutate(file);
  };

  const handleConfirmSelect = () => {
    if (activeTab === "url") {
      if (!customUrl.trim()) {
        toast.error("Please enter a valid image URL.");
        return;
      }
      onSelect(customUrl.trim());
      onClose();
      return;
    }

    if (selectedItem) {
      onSelect(selectedItem.url, selectedItem);
      onClose();
    } else {
      toast.error("Please select an image first.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-5xl h-[85vh] max-h-[780px] rounded-2xl bg-white shadow-2xl border border-[#e2e8f0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center shadow-2xs">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base text-[#0f172a]">{title}</h2>
              <p className="text-[11px] text-[#64748b]">
                Select from existing uploads or upload a new compressed image.
                {aspectRatioHint && (
                  <span className="ml-1 text-[#059669] font-bold">({aspectRatioHint})</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Sub Navigation / Tabs ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e2e8f0] px-6 py-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("library")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "library"
                  ? "bg-[#059669] text-white shadow-2xs"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:text-[#0f172a] hover:bg-[#f8fafc]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Existing Library ({data?.pagination.total ?? "..."})
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "upload"
                  ? "bg-[#059669] text-white shadow-2xs"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:text-[#0f172a] hover:bg-[#f8fafc]"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload New
            </button>

            <button
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "url"
                  ? "bg-[#059669] text-white shadow-2xs"
                  : "bg-white text-[#64748b] border border-[#e2e8f0] hover:text-[#0f172a] hover:bg-[#f8fafc]"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              Paste URL
            </button>
          </div>

          {activeTab === "library" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search images..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] pl-8 pr-3 text-xs font-semibold text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:bg-white focus:outline-hidden transition"
              />
            </div>
          )}
        </div>

        {/* ── Main Body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* TAB 1: Existing Library */}
          {activeTab === "library" && (
            <>
              {/* Grid Column */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-[#64748b]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#059669] mb-3" />
                    <p className="text-xs font-bold">Loading media items...</p>
                  </div>
                ) : data?.items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] mb-3">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <h3 className="font-extrabold text-sm text-[#0f172a]">No images found</h3>
                    <p className="text-xs text-[#64748b] mt-1 max-w-xs">
                      {search
                        ? `No images match "${search}".`
                        : "You haven't uploaded any images yet."}
                    </p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-extrabold text-white shadow-2xs hover:bg-[#047857] transition cursor-pointer"
                    >
                      <UploadCloud className="h-4 w-4" /> Upload First Image
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {data?.items.map((item) => {
                      const isSelected =
                        selectedItem?.id === item.id || selectedItem?.url === item.url;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`group relative flex flex-col rounded-xl border bg-white overflow-hidden cursor-pointer transition shadow-2xs ${
                            isSelected
                              ? "border-[#059669] ring-2 ring-[#059669] shadow-sm"
                              : "border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-xs"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-square w-full bg-[#f8fafc] overflow-hidden flex items-center justify-center">
                            <img
                              src={item.url}
                              alt={item.alt || item.originalName}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                              loading="lazy"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#059669] text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                            )}
                            {item.savedPercentage > 0 && (
                              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                                <Sparkles className="h-2.5 w-2.5" /> -{item.savedPercentage}%
                              </span>
                            )}
                          </div>

                          {/* Info caption */}
                          <div className="p-2 bg-white">
                            <p
                              className="font-bold text-[11px] text-[#0f172a] truncate"
                              title={item.originalName}
                            >
                              {item.originalName || item.filename}
                            </p>
                            <p className="text-[10px] text-[#94a3b8] flex items-center justify-between mt-0.5">
                              <span>{item.sizeKb} KB</span>
                              {item.width > 0 && (
                                <span>
                                  {item.width}×{item.height}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selection Sidebar (Right Column) */}
              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-[#e2e8f0] bg-[#f8fafc] p-5 flex flex-col justify-between overflow-y-auto">
                {selectedItem ? (
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                      Selected Asset
                    </span>
                    <div className="rounded-xl border border-[#cbd5e1] bg-white p-2 shadow-2xs overflow-hidden">
                      <img
                        src={selectedItem.url}
                        alt={selectedItem.alt || selectedItem.originalName}
                        className="max-h-40 w-full object-contain rounded-lg"
                      />
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-[#94a3b8]">Filename</span>
                        <p className="font-bold text-[#0f172a] truncate">
                          {selectedItem.originalName}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#e2e8f0]">
                        <div>
                          <span className="text-[10px] font-bold text-[#94a3b8]">Size</span>
                          <p className="font-bold text-[#0f172a]">{selectedItem.sizeKb} KB</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#94a3b8]">Dimensions</span>
                          <p className="font-bold text-[#0f172a]">
                            {selectedItem.width > 0
                              ? `${selectedItem.width}×${selectedItem.height}`
                              : "Auto"}
                          </p>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-[#e2e8f0]">
                        <span className="text-[10px] font-bold text-[#94a3b8]">Uploaded</span>
                        <p className="text-[11px] text-[#64748b]">
                          {new Date(selectedItem.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <a
                        href={selectedItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0f172a] hover:bg-[#f8fafc] transition shadow-2xs"
                      >
                        <ExternalLink className="h-3 w-3 text-[#64748b]" /> View Full
                      </a>
                      <button
                        onClick={() => {
                          if (confirm("Delete this image permanently from your library?")) {
                            deleteMutation.mutate(selectedItem.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#94a3b8]">
                    <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-bold">No image selected</p>
                    <p className="text-[11px] mt-1 text-[#94a3b8]">
                      Click any image in the grid to view details and select.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: Upload Dropzone */}
          {activeTab === "upload" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#cbd5e1] hover:border-[#059669] bg-[#fafcfb] hover:bg-[#ecfdf5]/30 rounded-3xl p-12 max-w-xl w-full cursor-pointer transition text-center group shadow-2xs">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,image/avif,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 text-[#059669] animate-spin" />
                    <p className="font-extrabold text-sm text-[#0f172a]">{uploadProgressText}</p>
                    <p className="text-xs text-[#64748b]">
                      Running MozJPEG visually-lossless optimization...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-3xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center group-hover:scale-110 transition shadow-2xs">
                      <UploadCloud className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-extrabold text-base text-[#0f172a]">
                        Click or drag &amp; drop to upload
                      </p>
                      <p className="text-xs text-[#64748b] mt-1">
                        Supports PNG, JPG, WebP, SVG, AVIF up to 25MB
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-extrabold text-emerald-800 mt-2">
                      <Sparkles className="h-3 w-3" /> Auto-optimizes with zero quality loss
                    </span>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* TAB 3: Paste Direct URL */}
          {activeTab === "url" && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center max-w-lg mx-auto w-full space-y-6">
              <div className="text-center space-y-1">
                <div className="h-12 w-12 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="font-extrabold text-base text-[#0f172a]">
                  Paste External Image URL
                </h3>
                <p className="text-xs text-[#64748b]">
                  Use an existing hosted image from an external CDN or web source.
                </p>
              </div>

              <div className="w-full space-y-2">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-hidden shadow-2xs"
                />
              </div>

              {customUrl.trim() && (
                <div className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-center">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase mb-2 block">
                    Live URL Preview
                  </span>
                  <img
                    src={customUrl}
                    alt="External Preview"
                    className="max-h-48 max-w-full rounded-xl object-contain mx-auto border border-[#cbd5e1] bg-white"
                    onError={() => toast.error("Could not load preview from this URL.")}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Actions ─────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-[#e2e8f0] px-6 py-4 bg-white">
          <div className="text-xs text-[#64748b] hidden sm:block">
            {activeTab === "library" && selectedItem ? (
              <span>
                Selected: <strong className="text-[#0f172a]">{selectedItem.originalName}</strong>
              </span>
            ) : activeTab === "url" && customUrl ? (
              <span className="truncate max-w-xs inline-block">URL: {customUrl}</span>
            ) : (
              <span>Choose an image from the library or upload a new file.</span>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#0f172a] hover:bg-[#f8fafc] transition cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelect}
              disabled={activeTab === "library" && !selectedItem}
              className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#047857] disabled:opacity-40 transition cursor-pointer"
            >
              Use This Image <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
