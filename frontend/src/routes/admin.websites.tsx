import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getAdminWebsites, updateWebsiteTemplate, getTemplates } from "@/lib/admin-api";
import { Loader2, Search, Filter, Monitor, Calendar, Clock, Archive, Pencil } from "lucide-react";

import { toast } from "sonner";
export const Route = createFileRoute("/admin/websites")({
  component: WebsitesPage,
});

function WebsitesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editingTemplateFor, setEditingTemplateFor] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminWebsites", { page, search, status }],
    queryFn: () => getAdminWebsites({ page, limit: 10, search, status }),
  });

  const { data: templatesData } = useQuery({
    queryKey: ["adminTemplates"],
    queryFn: () => getTemplates({ limit: 100 }),
    enabled: !!editingTemplateFor,
  });

  const templateMutation = useMutation({
    mutationFn: (templateId: string) => updateWebsiteTemplate(editingTemplateFor.id, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWebsites"] });
      setEditingTemplateFor(null);
      setSelectedTemplateId("");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Websites</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Read-only oversight of websites created by tenants.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#fafcfb]">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                placeholder="Search websites or templates..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-4 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-8 text-xs font-medium text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#475569] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Website</th>
                <th className="px-6 py-3.5 font-bold">Tenant</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Activity</th>
                <th className="px-6 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                      <p className="text-sm font-medium text-[#64748b]">Loading websites...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.websites?.length ? (
                data.websites.map((website: any) => (
                  <tr key={website.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
                          <Monitor className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-[#0f172a]">{website.name}</p>
                          <p className="text-xs text-[#64748b]">
                            Template: <span className="font-medium text-[#334155]">{website.templateName}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">
                        {website.owner?.businessName || website.owner?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-[#64748b]">{website.owner?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          website.status === "draft"
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {website.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-[#475569]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-[#059669]" />
                          <span>Created: {new Date(website.createdAt).toLocaleDateString()}</span>
                        </div>
                        {website.lastOpenedAt && (
                          <div className="flex items-center gap-1.5 text-[#64748b]">
                            <Clock className="h-3.5 w-3.5 text-[#ea580c]" />
                            <span>
                              Last edited: {new Date(website.lastOpenedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {website.status !== "archived" && (
                          <button className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center justify-end gap-1 transition">
                            <Archive className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b] font-medium">
                    No websites found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e2e8f0] bg-[#fafcfb] p-4">
            <span className="text-xs font-medium text-[#64748b]">
              Showing page {page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 transition"
              >
                Prev
              </button>
              <button
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
