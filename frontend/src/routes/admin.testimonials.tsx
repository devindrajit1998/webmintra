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

export function AdminTestimonialsPage() {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Quote className="h-6 w-6 text-cyan-400" /> Testimonials Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage customer feedback and success stories displayed dynamically on the landing page.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      </div>

      {/* Testimonials List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-[#0b1826] p-6"
            />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#091521] p-12 text-center">
          <Quote className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-base font-bold text-white">No testimonials yet</p>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            Add customer feedback to showcase social proof and boost landing page conversion.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add First Testimonial
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t: any) => (
            <div
              key={t._id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                t.isActive
                  ? "border-slate-800 bg-[#0b1826] hover:border-slate-700"
                  : "border-slate-800/40 bg-[#08121d]/50 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
                    {t.category || "General"}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-slate-300 italic leading-relaxed line-clamp-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.avatarUrl ? (
                    <img
                      src={t.avatarUrl}
                      alt={t.authorName}
                      className="h-10 w-10 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                      {t.authorName?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{t.authorName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.roleOrTitle}
                      {t.businessName ? ` · ${t.businessName}` : ""}
                      {t.location ? ` (${t.location})` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0b1826] p-6 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              {editingId ? "Edit Testimonial" : "Add New Testimonial"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.authorName}
                    onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    value={formData.roleOrTitle}
                    onChange={(e) => setFormData({ ...formData, roleOrTitle: e.target.value })}
                    placeholder="e.g. Gym Owner / Partner"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Pulse Fitness"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Kolkata, Delhi"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Testimonial Quote *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="What does the customer say about WebMintra?"
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Fitness, Healthcare"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Rating (1-5)
                  </label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★</option>
                    <option value={3}>3 Stars ★★★</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  Active & Visible
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                  />
                  Featured on Landing Page
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition"
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
