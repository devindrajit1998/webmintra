import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { getTemplateCategories, createTemplateCategory, updateTemplateCategory, deleteTemplateCategory } from "@/lib/admin-api";
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0b1826] p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Manage Categories
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAdding ? (
          <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
            <h3 className="text-sm font-medium text-white mb-3">
              {editingId ? "Edit Category" : "New Category"}
            </h3>
            <div className="flex gap-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category Name"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setName("");
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>
        )}

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            </div>
          ) : data?.categories?.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">No categories found.</p>
          ) : (
            data?.categories?.map((category: any) => (
              <div
                key={category._id}
                className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-900/30 p-3 hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-slate-200">{category.name}</div>
                  <div className="text-xs text-slate-500">{category.slug}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(category._id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#0b1826] border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. Templates using this category will still retain the text string, but it won't appear in the dropdown.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
