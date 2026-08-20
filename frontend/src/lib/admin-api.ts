import { apiFetch } from "./api-fetch";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:5000/api";

export async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}/admin${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(!(options?.body instanceof FormData) && { "content-type": "application/json" }),
      ...options?.headers,
    },
  });

  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to process your request." }));
  if (!response.ok) throw new Error(payload.message || "An error occurred.");

  return payload as T;
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return "";
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== ""),
  );
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(filtered).map(([key, value]) => [key, String(value)])),
  ).toString();
  return query ? `?${query}` : "";
}

// ── Dashboard ─────────────────────────────────────────────────
export const getAdminDashboard = () => adminRequest<any>("/dashboard");

// ── Websites ──────────────────────────────────────────────────
export const getAdminWebsites = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => adminRequest<any>(`/websites${buildQuery(params)}`);
export const getAdminWebsiteEditor = (id: string) => adminRequest<any>(`/websites/${id}/editor`);
export const saveAdminWebsiteDraft = (id: string, draftState: any) =>
  adminRequest<any>(`/websites/${id}/draft`, {
    method: "PUT",
    body: JSON.stringify({ draftState }),
  });
export const publishAdminWebsite = (id: string) =>
  adminRequest<any>(`/websites/${id}/publish`, {
    method: "POST",
  });
export const updateWebsiteTemplate = (id: string, templateId: string) =>
  adminRequest<any>(`/websites/${id}/template`, {
    method: "PATCH",
    body: JSON.stringify({ templateId }),
  });

// ── Tenants ───────────────────────────────────────────────────
export const getTenants = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => adminRequest<any>(`/tenants${buildQuery(params)}`);
export const getTenant = (id: string) => adminRequest<any>(`/tenants/${id}`);
export const createTenant = async (data: any) => {
  const response = await apiFetch(`${API_URL}/invitations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to process your request." }));
  if (!response.ok) throw new Error(payload.message || "An error occurred.");
  return payload;
};
export const getInvitations = async () => {
  const response = await apiFetch(`${API_URL}/invitations`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch invitations.");
  return response.json();
};
export const cancelInvitation = async (id: string) => {
  const response = await apiFetch(`${API_URL}/invitations/${id}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to cancel invitation.");
  return response.json();
};
export const updateTenantStatus = (id: string, status: string) =>
  adminRequest<any>(`/tenants/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const updateTenant = (id: string, data: any) =>
  adminRequest<any>(`/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const impersonateTenant = (id: string) =>
  adminRequest<any>(`/tenants/${id}/impersonate`, { method: "POST" });
export const deleteTenant = (id: string) =>
  adminRequest<any>(`/tenants/${id}`, { method: "DELETE" });
export const reviewAccountDeletionRequest = (
  id: string,
  decision: "approve" | "reject",
  adminNote = "",
) =>
  adminRequest<{ message: string }>(`/tenants/${id}/deletion-request/review`, {
    method: "POST",
    body: JSON.stringify({ decision, adminNote }),
  });

// ── Subscriptions ─────────────────────────────────────────────
export const getSubscriptions = (params?: { page?: number; limit?: number; status?: string }) =>
  adminRequest<any>(`/subscriptions${buildQuery(params)}`);

// ── Plans ─────────────────────────────────────────────────────
export const getPlans = (params?: { page?: number; limit?: number; status?: string }) =>
  adminRequest<any>(`/plans${buildQuery(params)}`);
export const createPlan = (data: any) =>
  adminRequest<any>("/plans", { method: "POST", body: JSON.stringify(data) });
export const updatePlan = (id: string, data: any) =>
  adminRequest<any>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deletePlan = (id: string) => adminRequest<any>(`/plans/${id}`, { method: "DELETE" });

// ── Payments & Coupons ────────────────────────────────────────
export const getPayments = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => adminRequest<any>(`/payments${buildQuery(params)}`);
export const getCoupons = (params?: { page?: number; limit?: number; status?: string }) =>
  adminRequest<any>(`/coupons${buildQuery(params)}`);
export const createCoupon = (data: any) =>
  adminRequest<any>("/coupons", { method: "POST", body: JSON.stringify(data) });

// ── Domains & Websites & Storage ──────────────────────────────
export const getDomains = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => adminRequest<any>(`/domains${buildQuery(params)}`);

export const getStorageItems = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
}) => adminRequest<any>(`/storage${buildQuery(params)}`);
export const deleteStorageItem = (id: string) =>
  adminRequest<any>(`/storage/${id}`, { method: "DELETE" });
