import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getBlogPosts, createBlogPost } from "@/lib/admin-api";
import { Loader2, Search, Filter, Plus, Edit, Trash2, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/blog")({
  component: BlogPage,
});

function BlogPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    status: "draft",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["adminBlog", { page, search, status }],
    queryFn: () => getBlogPosts({ page, limit: 10, search, status }),
  });

  const createMutation = useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      setIsCreateOpen(false);
      setForm({ title: "", slug: "", excerpt: "", content: "", status: "draft" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Blog Management</h1>
          <p className="mt-1 text-xs text-slate-500">
            Create and manage content for the platform blog.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Create Post
        </button>
      </div>

      {isCreateOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-800 bg-[#0b1826] p-5"
        >
          <h2 className="font-display text-lg font-bold mb-4">Create New Post</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-300">
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                placeholder="Post Title"
              />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Slug
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                placeholder="post-url-slug"
              />
            </label>
            <label className="col-span-full text-xs font-medium text-slate-300">
              Excerpt
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="mt-1 h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm"
                placeholder="Brief description..."
              />
            </label>
            <label className="col-span-full text-xs font-medium text-slate-300">
              Content
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1 h-64 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm font-mono"
                placeholder="# Markdown content here..."
              />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {createMutation.isPending ? "Saving..." : "Save Post"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-8 text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Author</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Published Date</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      <p className="text-sm text-slate-500">Loading blog posts...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.posts?.length ? (
                data.posts.map((post: any) => (
                  <tr key={post.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{post.title}</p>
                      <p className="text-[10px] text-slate-500">/{post.slug}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{post.author?.name || "System"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          post.status === "published"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="text-slate-400 hover:text-cyan-400" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-slate-400 hover:text-emerald-400" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-slate-400 hover:text-rose-400" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No blog posts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
