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
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", status: "draft" });

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
    <div className="mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-cyan-400">
            <FileText className="h-4 w-4" /> Manage Content
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Blog Posts</h1>
          <p className="mt-2 text-sm text-slate-400">
            Write and publish blog posts for your website visitors to read.
          </p>
        </div>
        {websites.length > 0 && (
          <button 
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> New Post
          </button>
        )}
      </header>

      {websites.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0b1826] p-8 text-center">
          <Globe className="h-10 w-10 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold text-slate-200">No websites found</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            You need to create a website first before you can write blog posts.
          </p>
          <Link
            to="/tenant/websites"
            className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 hover:bg-cyan-400"
          >
            Go to Websites
          </Link>
        </div>
      ) : (
        <>
          {isCreateOpen && (
            <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-800 bg-[#0b1826] p-5">
              <h2 className="font-display text-lg font-bold mb-4">Create New Post</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-medium text-slate-300">Title
                  <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" placeholder="Post Title" />
                </label>
                <label className="text-xs font-medium text-slate-300">Slug (Optional)
                  <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" placeholder="my-awesome-post" />
                </label>
                <label className="col-span-full text-xs font-medium text-slate-300">Excerpt
                  <input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" placeholder="Short description..." />
                </label>
                <label className="col-span-full text-xs font-medium text-slate-300">Content (Markdown)
                  <textarea required value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="mt-1 h-64 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm font-mono" placeholder="# Hello World..." />
                </label>
                <label className="text-xs font-medium text-slate-300">Status
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 disabled:opacity-50 flex items-center justify-center gap-2">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {createMutation.isPending ? "Saving..." : "Save Post"}
                </button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">Website:</span>
                <select
                  value={selectedWebsiteId}
                  onChange={(e) => setSelectedWebsiteId(e.target.value)}
                  className="h-9 min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                >
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input 
                  placeholder="Search posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                    <th className="px-6 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                          <span className="text-slate-500">Loading posts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : posts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                        No blog posts found.
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => (
                      <tr key={post.id} className="transition-colors hover:bg-slate-800/20">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-200">{post.title}</div>
                              <div className="text-[10px] text-slate-500">/{post.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${
                            post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(post.createdAt), "MMM d, yyyy")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-1 text-slate-400 hover:text-cyan-400" title="Edit post">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => deleteMutation.mutate(post.id)}
                              className="p-1 text-slate-400 hover:text-rose-400" 
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
