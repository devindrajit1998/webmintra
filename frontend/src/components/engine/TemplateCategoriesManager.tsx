import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  getTemplateCategories,
  createTemplateCategory,
  updateTemplateCategory,
  deleteTemplateCategory,
} from "@/lib/admin-api";
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

export function TemplateCategoriesManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templateCategories"],
    queryFn: () => getTemplateCategories(),
  });

  const createMutation = useMutation({
    mutationFn: createTemplateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templateCategories"] });
      setIsAdding(false);
      setName("");
      toast.success("Category created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      updateTemplateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templateCategories"] });
      setEditingId(null);
      setName("");
      toast.success("Category updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templateCategories"] });
      setDeleteId(null);
      toast.success("Category deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!name.trim()) return toast.error("Name is required");
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: { name: name.trim() } });
    } else {
      createMutation.mutate({ name: name.trim() });
    }
  };

  const handleEdit = (category: any) => {
    setEditingId(category._id);
    setName(category.name);
    setIsAdding(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6 border-b border-[#e2e8f0] pb-4">
          <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
            Manage Categories
          </h2>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] p-1.5 rounded-lg transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAdding ? (
          <div className="mb-6 p-4 rounded-xl border border-[#e2e8f0] bg-[#fafcfb]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-3">
              {editingId ? "Edit Category" : "New Category"}
            </h3>
            <div className="flex gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category Name"
                className="flex-1 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
              />
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white hover:bg-[#047857] shadow-xs disabled:opacity-50 transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setName("");
                }}
                className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition"
            >
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
            </div>
          ) : data?.categories?.length === 0 ? (
            <p className="text-center text-sm text-[#64748b] py-8">No categories found.</p>
          ) : (
            data?.categories?.map((category: any) => (
              <div
                key={category._id}
                className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#fafcfb] p-3 hover:bg-[#f1f5f9] transition-colors"
              >
                <div>
                  <div className="text-sm font-bold text-[#0f172a]">{category.name}</div>
                  <div className="text-xs text-[#64748b]">{category.slug}</div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-white rounded-lg border border-transparent hover:border-[#e2e8f0] transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(category._id)}
                    className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="z-[80] bg-white border-[#e2e8f0] text-[#0f172a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0f172a]">Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#64748b]">
              This action cannot be undone. Templates using this category will still retain the text
              string, but it won't appear in future dropdowns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteId(null)}
              className="bg-white text-[#475569] border-[#cbd5e1] hover:bg-[#f1f5f9]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
