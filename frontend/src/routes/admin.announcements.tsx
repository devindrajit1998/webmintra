import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getAnnouncements, createAnnouncement } from "@/lib/admin-api";
import { Loader2, Search, Filter, Plus, Megaphone, Trash2, Edit } from "lucide-react";

export const Route = createFileRoute("/admin/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isImportant, setIsImportant] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "info", isImportant: false });

  const { data, isLoading } = useQuery({
    queryKey: ["adminAnnouncements", { page, isImportant }],
    queryFn: () =>
      getAnnouncements({
        page,
        limit: 10,
        isImportant: isImportant ? isImportant === "true" : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAnnouncements"] });
      setIsCreateOpen(false);
      setForm({ title: "", content: "", type: "info", isImportant: false });
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
          <h1 className="font-display text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="mt-1 text-xs text-slate-500">
            Broadcast messages and updates to all tenants.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Create Announcement
        </button>
      </div>

      {isCreateOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-800 bg-[#0b1826] p-5"
        >
          <h2 className="font-display text-lg font-bold mb-4">Create New Announcement</h2>
          <div className="grid gap-4">
            <label className="text-xs font-medium text-slate-300">
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                placeholder="Announcement Title"
              />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Content
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1 h-32 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm"
                placeholder="Message content..."
              />
            </label>
            <div className="flex gap-4">
              <label className="flex-1 text-xs font-medium text-slate-300">
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 pt-6">
                <input
                  type="checkbox"
                  checked={form.isImportant}
                  onChange={(e) => setForm({ ...form, isImportant: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                />
                Mark as Important (Pinned)
              </label>
            </div>
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
              {createMutation.isPending ? "Broadcasting..." : "Broadcast"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative">
              <select
                value={isImportant}
                onChange={(e) => {
                  setIsImportant(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-8 text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All Announcements</option>
                <option value="true">Important Only</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800/70 p-4">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <p className="text-sm text-slate-500">Loading announcements...</p>
              </div>
            </div>
          ) : data?.announcements?.length ? (
            data.announcements.map((announcement: any) => (
              <div key={announcement.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        announcement.type === "warning"
                          ? "bg-amber-500/10 text-amber-400"
                          : announcement.type === "error"
                            ? "bg-rose-500/10 text-rose-400"
                            : announcement.type === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-cyan-500/10 text-cyan-400"
                      }`}
                    >
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-200">{announcement.title}</h3>
                        {announcement.isImportant && (
                          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-400">
                            Important
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{announcement.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Broadcasted on {new Date(announcement.createdAt).toLocaleString()} by{" "}
                        {announcement.author?.name || "System"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="text-slate-400 hover:text-emerald-400" title="Edit">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-slate-400 hover:text-rose-400" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-500">No announcements found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