export const getImageKitStats = () => adminRequest<any>(`/storage/imagekit`);
export const uploadAdminFile = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return adminRequest<any>("/upload", { method: "POST", body: formData });
};

// ── Content (Blog, KB, Announcements) ─────────────────────────
export type BlogPostInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category?: string;
  coverImage?: string;
  tags?: string[];
  status: "draft" | "published" | "scheduled" | "archived";
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
};

export const getBlogPosts = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  category?: string;
  featured?: boolean;
}) => adminRequest<{ posts: any[]; pagination: any }>(`/blog/posts${buildQuery(params)}`);

export const getBlogPost = (id: string) =>
  adminRequest<{ post: any }>(`/blog/posts/${id}`);

export const getBlogCategories = () =>
  adminRequest<{ categories: any[] }>("/blog/categories");

export const createBlogCategory = (data: {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}) =>
  adminRequest<{ category: any }>("/blog/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBlogCategory = (
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
) =>
  adminRequest<{ category: any }>(`/blog/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteBlogCategory = (id: string) =>
  adminRequest<{ message: string }>(`/blog/categories/${id}`, {
    method: "DELETE",
  });

export const createBlogPost = (data: any) =>
  adminRequest<{ post: any }>("/blog/posts", { method: "POST", body: JSON.stringify(data) });

export const updateBlogPost = (id: string, data: any) =>
  adminRequest<{ post: any }>(`/blog/posts/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteBlogPost = (id: string) =>
  adminRequest<{ message: string }>(`/blog/posts/${id}`, { method: "DELETE" });

export const getAnnouncements = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  isImportant?: boolean;
}) => adminRequest<any>(`/announcements${buildQuery(params)}`);
export const createAnnouncement = (data: any) =>
  adminRequest<any>("/announcements", { method: "POST", body: JSON.stringify(data) });

// ── Templates ─────────────────────────────────────────────────
export const getTemplates = () => adminRequest<any>("/templates");
export const importTemplate = (formData: FormData) =>
  adminRequest<any>("/templates/import", {
    method: "POST",
    body: formData,
  });
export const updateTemplate = (id: string, data: any) =>
  adminRequest<any>(`/templates/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const toggleTemplateStatus = (id: string) =>
  adminRequest<any>(`/templates/${id}/toggle-status`, { method: "PATCH" });
export const deleteTemplate = (id: string) =>
  adminRequest<any>(`/templates/${id}`, { method: "DELETE" });

// ── Support ───────────────────────────────────────────────────
export const getSupportTickets = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  priority?: string;
}) => adminRequest<any>(`/support${buildQuery(params)}`);
export const getSupportTicket = (id: string) => adminRequest<any>(`/support/${id}`);
export const replySupportTicket = (
  id: string,
  data: {
    content: string;
    isInternal?: boolean;
    attachments?: { url: string; filename: string; size: number }[];
  },
) => adminRequest<any>(`/support/${id}/reply`, { method: "POST", body: JSON.stringify(data) });
export const updateSupportTicket = (id: string, data: any) =>
  adminRequest<any>(`/support/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const resolveSupportTicket = (id: string) =>
  adminRequest<any>(`/support/${id}/resolve`, { method: "POST" });

// ── Knowledge Base ────────────────────────────────────────────
export const getKbArticles = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
}) => adminRequest<any>(`/kb/articles${buildQuery(params)}`);
export const getKbArticle = (id: string) => adminRequest<any>(`/kb/articles/${id}`);
export const createKbArticle = (data: any) =>
  adminRequest<any>("/kb/articles", { method: "POST", body: JSON.stringify(data) });
