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
          <h1 className="font-display text-2xl font-bold tracking-tight">Websites</h1>
          <p className="mt-1 text-xs text-slate-500">Read-only oversight of websites created by tenants.</p>
        </div>
      </div>



      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input 
                placeholder="Search websites or templates..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="relative">
              <select 
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="h-9 appearance-none rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-8 text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Website</th>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Activity</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /><p className="text-sm text-slate-500">Loading websites...</p></div></td></tr>
              ) : data?.websites?.length ? (
                data.websites.map((website: any) => (
                  <tr key={website.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-200">{website.name}</p>
                          <p className="text-[10px] text-slate-500">Template: {website.templateName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{website.owner?.businessName || website.owner?.name || "Unknown"}</p>
                      <p className="text-[10px] text-slate-500">{website.owner?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                        website.status === 'draft' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                        'border-slate-700 bg-slate-800 text-slate-300'
                      }`}>
                        {website.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {new Date(website.createdAt).toLocaleDateString()}</span>
                        </div>
                        {website.lastOpenedAt && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>Last edited: {new Date(website.lastOpenedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">

                        {website.status !== 'archived' && (
                          <button className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center justify-end gap-1">
                            <Archive className="h-3 w-3" /> Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">No websites found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 p-4">
            <span className="text-xs text-slate-500">
              Showing page {page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50">Prev</button>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
