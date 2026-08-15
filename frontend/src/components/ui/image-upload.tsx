import * as React from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadImage } from "@/lib/admin-api";

import { toast } from "sonner";
interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  placeholder?: string;
}

export function ImageUpload({
  value,
  onChange,
  className = "",
  placeholder = "Upload an image",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await uploadImage(formData);
      if (response.url) {
        onChange(response.url);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition shadow-lg"
              title="Change Image"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={() => onChange("")}
              className="p-2 bg-rose-500/90 text-white rounded-md hover:bg-rose-600 transition shadow-lg"
              title="Remove Image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="relative group rounded-lg border border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-900/50 hover:bg-slate-800/50 transition-all aspect-video flex flex-col items-center justify-center gap-2 overflow-hidden text-slate-400 hover:text-cyan-400"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          ) : (
            <>
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-cyan-500/10 transition-colors">
                <ImageIcon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">{placeholder}</span>
              <span className="text-xs text-slate-500">Click to browse</span>
            </>
          )}
        </button>
      )}

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          placeholder="Or paste an image URL..."
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
