const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:5000/api";

export async function getPublicSettings(): Promise<Record<string, any>> {
  const response = await fetch(`${API_URL}/public/settings`);
  const payload = await response.json().catch(() => ({}));
  return payload.settings || {};
}

export async function getPublicTemplates(params?: {
  category?: string;
  limit?: number;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/public/templates${qs}`);
  const payload = await response.json().catch(() => ({ templates: [] }));
  return payload.templates || [];
}

export async function getPublicPlans(): Promise<any[]> {
  const response = await fetch(`${API_URL}/public/plans`);
  const payload = await response.json().catch(() => ({ plans: [] }));
  return payload.plans || [];
}

export async function getPublicTestimonials(): Promise<any[]> {
  const response = await fetch(`${API_URL}/public/testimonials`);
  const payload = await response.json().catch(() => ({ testimonials: [] }));
  return payload.testimonials || [];
}

export async function getPublicTemplatePreview(id: string): Promise<any> {
  const response = await fetch(`${API_URL}/public/templates/${id}`);
  const payload = await response.json().catch(() => ({ template: null }));
  return payload.template || null;
}

export async function getPublicTemplateCategories(): Promise<string[]> {
  const response = await fetch(`${API_URL}/public/template-categories`);
  const payload = await response.json().catch(() => ({ categories: [] }));
  return payload.categories || [];
}

export async function getPublicBlog(params?: {
  category?: string;
  search?: string;
}): Promise<{ posts: any[]; categories: any[] }> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/public/blog${qs}`);
  const payload = await response.json().catch(() => ({ posts: [], categories: [] }));
  return { posts: payload.posts || [], categories: payload.categories || [] };
}

export async function getPublicBlogPost(slug: string): Promise<any> {
  const response = await fetch(`${API_URL}/public/blog/${slug}`);
  const payload = await response.json().catch(() => ({ post: null }));
  return payload.post || null;
}

export async function getPublicKB(params?: {
  category?: string;
  search?: string;
}): Promise<{ articles: any[]; categories: any[] }> {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/public/kb${qs}`);
  const payload = await response.json().catch(() => ({ articles: [], categories: [] }));
  return { articles: payload.articles || [], categories: payload.categories || [] };
}

export async function getPublicKBArticle(slug: string): Promise<any> {
  const response = await fetch(`${API_URL}/public/kb/${slug}`);
  const payload = await response.json().catch(() => ({ article: null }));
  return payload.article || null;
}

export async function getPublicFaqs(): Promise<any[]> {
  const response = await fetch(`${API_URL}/public/faqs`);
  if (!response.ok) return [];
  const payload = await response.json().catch(() => ({ faqs: [] }));
  return payload.faqs || [];
}

export async function submitPublicContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/public/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({ message: "Failed to send message" }));
  if (!response.ok) throw new Error(payload.message || "Failed to submit enquiry.");
  return payload;
}
