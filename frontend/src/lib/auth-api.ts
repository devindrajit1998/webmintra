import { apiFetch } from "./api-fetch";
import type { EditorState } from "./template-engine/types";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001/api";

export type SessionUser = {
  name: string;
  email: string;
  role: "admin" | "tenant";
  onboardingCompleted?: boolean;
  avatarUrl?: string;
};

export type AdminDashboard = {
  metrics: {
    totalUsers: number;
    verifiedUsers: number;
    tenantUsers: number;
    administrators: number;
  };
  recentUsers: Array<{
    name: string;
    email: string;
    role: SessionUser["role"];
    isEmailVerified: boolean;
    createdAt: string;
  }>;
};

export type SeoEntitlements = {
  planSlug: string;
  planName: string;
  seoFeatures: Record<string, boolean | string>;
};

export type TenantDashboard = {
  account: SessionUser & {
    memberSince: string;
    plan: string;
    planName?: string;
    limits: { websites: number; storage: number };
    seoFeatures?: Record<string, boolean | string>;
  };
};

export type Website = {
  id: string;
  name: string;
  templateName: string;
  templateId?: string;
  status: "draft" | "published" | "archived";
  draftState?: Partial<EditorState>;
  publishedState?: Partial<EditorState>;
  lastOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TemplatePage = {
  name: string;
  htmlContent: string;
};

type ApiResponse = {
  message: string;
  needsVerification?: boolean;
  user?: SessionUser;
};

export async function authRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<ApiResponse> {
  const requestUrl = `${API_URL}/auth${path}`;
  const response = await apiFetch(requestUrl, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response
    .json()
    .catch(() => ({ message: "Unable to process your request." }))) as ApiResponse;
  if (!response.ok)
    throw Object.assign(new Error(payload.message), {
      needsVerification: payload.needsVerification,
    });
  return payload;
}

const SESSION_USER_KEY = "webmintra:session-user";

export function saveSessionUser(user: SessionUser) {
  if (typeof window !== "undefined") sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(SESSION_USER_KEY) ?? "null",
    ) as SessionUser | null;
    return value?.role === "admin" || value?.role === "tenant" ? value : null;
  } catch {
    return null;
  }
}

export function clearSessionUser() {
  if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_USER_KEY);
}

export async function getAuthenticatedUser(): Promise<SessionUser | null> {
  const response = await fetch(`${API_URL}/auth/session`, {
    credentials: "include",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { user?: SessionUser };
  if (!payload.user || !["admin", "tenant"].includes(payload.user.role)) return null;
  saveSessionUser(payload.user);
  return payload.user;
}

export function routeForRole(role: SessionUser["role"]) {
  return role === "admin" ? "/admin/dashboard" : "/tenant";
}

export async function getDashboard<T>(role: SessionUser["role"]): Promise<T> {
  const response = await fetch(`${API_URL}/dashboard/${role}`, { credentials: "include" });
  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => ({ message: "Unable to load dashboard." }))) as { message: string };
    throw new Error(payload.message);
  }
  return response.json() as Promise<T>;
}

