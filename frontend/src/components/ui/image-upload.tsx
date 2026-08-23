import * as React from "react";
import { Upload, X, ImageIcon, Layers, Link2 } from "lucide-react";
import { MediaLibraryModal } from "./media-library-modal";
import type { MediaLibraryItem } from "@/lib/media-api";

export interface ImageUploadProps {
  value: string;
  onChange: (url: string, item?: MediaLibraryItem) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  websiteId?: string;
  aspectRatioHint?: string;
  square?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  className = "",
  placeholder = "Choose or upload an image",
  title = "Select Image from Library",
  websiteId,
  aspectRatioHint,
  square = false,
}: ImageUploadProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {value ? (
        <div
          className={`relative group rounded-2xl overflow-hidden border border-[#e2e8f0] bg-[#f8fafc] shadow-2xs flex items-center justify-center ${
            square ? "aspect-square max-w-[220px]" : "aspect-video w-full"
          }`}
        >
          <img src={value} alt="Uploaded" className="w-full h-full object-contain p-2" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 backdrop-blur-2xs">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0f172a] text-xs font-extrabold rounded-xl hover:bg-[#f8fafc] transition shadow-lg cursor-pointer"
              title="Browse Media Library"
            >
              <Layers className="h-3.5 w-3.5 text-[#059669]" />
              Library
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-2 bg-rose-500/90 text-white rounded-xl hover:bg-rose-600 transition shadow-lg cursor-pointer"
              title="Remove Image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`relative group rounded-2xl border-2 border-dashed border-[#cbd5e1] hover:border-[#059669] bg-[#fafcfb] hover:bg-[#ecfdf5]/30 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden text-[#64748b] hover:text-[#059669] cursor-pointer shadow-2xs ${
            square ? "aspect-square max-w-[220px]" : "aspect-video w-full"
          }`}
        >
          <div className="p-3 bg-white rounded-2xl border border-[#e2e8f0] group-hover:border-[#a7f3d0] group-hover:bg-[#ecfdf5] transition-colors shadow-2xs">
            <ImageIcon className="h-6 w-6 text-[#059669]" />
          </div>
          <span className="text-xs font-extrabold text-[#0f172a]">{placeholder}</span>
          <span className="text-[11px] font-medium text-[#94a3b8]">
            Click to browse existing library or upload
          </span>
          {aspectRatioHint && (
            <span className="text-[10px] font-bold text-[#059669]">{aspectRatioHint}</span>
          )}
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white border border-[#cbd5e1] px-3 text-xs font-extrabold text-[#0f172a] hover:bg-[#f8fafc] transition shadow-2xs cursor-pointer shrink-0"
        >
          <Layers className="h-3.5 w-3.5 text-[#059669]" />
          Browse Library
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-hidden shadow-2xs"
          placeholder="Or paste an image URL..."
        />
      </div>

      <MediaLibraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(url, item) => onChange(url, item)}
        title={title}
        initialSelectedUrl={value}
        websiteId={websiteId}
        aspectRatioHint={aspectRatioHint}
      />
    </div>
  );
}
