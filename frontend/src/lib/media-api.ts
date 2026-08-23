/**
 * Universal Media Library API Client
 * Used across Tenant & Admin dashboards, builders, and content editors.
 */

import { apiFetch } from "./api-fetch";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface MediaLibraryItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  mediaType: "image" | "video" | "document" | "audio" | "other";
  size: number;
  sizeKb: number;
  sizeMb: number;
  url: string;
  alt: string;
  width: number;
  height: number;
  savedPercentage: number;
  tenant?: { id: string; name: string; email: string } | null;
  website?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaLibraryResponse {
  items: MediaLibraryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface FetchMediaParams {
  page?: number;
  limit?: number;
  search?: string;
  mediaType?: string;
  websiteId?: string;
  tenantId?: string;
}

export async function fetchMediaLibrary(
  params: FetchMediaParams = {},
): Promise<MediaLibraryResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.mediaType) query.set("mediaType", params.mediaType);
  if (params.websiteId) query.set("website", params.websiteId);
  if (params.tenantId) query.set("tenant", params.tenantId);

  const response = await apiFetch(`${API_URL}/media?${query.toString()}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const payload = await response.json().catch(() => ({ message: "Failed to load media items." }));
  if (!response.ok) throw new Error(payload.message || "Failed to load media library.");

  return payload;
}

export async function uploadMediaItem(
  file: File,
  options: { websiteId?: string; alt?: string; tags?: string[] } = {},
): Promise<{ message: string; item: MediaLibraryItem }> {
  const formData = new FormData();
  formData.append("file", file);
  if (options.websiteId) formData.append("websiteId", options.websiteId);
  if (options.alt) formData.append("alt", options.alt);
  if (options.tags) formData.append("tags", options.tags.join(","));

  const response = await apiFetch(`${API_URL}/media/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await response.json().catch(() => ({ message: "Upload failed." }));
  if (!response.ok) throw new Error(payload.message || "Failed to upload media file.");

  return payload;
}

export async function deleteMediaItem(id: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_URL}/media/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const payload = await response.json().catch(() => ({ message: "Delete failed." }));
  if (!response.ok) throw new Error(payload.message || "Failed to delete media item.");

  return payload;
}
