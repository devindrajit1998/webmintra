import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
} from "@/lib/admin-api";
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/SaaSSkeletons";

export const Route = createFileRoute("/admin/faqs")({
  component: AdminFaqsPage,
});

interface FaqForm {
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
  sortOrder: number;
}

const EMPTY_FORM: FaqForm = {
  question: "",
  answer: "",
  category: "General",
  isPublished: true,
  sortOrder: 0,
};

export function AdminFaqsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FaqForm>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["adminFaqs"],
    queryFn: getAdminFaqs,
  });

  const faqs = data?.faqs || [];

  const createMutation = useMutation({
    mutationFn: createAdminFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      queryClient.invalidateQueries({ queryKey: ["publicFaqs"] });
      toast.success("FAQ created successfully!");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create FAQ"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAdminFaq(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      queryClient.invalidateQueries({ queryKey: ["publicFaqs"] });
      toast.success("FAQ updated successfully!");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update FAQ"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      queryClient.invalidateQueries({ queryKey: ["publicFaqs"] });
      toast.success("FAQ deleted.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete FAQ"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      updateAdminFaq(id, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFaqs"] });
      queryClient.invalidateQueries({ queryKey: ["publicFaqs"] });
      toast.success("FAQ status updated.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status"),
  });

  const categories = Array.from(new Set(faqs.map((f: any) => f.category || "General"))).filter(Boolean);

  const filteredFaqs = faqs.filter((faq: any) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || faq.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (faq: any) => {
    setEditingId(faq._id);
    setFormData({
      question: faq.question || "",
      answer: faq.answer || "",
      category: faq.category || "General",
      isPublished: faq.isPublished !== false,
      sortOrder: faq.sortOrder ?? 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim()) {
      toast.error("Please enter a question.");
      return;
    }
    if (!formData.answer.trim()) {
      toast.error("Please enter an answer.");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <Sparkles className="h-4 w-4 text-[#ea580c]" /> Landing Page &amp; Support Content
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0b192c] mt-1">
            FAQ Management
          </h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Manage questions and answers displayed in the "Everything you need to know" landing section.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Add FAQ
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#cbd5e1] bg-white text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-[#059669] text-white"
                : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0b192c]"
            }`}
          >
            All Categories ({faqs.length})
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#059669] text-white"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0b192c]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FAQs Table / List */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : filteredFaqs.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="h-10 w-10 text-[#94a3b8] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#0b192c]">No FAQs Found</h3>
            <p className="text-xs text-[#64748b] mt-1">
              {searchQuery ? "No questions match your search query." : "Click Add FAQ to create your first question."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {filteredFaqs.map((faq: any, idx: number) => (
              <div
                key={faq._id}
                className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-[#f8fafc] transition"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                      {faq.category || "General"}
                    </span>
                    <span className="text-[11px] font-mono text-[#94a3b8]">
                      Order: {faq.sortOrder ?? idx + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0b192c]">
                    {faq.question}
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      togglePublishMutation.mutate({
                        id: faq._id,
                        isPublished: !faq.isPublished,
                      })
                    }
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      faq.isPublished
                        ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                        : "border-[#cbd5e1] bg-white text-[#64748b]"
                    }`}
                  >
                    {faq.isPublished ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {faq.isPublished ? "Live" : "Draft"}
                  </button>

                  <button
                    onClick={() => openEditModal(faq)}
                    className="p-2 rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0b192c] transition"
                    title="Edit FAQ"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this FAQ?")) {
                        deleteMutation.mutate(faq._id);
                      }
                    }}
                    className="p-2 rounded-lg border border-[#fee2e2] bg-white text-[#dc2626] hover:bg-[#fef2f2] transition"
                    title="Delete FAQ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
              <h2 className="text-sm font-bold text-[#0b192c]">
                {editingId ? "Edit FAQ" : "Create New FAQ"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-[#e2e8f0] bg-white p-1 text-[#64748b] hover:bg-[#f1f5f9]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. Do I need any coding skills?"
                  className="w-full h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1">
                  Answer *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Detailed answer explaining to the customer..."
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white p-3 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Domain, General, Pricing"
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#475569] mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full h-9 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none transition focus:border-[#ea580c]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#f1f5f9]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0b192c]">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded border-[#cbd5e1] text-[#059669] focus:ring-[#059669]"
                  />
                  <span>Publish live to landing page</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-[#cbd5e1] bg-white text-xs font-bold text-[#475569] hover:bg-[#f1f5f9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2 rounded-lg bg-[#059669] text-xs font-bold text-white shadow-sm hover:bg-[#047857] transition disabled:opacity-50"
                  >
                    {editingId ? "Save Changes" : "Create FAQ"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
