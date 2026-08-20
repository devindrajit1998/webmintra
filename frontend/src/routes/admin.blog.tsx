import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getBlogPosts,
  getBlogCategories,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  uploadImage,
} from "@/lib/admin-api";
import {
  Loader2,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  Tag,
  Key,
  Globe,
  X,
  Sparkles,
  Layers,
  FolderPlus,
  Hash,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RichCKEditor } from "@/components/RichCKEditor";

export const Route = createFileRoute("/admin/blog")({
  component: BlogPage,
});

function BlogPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"posts" | "categories">("posts");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [viewingPost, setViewingPost] = useState<any | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  // Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [autoCategorySlug, setAutoCategorySlug] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "",
    coverImage: "",
    tagsString: "",
    keywordsString: "",
    seoTitle: "",
    seoDescription: "",
    status: "draft",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["adminBlog", { page, search, status, category: selectedCategoryFilter }],
    queryFn: () =>
      getBlogPosts({
        page,
        limit: 10,
        search,
        status,
        category: selectedCategoryFilter || undefined,
      }),
  });

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["adminBlogCategories"],
    queryFn: () => getBlogCategories(),
  });

  const categories = categoriesData?.categories || [];

  const createMutation = useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      queryClient.invalidateQueries({ queryKey: ["adminBlogCategories"] });
      toast.success("Blog post created successfully");
      closeEditor();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create post"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBlogPost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      queryClient.invalidateQueries({ queryKey: ["adminBlogCategories"] });
      toast.success("Blog post updated successfully");
      closeEditor();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update post"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: "published" | "draft" }) =>
      updateBlogPost(id, { status: newStatus }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      toast.success(
        vars.newStatus === "published"
          ? "Post published live to platform!"
          : "Post reverted to draft",
      );
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      queryClient.invalidateQueries({ queryKey: ["adminBlogCategories"] });
      toast.success("Blog post deleted");
      setDeletePostId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete post"),
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: createBlogCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlogCategories"] });
      toast.success("Category created successfully");
      closeCategoryModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create category"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBlogCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlogCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      toast.success("Category updated successfully");
      closeCategoryModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update category"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteBlogCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBlogCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminBlog"] });
      toast.success("Category deleted");
      setDeleteCategoryId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete category"),
  });

  function openCreate() {
    setEditingPostId(null);
    setAutoSlug(true);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: categories[0]?._id || "",
      coverImage: "",
      tagsString: "",
      keywordsString: "",
      seoTitle: "",
      seoDescription: "",
      status: "draft",
    });
    setIsEditorOpen(true);
  }

  function openEdit(post: any) {
    setEditingPostId(post.id || post._id);
    setAutoSlug(false);
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category?._id || post.category || "",
      coverImage: post.coverImage || "",
      tagsString: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      keywordsString: Array.isArray(post.seo?.keywords) ? post.seo.keywords.join(", ") : "",
      seoTitle: post.seo?.title || "",
      seoDescription: post.seo?.description || "",
      status: post.status || "draft",
    });
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingPostId(null);
  }

  function openCreateCategory() {
    setEditingCategoryId(null);
    setAutoCategorySlug(true);
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      sortOrder: categories.length,
      isActive: true,
    });
    setIsCategoryModalOpen(true);
  }

  function openEditCategory(cat: any) {
    setEditingCategoryId(cat._id || cat.id);
    setAutoCategorySlug(false);
    setCategoryForm({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive !== false,
    });
    setIsCategoryModalOpen(true);
  }

  function closeCategoryModal() {
    setIsCategoryModalOpen(false);
    setEditingCategoryId(null);
  }

  function handleCategoryNameChange(val: string) {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setCategoryForm((prev) => ({
      ...prev,
      name: val,
      slug: autoCategorySlug ? slug : prev.slug,
    }));
  }

  function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (!categoryForm.slug.trim()) {
      toast.error("Category slug is required");
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      slug: categoryForm.slug.trim().toLowerCase(),
      description: categoryForm.description.trim(),
      sortOrder: Number(categoryForm.sortOrder) || 0,
      isActive: categoryForm.isActive,
    };

    if (editingCategoryId) {
      updateCategoryMutation.mutate({ id: editingCategoryId, data: payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  }

  function handleTitleChange(val: string) {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: autoSlug ? slug : prev.slug,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = form.tagsString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const keywords = form.keywordsString
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const payload: any = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      category: form.category || undefined,
      coverImage: form.coverImage.trim() || undefined,
      tags,
      status: form.status,
      seo: {
        title: form.seoTitle.trim() || form.title.trim(),
        description: form.seoDescription.trim() || form.excerpt.trim(),
        keywords,
      },
    };

    if (editingPostId) {
      updateMutation.mutate({ id: editingPostId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filteredCategories = categories.filter((c: any) =>
    categorySearch
      ? c.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
        c.slug?.toLowerCase().includes(categorySearch.toLowerCase())
      : true,
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header & Tabs */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b192c]">
            Blog &amp; Content Hub
          </h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Manage platform blog posts, dynamic categories, rich WYSIWYG content, and SEO metadata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "posts" ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
            >
              <Plus className="h-4 w-4" /> Create Post
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateCategory}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#ea580c] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#c2410c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c]"
            >
              <FolderPlus className="h-4 w-4" /> Add Category
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b border-[#e2e8f0]">
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "posts"
              ? "border-[#059669] text-[#059669]"
              : "border-transparent text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0b192c]"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Articles &amp; Posts</span>
          <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
            {data?.pagination?.total || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
            activeTab === "categories"
              ? "border-[#ea580c] text-[#ea580c]"
              : "border-transparent text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0b192c]"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Dynamic Categories</span>
          <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
            {categories.length}
          </span>
        </button>
      </div>

      {/* Editor Modal / Form - Fullscreen */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-white animate-in fade-in duration-200">
          <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#ea580c]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0b192c]">
                    {editingPostId ? "Edit Blog Post" : "Create New Blog Post"}
                  </h2>
                  <p className="text-[11px] font-medium text-[#64748b]">
                    Manage rich content, publishing status, and SEO metadata
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-[#e2e8f0] bg-white p-2 text-[#64748b] shadow-2xs hover:bg-[#f1f5f9] hover:text-[#0b192c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: 2-Column Responsive Workspace */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Left Column: Title, Slug, & Full Rich Content (8 cols) */}
                  <div className="space-y-4 lg:col-span-8 flex flex-col">
                    <div className="grid gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">
                          Post Title *
                        </label>
                        <input
                          required
                          value={form.title}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          className="w-full h-10 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 text-sm font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10"
                          placeholder="e.g. Why Every Small Business in India Needs a Website in 2026"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-[#475569]">
                            URL Slug *
                          </label>
                          <button
                            type="button"
                            onClick={() => setAutoSlug(!autoSlug)}
                            className="text-[10px] font-semibold text-[#ea580c] hover:underline"
                          >
                            {autoSlug ? "⚡ Auto ON" : "✏️ Manual"}
                          </button>
                        </div>
                        <input
                          required
                          value={form.slug}
                          onChange={(e) => {
                            setAutoSlug(false);
                            setForm({ ...form, slug: e.target.value });
                          }}
                          className="w-full h-10 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3 text-xs font-mono text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:bg-white focus:ring-2 focus:ring-[#ea580c]/10"
                          placeholder="why-every-small-business-needs-a-website"
                        />
                      </div>
                    </div>

                    {/* Content Area - Full Wide CKEditor */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold text-[#475569]">
                          Article Content (WYSIWYG Rich Editor) *
                        </label>
                        <span className="text-[10px] text-[#64748b]">
                          Supports Headings, Lists, Quotes, Tables &amp; Formatting
                        </span>
                      </div>
                      <RichCKEditor
                        value={form.content}
                        onChange={(val) => setForm({ ...form, content: val })}
                        placeholder="Write your article content with headings, lists, quotes, and images..."
                        minHeight="480px"
                      />
                    </div>
                  </div>

                  {/* Right Column: Settings, Status, Excerpt & SEO (4 cols) */}
                  <div className="space-y-4 lg:col-span-4 flex flex-col">
                    {/* Publishing & Category Card */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-3.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b192c]">
                        Publishing Settings
                      </h3>
                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">
                          Category
                        </label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                        >
                          <option value="">No Category (General)</option>
                          {categories.map((c: any) => (
                            <option key={c._id || c.id} value={c._id || c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">
                          Publishing Status
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="flex-1 h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                          >
                            <option value="draft">Draft (Private)</option>
                            <option value="published">Published (Live)</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                status: form.status === "published" ? "draft" : "published",
                              })
                            }
                            className={`h-9 px-3 rounded-lg border text-xs font-bold transition shadow-2xs ${
                              form.status === "published"
                                ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                                : "border-[#cbd5e1] bg-white text-[#475569] hover:border-[#a7f3d0] hover:text-[#047857]"
                            }`}
                          >
                            {form.status === "published" ? "✓ Live" : "Publish"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-[#475569]">
                            Cover Image
                          </label>
                          <label className="cursor-pointer text-[10px] font-bold text-[#ea580c] hover:underline flex items-center gap-1">
                            <Upload className="h-3 w-3" />
                            <span>Upload File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (!file.type.startsWith("image/")) {
                                  toast.error("Please upload a valid image file");
                                  return;
                                }
                                try {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  toast.loading("Uploading cover image...", { id: "upload-cover" });
                                  const res = await uploadImage(formData);
                                  if (res?.url) {
                                    setForm((prev) => ({ ...prev, coverImage: res.url }));
                                    toast.success("Cover image uploaded successfully!", {
                                      id: "upload-cover",
                                    });
                                  }
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to upload image", {
                                    id: "upload-cover",
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={form.coverImage}
                            onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                            className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                            placeholder="https://... or click Upload File"
                          />
                        </div>
                        {form.coverImage && (
                          <div className="mt-2 relative rounded-lg border border-[#e2e8f0] overflow-hidden bg-slate-100 h-24 flex items-center justify-center group">
                            <img
                              src={form.coverImage}
                              alt="Cover preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, coverImage: "" })}
                              className="absolute top-1.5 right-1.5 rounded-md bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
                              title="Remove image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Excerpt Card */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <label className="block text-[11px] font-bold text-[#475569] mb-1">
                        Excerpt / Short Summary
                      </label>
                      <textarea
                        rows={3}
                        value={form.excerpt}
                        onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                        className="w-full rounded-lg border border-[#cbd5e1] bg-white p-2.5 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                        placeholder="Brief 1-2 sentence preview for search cards..."
                      />
                    </div>

                    {/* SEO & Keywords Card */}
                    <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed]/50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#ea580c]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b192c]">
                          SEO &amp; Keywords
                        </h3>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#475569] mb-1">
                          <Key className="h-3.5 w-3.5 text-[#ea580c]" /> SEO Keywords
                        </label>
                        <input
                          value={form.keywordsString}
                          onChange={(e) => setForm({ ...form, keywordsString: e.target.value })}
                          className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                          placeholder="e.g. indian website, website builder"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#475569] mb-1">
                          <Tag className="h-3.5 w-3.5 text-[#059669]" /> Tags &amp; Topics
                        </label>
                        <input
                          value={form.tagsString}
                          onChange={(e) => setForm({ ...form, tagsString: e.target.value })}
                          className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/10"
                          placeholder="e.g. digital, ecommerce, startup"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Fixed Bar with Clean Alignment */}
              <div className="flex shrink-0 items-center justify-between border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
                <p className="text-xs text-[#64748b]">
                  {form.status === "published"
                    ? "🟢 This post will be live publicly on your website"
                    : "⚪ This post will be saved as private draft"}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f1f5f9] hover:text-[#0b192c]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#059669] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-50"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {editingPostId
                      ? form.status === "published"
                        ? "Update & Publish"
                        : "Update Post"
                      : form.status === "published"
                        ? "Save & Publish Live"
                        : "Save Draft"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Post Detail Modal - Fullscreen */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-white animate-in fade-in duration-200">
          <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                    viewingPost.status === "published"
                      ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                      : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
                  }`}
                >
                  {viewingPost.status}
                </span>
                <span className="text-xs text-[#64748b] font-mono">/{viewingPost.slug}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPost(null)}
                className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b192c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 2-Column Responsive Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Main Article Content (8 cols) */}
                <div className="space-y-5 lg:col-span-8">
                  <div>
                    <span className="inline-block rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#047857]">
                      {viewingPost.category?.name || "General"}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c] mt-2 leading-tight">
                      {viewingPost.title}
                    </h1>
                    <p className="text-xs text-[#64748b] mt-2">
                      Published: {viewingPost.publishedAt ? new Date(viewingPost.publishedAt).toLocaleDateString() : "Unpublished (Draft)"} · Author: {viewingPost.author?.name || "Admin"}
                    </p>
                  </div>

                  {viewingPost.excerpt && (
                    <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed]/60 p-4 text-xs sm:text-sm font-medium text-[#9a3412] leading-relaxed">
                      {viewingPost.excerpt}
                    </div>
                  )}

                  {viewingPost.coverImage && (
                    <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                      <img
                        src={viewingPost.coverImage}
                        alt={viewingPost.title}
                        className="w-full max-h-[360px] object-cover"
                      />
                    </div>
                  )}

                  {/* Body Content */}
                  <div
                    className="prose prose-slate max-w-none text-sm leading-relaxed text-[#334155] border-t border-[#f1f5f9] pt-5"
                    dangerouslySetInnerHTML={{ __html: viewingPost.content || "" }}
                  />
                </div>

                {/* Metadata & SEO Sidebar (4 cols) */}
                <div className="space-y-4 lg:col-span-4 border-t border-[#e2e8f0] pt-6 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
                  {/* SEO Keywords Card */}
                  {viewingPost.seo?.keywords?.length > 0 && (
                    <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed]/50 p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b192c]">
                        <Key className="h-3.5 w-3.5 text-[#ea580c]" />
                        <span>SEO Keywords ({viewingPost.seo.keywords.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {viewingPost.seo.keywords.map((k: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]"
                          >
                            <Key className="h-2.5 w-2.5" /> {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags Card */}
                  {viewingPost.tags?.length > 0 && (
                    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b192c]">
                        <Tag className="h-3.5 w-3.5 text-[#059669]" />
                        <span>Tags &amp; Topics ({viewingPost.tags.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {viewingPost.tags.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#475569]"
                          >
                            <Tag className="h-2.5 w-2.5" /> #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post Info Summary Card */}
                  <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-2 text-xs">
                    <h4 className="font-bold text-[#0b192c] mb-1">Post Details</h4>
                    <div className="flex justify-between text-[#64748b]">
                      <span>Views:</span>
                      <span className="font-semibold text-[#0b192c]">{viewingPost.viewCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-[#64748b]">
                      <span>Reading Time:</span>
                      <span className="font-semibold text-[#0b192c]">{viewingPost.readTimeMinutes || 3} min</span>
                    </div>
                    <div className="flex justify-between text-[#64748b]">
                      <span>Created:</span>
                      <span className="font-semibold text-[#0b192c]">
                        {viewingPost.createdAt ? new Date(viewingPost.createdAt).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
              <a
                href={`/blog/${viewingPost.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline"
              >
                <Globe className="h-3.5 w-3.5" /> View on Live Website
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const post = viewingPost;
                    setViewingPost(null);
                    openEdit(post);
                  }}
                  className="h-8 rounded-lg bg-[#059669] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#047857]"
                >
                  Edit Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Posts or Categories */}
      {activeTab === "posts" ? (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#f8fafc]">
            <div className="flex flex-wrap w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  placeholder="Search posts or keywords..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-4 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => {
                    setSelectedCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border border-[#cbd5e1] bg-white pl-3 pr-8 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c]"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat: any) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border border-[#cbd5e1] bg-white pl-3 pr-8 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c]"
                >
                  <option value="">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Title &amp; URL</th>
                  <th className="px-6 py-3.5 font-bold">Category</th>
                  <th className="px-6 py-3.5 font-bold">SEO Keywords &amp; Tags</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold">Published Date</th>
                  <th className="px-6 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#64748b]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-7 w-7 animate-spin text-[#ea580c]" />
                        <p className="text-xs font-medium text-[#64748b]">Loading blog posts...</p>
                      </div>
                    </td>
                  </tr>
                ) : data?.posts?.length ? (
                  data.posts.map((post: any) => (
                    <tr key={post._id || post.id} className="transition-colors hover:bg-[#f8fafc]">
                      <td className="px-6 py-4">
                        <p className="font-bold text-xs text-[#0b192c] line-clamp-1">{post.title}</p>
                        <p className="text-[10px] font-mono text-[#64748b] mt-0.5">/{post.slug}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#475569]">
                        {post.category?.name || "General"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {post.seo?.keywords?.slice(0, 2).map((k: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-1.5 py-0.5 text-[9px] font-bold text-[#c2410c]"
                            >
                              {k}
                            </span>
                          ))}
                          {post.tags?.slice(0, 2).map((t: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-md border border-[#cbd5e1] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#475569]"
                            >
                              #{t}
                            </span>
                          ))}
                          {(!post.seo?.keywords?.length && !post.tags?.length) && (
                            <span className="text-[10px] text-[#94a3b8]">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            togglePublishMutation.mutate({
                              id: post._id || post.id,
                              newStatus: post.status === "published" ? "draft" : "published",
                            })
                          }
                          title="Click to toggle publish status"
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize transition shadow-2xs ${
                            post.status === "published"
                              ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857] hover:bg-[#d1fae5]"
                              : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] hover:bg-[#ffedd5]"
                          }`}
                        >
                          {post.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#64748b]">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingPost(post)}
                            className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 text-[#475569] shadow-2xs transition hover:border-[#cbd5e1] hover:text-[#0b192c]"
                            title="View Post"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(post)}
                            className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 text-[#475569] shadow-2xs transition hover:border-[#cbd5e1] hover:text-[#0b192c]"
                            title="Edit Post"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletePostId(post._id || post.id)}
                            className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] p-1.5 text-[#e11d48] shadow-2xs transition hover:bg-[#ffe4e6]"
                            title="Delete Post"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#64748b]">
                      No blog posts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Categories Table Card */
        <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#f8fafc]">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-white pl-9 pr-4 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748b] font-medium">
                Total {filteredCategories.length} Categories
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Category Name</th>
                  <th className="px-6 py-3.5 font-bold">Slug</th>
                  <th className="px-6 py-3.5 font-bold">Description</th>
                  <th className="px-6 py-3.5 font-bold">Articles Count</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {isCategoriesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#64748b]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-7 w-7 animate-spin text-[#ea580c]" />
                        <p className="text-xs font-medium text-[#64748b]">Loading categories...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCategories.length ? (
                  filteredCategories.map((cat: any) => (
                    <tr key={cat._id || cat.id} className="transition-colors hover:bg-[#f8fafc]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[#ea580c] font-bold text-xs">
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#0b192c]">{cat.name}</p>
                            <p className="text-[10px] text-[#64748b]">Order: {cat.sortOrder ?? 0}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#64748b]">
                        <span className="rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                          /{cat.slug}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#475569] max-w-xs truncate">
                        {cat.description || <span className="text-[#94a3b8] italic">No description</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter(cat._id || cat.id);
                            setActiveTab("posts");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#cbd5e1] bg-white px-2.5 py-0.5 text-xs font-bold text-[#0b192c] shadow-2xs hover:border-[#ea580c] hover:text-[#ea580c]"
                          title="Click to view posts in this category"
                        >
                          <FileText className="h-3 w-3 text-[#ea580c]" />
                          <span>{cat.postCount || 0} posts</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold capitalize ${
                            cat.isActive !== false
                              ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                              : "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]"
                          }`}
                        >
                          {cat.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCategory(cat)}
                            className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 text-[#475569] shadow-2xs transition hover:border-[#cbd5e1] hover:text-[#0b192c]"
                            title="Edit Category"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCategoryId(cat._id || cat.id)}
                            className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] p-1.5 text-[#e11d48] shadow-2xs transition hover:bg-[#ffe4e6]"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#64748b]">
                      No categories found. Click "Add Category" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#ea580c]">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0b192c]">
                    {editingCategoryId ? "Edit Blog Category" : "Add Blog Category"}
                  </h3>
                  <p className="text-[11px] font-medium text-[#64748b]">
                    Manage categories and topic classification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-lg border border-[#e2e8f0] bg-white p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b192c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0b192c] mb-1.5">
                  Category Name *
                </label>
                <input
                  required
                  value={categoryForm.name}
                  onChange={(e) => handleCategoryNameChange(e.target.value)}
                  placeholder="e.g. Website Growth, E-commerce, Technology"
                  className="w-full h-9 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0b192c]">URL Slug *</label>
                  <button
                    type="button"
                    onClick={() => setAutoCategorySlug(!autoCategorySlug)}
                    className="text-[10px] font-semibold text-[#ea580c] hover:underline"
                  >
                    {autoCategorySlug ? "⚡ Auto-generating" : "✏️ Manual"}
                  </button>
                </div>
                <div className="flex items-center rounded-xl border border-[#cbd5e1] bg-white shadow-2xs overflow-hidden focus-within:border-[#ea580c] focus-within:ring-2 focus-within:ring-[#ea580c]/10">
                  <span className="bg-[#f8fafc] px-3 py-2 text-xs font-mono text-[#64748b] border-r border-[#cbd5e1]">
                    /category/
                  </span>
                  <input
                    required
                    value={categoryForm.slug}
                    onChange={(e) => {
                      setAutoCategorySlug(false);
                      setCategoryForm({ ...categoryForm, slug: e.target.value });
                    }}
                    placeholder="website-growth"
                    className="w-full h-9 px-3 text-xs font-mono text-[#0b192c] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0b192c] mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description of what articles belong to this topic..."
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0b192c] mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={categoryForm.sortOrder}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full h-9 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0b192c] mb-1.5">
                    Status
                  </label>
                  <select
                    value={categoryForm.isActive ? "active" : "inactive"}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, isActive: e.target.value === "active" })
                    }
                    className="w-full h-9 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs hover:bg-[#f1f5f9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#ea580c] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#c2410c] disabled:opacity-50"
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {editingCategoryId ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-[#0b192c]">
                  Delete Category
                </AlertDialogTitle>
                <p className="text-[11px] font-medium text-[#64748b]">This action cannot be undone</p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs font-medium text-[#475569] leading-relaxed pt-2">
              Are you sure you want to permanently delete this blog category? Posts linked to this category will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0b192c]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategoryId && deleteCategoryMutation.mutate(deleteCategoryId)}
              className="inline-flex h-9 items-center rounded-xl bg-[#e11d48] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#be123c]"
            >
              {deleteCategoryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Post Confirmation AlertDialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-[#0b192c]">
                  Delete Blog Post
                </AlertDialogTitle>
                <p className="text-[11px] font-medium text-[#64748b]">This action cannot be undone</p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs font-medium text-[#475569] leading-relaxed pt-2">
              Are you sure you want to permanently delete this blog post from the platform?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0b192c]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && deleteMutation.mutate(deletePostId)}
              className="inline-flex h-9 items-center rounded-xl bg-[#e11d48] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#be123c]"
            >
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
