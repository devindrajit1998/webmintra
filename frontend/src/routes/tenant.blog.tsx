import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTenantBlogPosts, createTenantBlogPost, deleteTenantBlogPost } from "@/lib/auth-api";
import { useTenantContext } from "@/components/TenantDashboard";
import { Loader2, FileText, Globe, Search, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/tenant/blog")({
  component: BlogPage,
  head: () => ({ meta: [{ title: "Blog | WebMintra" }] }),
});

function BlogPage() {
  const { websites } = useTenantContext();
  const queryClient = useQueryClient();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    status: "draft",
  });

  useEffect(() => {
    if (!selectedWebsiteId && websites.length > 0) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  const { data, isLoading } = useQuery({
    queryKey: ["tenantBlog", selectedWebsiteId, search],
    queryFn: () => getTenantBlogPosts(selectedWebsiteId, { search }),
    enabled: !!selectedWebsiteId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createTenantBlogPost(selectedWebsiteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantBlog", selectedWebsiteId] });
      setIsCreateOpen(false);
      setForm({ title: "", slug: "", content: "", excerpt: "", status: "draft" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTenantBlogPost(selectedWebsiteId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantBlog", selectedWebsiteId] });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  const posts = data?.posts || [];

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
              <FileText className="h-3.5 w-3.5" /> Articles & Editorial
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Blog Posts
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Create, publish, and manage SEO-optimized articles and news for your website.
            </p>
          </div>
          {websites.length > 0 && (
            <button
              onClick={() => setIsCreateOpen(!isCreateOpen)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] cursor-pointer"
            >
              <Plus className="h-4 w-4" /> {isCreateOpen ? "Close Form" : "New Post"}
            </button>
          )}
        </div>
      </section>

      {websites.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center shadow-xs">
          <Globe className="h-12 w-12 text-[#cbd5e1]" />
          <h2 className="mt-4 text-base font-extrabold text-[#0f172a]">No websites found</h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">
            You need to create a website first before you can write and publish blog posts.
          </p>
          <Link
            to="/tenant/websites"
            className="mt-4 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#047857] transition"
          >
            Go to Websites
          </Link>
        </div>
      ) : (
        <>
          {isCreateOpen && (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs animate-in zoom-in-95"
            >
              <h2 className="font-display text-base font-extrabold text-[#0f172a] mb-4">
                Create New Blog Post
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold text-[#0f172a]">
                  Title *
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669]"
                    placeholder="e.g. 10 Essential Tips for Growth"
                  />
                </label>
                <label className="text-xs font-bold text-[#0f172a]">
                  Slug (Optional)
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669]"
                    placeholder="e.g. 10-essential-tips-for-growth"
                  />
                </label>
                <label className="col-span-full text-xs font-bold text-[#0f172a]">
                  Excerpt
                  <input
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669]"
                    placeholder="Brief summary for search engines and social previews..."
                  />
                </label>
                <label className="col-span-full text-xs font-bold text-[#0f172a]">
                  Content (Markdown) *
                  <textarea
                    required
                    rows={8}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] bg-white p-3 font-mono text-xs text-[#0f172a] outline-none focus:border-[#059669]"
                    placeholder="# Hello World..."
                  />
                </label>
                <label className="text-xs font-bold text-[#0f172a]">
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 flex gap-2.5 justify-end border-t border-[#f1f5f9] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-[#059669] px-5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#047857] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{createMutation.isPending ? "Saving..." : "Save Post"}</span>
                </button>
              </div>
            </form>
          )}

          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex flex-col gap-3 border-b border-[#f1f5f9] p-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-[#059669]" />
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="h-10 min-w-48 rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                >
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  placeholder="Search posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full sm:w-64 rounded-xl border border-[#e2e8f0] bg-white pl-10 pr-4 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0f172a]">
                <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                          <span className="text-xs font-semibold text-[#64748b]">
                            Loading posts...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : posts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-xs font-semibold text-[#64748b]"
                      >
                        No blog posts found for this website.
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => (
                      <tr key={post.id} className="transition-colors hover:bg-[#f8fafc]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-bold text-[#0f172a]">{post.title}</div>
                              <div className="font-mono text-[10px] font-semibold text-[#64748b]">
                                /{post.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                              post.status === "published"
                                ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                                : "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]"
                            }`}
                          >
                            {post.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#64748b]">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-[#94a3b8]" />
                            {format(new Date(post.createdAt), "MMM d, yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f8fafc] hover:text-[#059669] cursor-pointer transition"
                              title="Edit post"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(post.id)}
                              className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#fff1f2] hover:text-rose-600 cursor-pointer transition"
                              title="Delete post"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
