import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getNotifications, createNotification } from "@/lib/admin-api";
import { Loader2, Search, Plus, Bell, Trash2, Send } from "lucide-react";

import { toast } from "sonner";
export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", type: "info", targetUser: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["adminNotifications", { page }],
    queryFn: () => getNotifications({ page, limit: 10 }),
  });

  const createMutation = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      setIsCreateOpen(false);
      setForm({ title: "", message: "", type: "info", targetUser: "" });
      toast.success("Notification sent successfully.");
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
          <h1 className="font-display text-2xl font-bold tracking-tight">System Notifications</h1>
          <p className="mt-1 text-xs text-slate-500">
            Send in-app notifications to specific users or broadcast to all.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          <Send className="h-4 w-4" /> Send Notification
        </button>
      </div>

      {isCreateOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-800 bg-[#0b1826] p-5"
        >
          <h2 className="font-display text-lg font-bold mb-4">New Notification</h2>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-300">
                Title
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                  placeholder="Notification Title"
                />
              </label>
              <label className="text-xs font-medium text-slate-300">
                Target User (Optional)
                <input
                  value={form.targetUser}
                  onChange={(e) => setForm({ ...form, targetUser: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
                  placeholder="User ID (leave blank to broadcast)"
                />
              </label>
            </div>
            <label className="text-xs font-medium text-slate-300">
              Message
              <textarea
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-1 h-24 w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm"
                placeholder="Notification content..."
              />
            </label>
            <label className="text-xs font-medium text-slate-300 w-full sm:w-1/2">
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
              {createMutation.isPending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="divide-y divide-slate-800/70 p-4">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <p className="text-sm text-slate-500">Loading notifications...</p>
              </div>
            </div>
          ) : data?.notifications?.length ? (
            data.notifications.map((notification: any) => (
              <div key={notification.id || notification._id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        notification.type === "warning"
                          ? "bg-amber-500/10 text-amber-400"
                          : notification.type === "error"
                            ? "bg-rose-500/10 text-rose-400"
                            : notification.type === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-cyan-500/10 text-cyan-400"
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-200">{notification.title}</h3>
                        {!notification.targetUser && (
                          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-300">
                            Broadcast
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span>Sent on {new Date(notification.createdAt).toLocaleString()}</span>
                        {notification.targetUser && <span>To: {notification.targetUser}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="text-slate-500 hover:text-rose-400" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-500">No sent notifications found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
