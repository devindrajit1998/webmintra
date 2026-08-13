import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenantContext } from "@/components/TenantDashboard";
import { useQuery } from "@tanstack/react-query";
import { getWebsiteForms } from "@/lib/auth-api";
import { format } from "date-fns";
import { Globe2, FileText, Loader2, LayoutTemplate, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/tenant/forms")({
  component: FormsPage,
  head: () => ({ meta: [{ title: "Forms | WebMintra" }] }),
});

function FormsPage() {
  const { websites } = useTenantContext();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");

  const activeWebsiteId = selectedWebsiteId || websites[0]?.id || "";

  const { data, isLoading } = useQuery({
    queryKey: ["website-forms", activeWebsiteId],
    queryFn: () => getWebsiteForms(activeWebsiteId),
    enabled: !!activeWebsiteId,
  });

  const forms = data?.forms || [];

  return (
    <div className="max-w-[1600px] space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Form Submissions</h1>
          <p className="mt-2 text-sm text-slate-400">View and manage form submissions from your websites.</p>
        </div>
        
        {websites.length > 0 && (
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-slate-400" />
            <select
              value={activeWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              className="rounded-lg border border-slate-800 bg-[#0b1826] px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {websites.length === 0 ? (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0b1826]/50 text-center">
          <LayoutTemplate className="h-12 w-12 text-slate-700" />
          <h3 className="mt-4 font-display text-xl font-bold text-white">No Websites Found</h3>
          <p className="mt-2 text-sm text-slate-400">Create a website first to start receiving form submissions.</p>
        </div>
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : forms.length === 0 ? (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0b1826]/50 text-center">
          <FileText className="h-12 w-12 text-slate-700" />
          <h3 className="mt-4 font-display text-xl font-bold text-white">No Submissions Yet</h3>
          <p className="mt-2 text-sm text-slate-400">When visitors submit forms on your website, they will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1826] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0d1c2d] text-xs uppercase text-slate-400">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold">Date & Time</th>
                  {Array.from(new Set(forms.flatMap((form: any) => Object.keys(form.data || {})))).map((col) => (
                    <th key={col} className="whitespace-nowrap px-6 py-4 font-semibold">{col.replace(/_/g, ' ')}</th>
                  ))}
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-right">Submission ID</th>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {forms.map((form: any) => (
                  <tr key={form._id} className="transition-colors hover:bg-[#0d1c2d]/50">
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-400">
                      {format(new Date(form.createdAt), "MMM d, yyyy h:mm a")}
                    </td>
                    {Array.from(new Set(forms.flatMap((f: any) => Object.keys(f.data || {})))).map((col) => (
                      <td key={col} className="px-6 py-4 text-slate-200">
                        {form.data[col] ? String(form.data[col]) : <span className="text-slate-600">-</span>}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-6 py-4 text-right text-xs">
                      <span className="font-mono text-slate-500">#{form._id.slice(-8)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