async function websiteRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}/websites${path}`, {
    credentials: "include",
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  const payload = (await response
    .json()
    .catch(() => ({ message: "Unable to manage website." }))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Unable to manage website.");
  return payload;
}

export async function getWebsites() {
  return websiteRequest<{ websites: Website[] }>("/");
}

export async function getWebsite(websiteId: string) {
  return websiteRequest<{
    website: Website;
    htmlContent: string;
    pages?: TemplatePage[];
    seoEntitlements: SeoEntitlements;
  }>(`/${websiteId}`);
}

export type CatalogTemplate = { id: string; name: string; category: string; description: string };

export async function getTemplates() {
  const response = await fetch(`${API_URL}/templates`);
  if (!response.ok) throw new Error("Unable to load templates.");
  return response.json() as Promise<{ templates: CatalogTemplate[] }>;
}

export async function createWebsite(templateId: string) {
  return websiteRequest<{ website: Website }>("/", {
    method: "POST",
    body: JSON.stringify({ templateId }),
  });
}

export async function openWebsite(websiteId: string) {
  return websiteRequest<{ website: Website }>(`/${websiteId}/open`, { method: "POST" });
}

export async function saveDraft(websiteId: string, draftState: EditorState) {
  return websiteRequest<{ website: Website }>(`/${websiteId}/draft`, {
    method: "PUT",
    body: JSON.stringify({ draftState }),
  });
}

export async function publishWebsite(websiteId: string) {
  return websiteRequest<{ website: Website }>(`/${websiteId}/publish`, { method: "POST" });
}

export async function archiveWebsite(websiteId: string) {
  return websiteRequest<{ website: Website }>(`/${websiteId}/archive`, { method: "POST" });
}

export async function getWebsiteForms(websiteId: string) {
  return websiteRequest<{ forms: any[] }>(`/${websiteId}/forms`, { method: "GET" });
}

// ── DOMAINS ──────────────────────────────────────────────────

async function domainRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${API_URL}/domains${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "An error occurred");
  }
  return response.json();
}

export interface Domain {
  id: string;
  domain: string;
  websiteId: string;
  status: string;
  sslStatus: string;
  createdAt: string;
}

export async function getDomains() {
  return domainRequest<{ domains: Domain[] }>(`/`, { method: "GET" });
}

export async function addDomain(domain: string, websiteId: string) {
  return domainRequest<{ domain: Domain }>(`/`, {
    method: "POST",
    body: JSON.stringify({ domain, websiteId }),
  });
}

export async function deleteDomain(domainId: string) {
  return domainRequest<{ message: string }>(`/${domainId}`, { method: "DELETE" });
}

export async function verifyDomain(domainId: string) {
  return domainRequest<{ domain: Domain }>(`/${domainId}/verify`, { method: "POST" });
}

export type MediaAsset = {
  _id: string;
  website: string;
  filename: string;
  originalName: string;
  mimeType: string;
  mediaType: "image" | "video" | "document" | "audio" | "other";
  size: number;
  url: string;
  alt: string;
  createdAt: string;
  updatedAt: string;
};

export async function getWebsiteAssets(websiteId: string) {
  return websiteRequest<{ assets: MediaAsset[] }>(`/${websiteId}/assets`, { method: "GET" });
}

export async function deleteWebsiteAsset(websiteId: string, assetId: string) {
  const response = await apiFetch(`${API_URL}/websites/${websiteId}/assets/${assetId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Unable to delete asset." }));
    throw new Error(payload.message || "Unable to delete asset.");
  }
}