export const updateKbArticle = (id: string, data: any) =>
  adminRequest<any>(`/kb/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteKbArticle = (id: string) =>
  adminRequest<any>(`/kb/articles/${id}`, { method: "DELETE" });

// ── System (Settings, Email, Notifications, Logs, Reports) ────
export const getSettings = () => adminRequest<any>("/settings");
export const updateSettings = (updates: any[]) =>
  adminRequest<any>("/settings", { method: "PATCH", body: JSON.stringify({ settings: updates }) });
export const updateSeoSettings = (updates: Array<{ key: string; value: string | boolean }>) =>
  adminRequest<{ message: string; settings: Array<{ key: string; value: string | boolean }> }>(
    "/settings/seo",
    {
      method: "PATCH",
      body: JSON.stringify({ settings: updates }),
    },
  );

export const getEmailTemplates = () => adminRequest<any>("/email-templates");
export const getEmailTemplateVariables = (id: string) =>
  adminRequest<any>(`/email-templates/${id}/variables`);
export const getEmailTemplate = (id: string) => adminRequest<any>(`/email-templates/${id}`);
export const createEmailTemplate = (data: any) =>
  adminRequest<any>("/email-templates", { method: "POST", body: JSON.stringify(data) });
export const updateEmailTemplate = (id: string, data: any) =>
  adminRequest<any>(`/email-templates/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteEmailTemplate = (id: string) =>
  adminRequest<any>(`/email-templates/${id}`, { method: "DELETE" });
export const setDefaultEmailTemplate = (id: string) =>
  adminRequest<any>(`/email-templates/${id}/set-default`, { method: "PATCH" });
export const previewEmailTemplate = (id: string, variables: any = {}) =>
  adminRequest<any>(`/email-templates/${id}/preview`, {
    method: "POST",
    body: JSON.stringify({ variables }),
  });
export const sendTestEmail = (id: string, to: string, variables: any = {}) =>
  adminRequest<any>(`/email-templates/${id}/send-test`, {
    method: "POST",
    body: JSON.stringify({ to, variables }),
  });

export const uploadEmailTemplateImage = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);
  return adminRequest<any>("/email-templates/upload-image", { method: "POST", body: formData });
};

export type AdminNotification = {
  _id: string;
  title: string;
  message: string;
  type: string;
  link: string;
  isRead: boolean;
  createdAt: string;
};

export const getNotifications = (params?: { page?: number; limit?: number }) =>
  adminRequest<any>(`/notifications${buildQuery(params)}`);
export const getAdminNotifications = (limit = 8) =>
  adminRequest<{ notifications: AdminNotification[]; unreadCount: number }>(
    `/notifications/mine?limit=${limit}`,
  );
export const markAdminNotificationRead = (notificationId: string) =>
  adminRequest<{ message: string }>(`/notifications/mine/${notificationId}/read`, {
    method: "PATCH",
  });
export const markAllAdminNotificationsRead = () =>
  adminRequest<{ message: string }>("/notifications/mine/read-all", { method: "PATCH" });
export const createNotification = (data: any) =>
  adminRequest<any>("/notifications", { method: "POST", body: JSON.stringify(data) });

export const getActivityLogs = (params?: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  status?: string;
}) => adminRequest<any>(`/activity-logs${buildQuery(params)}`);

export const getReport = (
  type: string,
  params?: { timeframe?: string; startDate?: string; endDate?: string },
) => adminRequest<any>(`/reports/${type}${buildQuery(params)}`);

export const getProfile = () => adminRequest<any>("/profile");
export const updateProfile = (data: { name?: string; phone?: string; avatarUrl?: string }) =>
  adminRequest<any>("/profile", { method: "PATCH", body: JSON.stringify(data) });
export const changeAdminPassword = (data: { currentPassword: string; newPassword: string }) =>
  adminRequest<{ message: string }>("/profile/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Upload ────────────────────────────────────────────────────
export const uploadImage = (formData: FormData) =>
  adminRequest<any>("/upload", {
    method: "POST",
    body: formData,
  });

// ── Template Categories ───────────────────────────────────────
export const getTemplateCategories = () => adminRequest<any>("/template-categories");
export const createTemplateCategory = (data: { name: string }) =>
  adminRequest<any>("/template-categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateTemplateCategory = (id: string, data: { name: string }) =>
  adminRequest<any>(`/template-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteTemplateCategory = (id: string) =>
  adminRequest<any>(`/template-categories/${id}`, { method: "DELETE" });

// ── Testimonials ──────────────────────────────────────────────
export const getAdminTestimonials = () => adminRequest<{ testimonials: any[] }>("/testimonials");

export const createAdminTestimonial = (data: any) =>
  adminRequest<{ testimonial: any }>("/testimonials", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateAdminTestimonial = (id: string, data: any) =>
  adminRequest<{ testimonial: any }>(`/testimonials/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteAdminTestimonial = (id: string) =>
  adminRequest<{ message: string }>(`/testimonials/${id}`, {
    method: "DELETE",
  });
