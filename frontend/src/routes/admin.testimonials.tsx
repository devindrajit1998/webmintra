import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTestimonials,
  createAdminTestimonial,
  updateAdminTestimonial,
  deleteAdminTestimonial,
} from "@/lib/admin-api";
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  Quote,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/testimonials")({
  component: AdminTestimonialsPage,
});

interface TestimonialForm {
  authorName: string;
  roleOrTitle: string;
  businessName: string;
  location: string;
  quote: string;
  rating: number;
  avatarUrl: string;
  category: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM: TestimonialForm = {
  authorName: "",
  roleOrTitle: "",
  businessName: "",
  location: "Kolkata",
  quote: "",
  rating: 5,
  avatarUrl: "https://i.pravatar.cc/150?img=11",
  category: "General",
  isFeatured: true,
  isActive: true,
  sortOrder: 0,
};

function AdminTestimonialsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TestimonialForm>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["adminTestimonials"],
    queryFn: getAdminTestimonials,
  });

  const testimonials = data?.testimonials || [];

  const createMutation = useMutation({
    mutationFn: createAdminTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTestimonials"] });
      queryClient.invalidateQueries({ queryKey: ["publicTestimonials"] });
      toast.success("Testimonial added successfully!");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create testimonial"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAdminTestimonial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTestimonials"] });
      queryClient.invalidateQueries({ queryKey: ["publicTestimonials"] });
      toast.success("Testimonial updated successfully!");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update testimonial"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminTestimonial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTestimonials"] });
      queryClient.invalidateQueries({ queryKey: ["publicTestimonials"] });
      toast.success("Testimonial deleted!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete testimonial"),
  });

  function openCreate() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function openEdit(t: any) {
    setEditingId(t._id);
    setFormData({
      authorName: t.authorName || "",
      roleOrTitle: t.roleOrTitle || "",
      businessName: t.businessName || "",
      location: t.location || "",
      quote: t.quote || "",
      rating: t.rating || 5,
      avatarUrl: t.avatarUrl || "",
      category: t.category || "General",
      isFeatured: t.isFeatured !== false,
      isActive: t.isActive !== false,
      sortOrder: t.sortOrder || 0,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.authorName.trim() || !formData.quote.trim()) {
      toast.error("Author name and quote are required.");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <Quote className="h-4 w-4 text-[#ea580c]" /> Social Proof &amp; Success Stories
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-1">
            Testimonials Manager
          </h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Manage customer feedback and success stories displayed dynamically on the landing page.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      </div>

      {/* Testimonials List */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6"
            />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center shadow-xs">
          <Quote className="h-10 w-10 text-[#94a3b8] mb-3" />
          <p className="text-base font-bold text-[#0f172a]">No testimonials yet</p>
          <p className="text-xs text-[#64748b] max-w-sm mt-1">
            Add customer feedback to showcase social proof and boost landing page conversion.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add First Testimonial
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t: any) => (
            <div
              key={t._id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5.5 shadow-sm transition-all duration-200 hover:shadow-md ${
                t.isActive
                  ? "border-[#e2e8f0] hover:border-[#a7f3d0]"
                  : "border-[#e2e8f0] bg-[#f8fafc] opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-md bg-[#ecfdf5] px-2.5 py-0.5 text-[10px] font-extrabold text-[#065f46] border border-[#a7f3d0]">
                    {t.category || "General"}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#334155] font-medium leading-relaxed line-clamp-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#f1f5f9] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {t.avatarUrl ? (
                    <img
                      src={t.avatarUrl}
                      alt={t.authorName}
                      className="h-10 w-10 shrink-0 rounded-full object-cover border border-[#cbd5e1] shadow-2xs"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] flex items-center justify-center font-bold text-sm">
                      {t.authorName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold text-[#0f172a] leading-snug truncate">
                      {t.authorName}
                    </p>
                    <p className="text-[11px] text-[#64748b] font-medium truncate mt-0.5">
                      {t.roleOrTitle}
                      {t.businessName ? ` · ${t.businessName}` : ""}
                      {t.location ? ` (${t.location})` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete testimonial from "${t.authorName}"?`)) {
                        deleteMutation.mutate(t._id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-[#ea580c]" />
              {editingId ? "Edit Testimonial" : "Add New Testimonial"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.authorName}
                    onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    value={formData.roleOrTitle}
                    onChange={(e) => setFormData({ ...formData, roleOrTitle: e.target.value })}
                    placeholder="e.g. Gym Owner / Partner"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Pulse Fitness"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Kolkata, Delhi"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0f172a] block mb-1">
                  Testimonial Quote *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="What does the customer say about WebMintra?"
                  className="w-full resize-none rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Fitness, Healthcare"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Rating (1-5)
                  </label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★</option>
                    <option value={3}>3 Stars ★★★</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">Avatar URL</label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[#0f172a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-[#cbd5e1] text-[#059669] focus:ring-[#059669]"
                  />
                  Active &amp; Visible
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-[#0f172a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-[#cbd5e1] text-[#059669] focus:ring-[#059669]"
                  />
                  Featured on Landing Page
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-[#cbd5e1] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white hover:bg-[#047857] transition shadow-xs cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingId
                      ? "Update Testimonial"
                      : "Create Testimonial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