export async function uploadWebsiteImage(websiteId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch(`${API_URL}/websites/${websiteId}/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Failed to upload image");
  return payload as { message: string; url: string; fileId: string };
}

export async function phoneVerificationRequest(phone: string) {
  return authRequest("/request-phone-verification", { phone });
}

export async function verifyPhone(code: string) {
  return authRequest("/verify-phone", { code });
}

export async function updateProfile(name: string) {
  const response = await apiFetch(`${API_URL}/auth/profile`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const payload = await response.json().catch(() => ({ message: "Unable to update profile." }));
  if (!response.ok) throw new Error(payload.message);
  return payload as { message: string; user: SessionUser };
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const response = await apiFetch(`${API_URL}/auth/password`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const payload = await response.json().catch(() => ({ message: "Unable to update password." }));
  if (!response.ok) throw new Error(payload.message);
  return payload as { message: string };
}

export async function completeOnboarding(
  business: Record<string, string>,
  plan: string,
  templateId: string,
) {
  return authRequest("/complete-onboarding", { business, plan, templateId });
}

export type BusinessInfo = {
  name: string;
  logoUrl: string;
  faviconUrl: string;
  address: string;
  email: string;
  phone: string;
  description: string;
};

async function businessRequest<T>(options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}/tenants/business`, {
    credentials: "include",
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  const payload = (await response.json().catch(() => ({
    message: "Unable to manage business information.",
  }))) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Unable to manage business information.");
  return payload;
}

export function getBusinessInfo() {
  return businessRequest<{ business: BusinessInfo }>();
}

export function updateBusinessInfo(business: BusinessInfo) {
  return businessRequest<{ message: string; business: BusinessInfo }>({
    method: "PUT",
    body: JSON.stringify({ business }),
  });
}

export async function uploadBusinessBranding(file: File, assetType: "logo" | "favicon") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);
  const response = await apiFetch(`${API_URL}/tenants/business/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to upload branding asset." }));
  if (!response.ok) throw new Error(payload.message ?? "Unable to upload branding asset.");
  return payload as { url: string; fileId: string };
}

export type BillingInvoice = {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded" | "disputed";
  method: string;
  methodLabel?: string;
  transactionId?: string | null;
  createdAt: string;
  paidAt: string | null;
  dueDate: string | null;
  taxes: Array<{ name?: string; rate?: number; amount?: number }>;
  refunds: Array<{ amount: number; reason?: string; refundedAt: string }>;
  billingAddress: {
    name?: string;
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
};

export type TenantBilling = {
  subscription: {
    id: string | null;
    planName: string;
    description: string;
    status: string;
    interval: string;
    price: number;
    currency: string;
    startDate: string | null;
    renewalDate: string | null;
    trialEndsAt: string | null;
    autoRenew: boolean;
    limits: Record<string, number>;
    highlights: string[];
  };
  paymentMethod: { type: string; label: string; lastUsedAt: string } | null;
  summary: { totalPaid: number; refundedAmount: number; invoiceCount: number; currency: string };
  invoices: BillingInvoice[];
};

export async function getTenantBilling() {
  const response = await apiFetch(`${API_URL}/billing`, { credentials: "include" });
  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to load billing information." }));
  if (!response.ok) throw new Error(payload.message ?? "Unable to load billing information.");
  return payload as TenantBilling;
}

export type SubscriptionPlan = OnboardingPlan;

export async function getSubscriptionPlans() {
  const response = await apiFetch(`${API_URL}/billing/plans`, { credentials: "include" });
  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to load subscription plans." }));
  if (!response.ok) throw new Error(payload.message ?? "Unable to load subscription plans.");
  return payload as { plans: SubscriptionPlan[] };
}

export async function validateCoupon(code: string, planId: string, interval: "monthly" | "yearly") {
  const response = await apiFetch(`${API_URL}/billing/coupon/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, planId, interval }),
  });
  const payload = await response.json().catch(() => ({ message: "Invalid coupon" }));
  if (!response.ok) throw new Error(payload.message);
  return payload;
}

export async function changeSubscriptionPlan(
  planId: string,
  interval: "monthly" | "yearly",
  couponCode?: string,
) {
  const response = await apiFetch(`${API_URL}/billing/subscription`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planId, interval, couponCode }),
  });
  const payload = await response.json().catch(() => ({ message: "Unable to change your plan." }));
  if (!response.ok) throw new Error(payload.message ?? "Unable to change your plan.");
  return payload as { message: string };
}

export type Invitation = {
  id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  trialDays: number;
  category: string;
  notes: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
  invitationUrl?: string;
};

export async function validateInvitation(token: string) {
  const response = await fetch(
    `${API_URL}/invitations/validate?token=${encodeURIComponent(token)}`,
  );
  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to validate invitation." }));
  if (!response.ok) throw new Error(payload.message);
  return payload as { invitation: Invitation };
}

export async function acceptInvitation(token: string, password: string) {
  const response = await apiFetch(`${API_URL}/invitations/accept`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password, acceptedTerms: true }),
  });
  const payload = await response.json().catch(() => ({ message: "Unable to accept invitation." }));
  if (!response.ok) throw new Error(payload.message);
  return payload as { email: string; message: string };
}

async function invitationRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}/invitations${path}`, {
    credentials: "include",
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  const payload = await response.json().catch(() => ({ message: "Unable to manage invitation." }));
  if (!response.ok) throw new Error(payload.message);
  return payload as T;
}

export function getInvitations() {
  return invitationRequest<{ invitations: Invitation[] }>("/");
}
export function createInvitation(data: Record<string, unknown>) {
  return invitationRequest<{ invitation: Invitation }>("/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function cancelInvitation(id: string) {
  return invitationRequest<{ invitation: Invitation }>(`/${id}/cancel`, { method: "POST" });
}

export type ManagedTenant = {
  id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  status: "invitation-sent" | "active" | "suspended" | "archived";
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export async function getManagedTenants() {
  const response = await fetch(`${API_URL}/tenants`, { credentials: "include" });
  const payload = await response.json().catch(() => ({ message: "Unable to load tenants." }));
  if (!response.ok) throw new Error(payload.message);
  return payload as { tenants: ManagedTenant[] };
}
export async function updateTenantStatus(id: string, status: ManagedTenant["status"]) {
  const response = await apiFetch(`${API_URL}/tenants/${id}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const payload = await response.json().catch(() => ({ message: "Unable to update tenant." }));
  if (!response.ok) throw new Error(payload.message);
}

// ── Onboarding API ───────────────────────────────────────────────

async function onboardingRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}/onboarding${path}`, {
    credentials: "include",
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  const payload = await response.json().catch(() => ({ message: "Unable to process onboarding." }));
  if (!response.ok) throw new Error((payload as any).message ?? "Unable to process onboarding.");
  return payload as T;
}

export type OnboardingPlan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricing: { monthly: number; yearly: number };
  currency: string;
  trialDays: number;
  maxPages: number;
  limits: Record<string, number>;
  features: Record<string, boolean>;
  highlights: string[];
};

export type OnboardingTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  pageCount: number;
  thumbnailUrl: string | null;
};

export type OnboardingTemplateDetails = OnboardingTemplate & {
  htmlContent: string;
  pages: { name: string; htmlContent: string }[];
};

export function getOnboardingTemplate(id: string) {
  return onboardingRequest<{ template: OnboardingTemplateDetails }>(`/templates/${id}`);
}

export function getOnboardingPlans() {
  return onboardingRequest<{ plans: OnboardingPlan[] }>("/plans");
}

export function getOnboardingTemplates(planId: string, category?: string) {
  const params = new URLSearchParams({ planId });
  if (category) params.set("category", category);
  return onboardingRequest<{ templates: OnboardingTemplate[]; categories: string[] }>(
    `/templates?${params}`,
  );
}

export function createRazorpayOrder(planId: string, interval: "monthly" | "yearly") {
  return onboardingRequest<{
    free: boolean;
    razorpayOrderId?: string;
    amount: number;
    currency?: string;
    planId: string;
    interval: string;
  }>("/create-order", {
    method: "POST",
    body: JSON.stringify({ planId, interval }),
  });
}

// ── Tenant workspace API ─────────────────────────────────────────

export type WorkspacePagination = { total: number; page: number; limit: number; pages: number };

export type WorkspaceActivity = {
  id: string;
  action: string;
  description: string;
  resource?: { type?: string; id?: string; name?: string };
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type SupportReply = {
  id: string;
  content: string;
  isInternal?: boolean;
  createdAt: string;
  attachments?: { url: string; filename: string; size: number }[];
  author: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "waiting_reply" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  attachments?: { url: string; filename: string; size: number }[];
  replies: SupportReply[];
  resolvedAt?: string;
  closedAt?: string;
  lastRepliedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBaseCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
};

export type KnowledgeBaseArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category?: { _id: string; name: string; slug: string };
  tags: string[];
  isFaq: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt?: string;
  updatedAt: string;
};

async function workspaceRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${API_URL}/workspace${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(!(options?.body instanceof FormData) && { "content-type": "application/json" }),
      ...options.headers,
    },
  });
  const payload = await response
    .json()
    .catch(() => ({ message: "Unable to load workspace data." }));
  if (!response.ok) throw new Error(payload.message ?? "Unable to load workspace data.");
  return payload as T;
}

export type TenantAnalytics = {
  period: { days: number; from: string; to: string };
  summary: { uniqueVisitors: number; pageViews: number; conversions: number };
  daily: Array<{ date: string; visitors: number; pageViews: number; conversions: number }>;
  websites: Array<{
    websiteId: string;
    websiteName: string;
    visitors: number;
    pageViews: number;
    conversions: number;
  }>;
};

export function getTenantAnalytics(days: 7 | 30 | 90 | 365 = 30) {
  return workspaceRequest<TenantAnalytics>(`/analytics?days=${days}`);
}

export function getWorkspaceActivity(
  params: { page?: number; limit?: number; search?: string; action?: string } = {},
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(
    ([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)),
  );
  return workspaceRequest<{ logs: WorkspaceActivity[]; pagination: WorkspacePagination }>(
    `/activity?${query}`,
  );
}

export function getTenantTickets(
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(
    ([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)),
  );
  return workspaceRequest<{
    tickets: SupportTicket[];
    pagination: WorkspacePagination;
    summary: Record<string, number>;
  }>(`/support?${query}`);
}

export function getTenantTicket(ticketId: string) {
  return workspaceRequest<{ ticket: SupportTicket }>(`/support/${ticketId}`);
}

export function createTenantTicket(data: {
  subject: string;
  description: string;
  priority: SupportTicket["priority"];
  category: string;
  attachments?: { url: string; filename: string; size: number }[];
}) {
  return workspaceRequest<{ ticket: SupportTicket }>("/support", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function replyToTenantTicket(
  ticketId: string,
  content: string,
  attachments?: { url: string; filename: string; size: number }[],
) {
  return workspaceRequest<{ message: string; ticket: SupportTicket }>(
    `/support/${ticketId}/reply`,
    { method: "POST", body: JSON.stringify({ content, attachments }) },
  );
}

export async function uploadSupportAttachment(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return workspaceRequest<{ message: string; url: string; filename: string; size: number }>(
    "/support/upload",
    {
      method: "POST",
      body: formData,
    },
  );
}

export function getKnowledgeBaseCategories() {
  return workspaceRequest<{ categories: KnowledgeBaseCategory[] }>("/kb/categories");
}

export function getKnowledgeBaseArticles(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isFaq?: boolean;
  } = {},
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(
    ([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)),
  );
  return workspaceRequest<{ articles: KnowledgeBaseArticle[]; pagination: WorkspacePagination }>(
    `/kb/articles?${query}`,
  );
}

export function getKnowledgeBaseArticle(articleId: string) {
  return workspaceRequest<{ article: KnowledgeBaseArticle }>(`/kb/articles/${articleId}`);
}

export function sendKnowledgeBaseFeedback(articleId: string, rating: "helpful" | "not_helpful") {
  return workspaceRequest<{ message: string; helpfulCount: number; notHelpfulCount: number }>(
    `/kb/articles/${articleId}/feedback`,
    {
      method: "POST",
      body: JSON.stringify({ rating }),
    },
  );
}

export function verifyOnboardingPayment(data: {
  planId: string;
  templateId: string;
  interval: "monthly" | "yearly";
  business: BusinessInfo;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}) {
  return onboardingRequest<{
    message: string;
    website: { id: string; name: string; status: string };
  }>("/verify-payment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Tenant Pages & Blog (Website Scope) ---

export type TenantBlogPost = {
  id: string;
  website: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: { id: string; name: string };
  tags: string[];
  status: "draft" | "published" | "scheduled" | "archived";
  publishedAt?: string;
  seo?: { title: string; description: string; keywords: string[]; ogImage: string };
  readTimeMinutes: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WebsitePage = {
  id: string;
  name: string;
  type: string;
};

export function getTenantPages(websiteId: string) {
  return workspaceRequest<{ pages: WebsitePage[] }>(`/websites/${websiteId}/pages`);
}

export function getTenantBlogPosts(
  websiteId: string,
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(
    ([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)),
  );
  return workspaceRequest<{ posts: TenantBlogPost[]; pagination: WorkspacePagination }>(
    `/websites/${websiteId}/blog?${query}`,
  );
}

export function createTenantBlogPost(websiteId: string, data: Partial<TenantBlogPost>) {
  return workspaceRequest<{ post: TenantBlogPost }>(`/websites/${websiteId}/blog`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTenantBlogPost(
  websiteId: string,
  postId: string,
  data: Partial<TenantBlogPost>,
) {
  return workspaceRequest<{ post: TenantBlogPost }>(`/websites/${websiteId}/blog/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTenantBlogPost(websiteId: string, postId: string) {
  return workspaceRequest<{ success: boolean; message: string }>(
    `/websites/${websiteId}/blog/${postId}`,
    { method: "DELETE" },
  );
}
