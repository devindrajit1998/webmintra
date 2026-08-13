import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTenantPages } from "@/lib/auth-api";
import { useTenantContext } from "@/components/TenantDashboard";
import { Loader2, FileText, Globe, Search, LayoutTemplate } from "lucide-react";

export const Route = createFileRoute("/tenant/pages")({
  component: PagesPage,
  head: () => ({ meta: [{ title: "Pages | WebMintra" }] }),
});

function PagesPage() {
  const { websites } = useTenantContext();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedWebsiteId && websites.length > 0) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  const { data, isLoading } = useQuery({
    queryKey: ["tenantPages", selectedWebsiteId],
    queryFn: () => getTenantPages(selectedWebsiteId),
    enabled: !!selectedWebsiteId,
  });

  const pages = data?.pages || [];
  const filteredPages = pages.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-cyan-400">
            <FileText className="h-4 w-4" /> Manage Content
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Pages</h1>
          <p className="mt-2 text-sm text-slate-400">
            View the pages available for your website. Pages are created and designed inside the visual builder.
          </p>
        </div>
      </header>

      {websites.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0b1826] p-8 text-center">
          <Globe className="h-10 w-10 text-slate-600" />
          <h2 className="mt-4 text-base font-semibold text-slate-200">No websites found</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            You need to create a website first before you can manage its pages.
          </p>
          <Link
            to="/tenant/websites"
            className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 hover:bg-cyan-400"
          >
            Go to Websites
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Website:</span>
              <select
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
                className="h-9 min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm focus:border-cyan-400 focus:outline-none"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input 
                placeholder="Search pages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-900/60 pl-9 pr-4 text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Page Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                        <span className="text-slate-500">Loading pages...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                      No pages found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => (
                    <tr key={page.id} className="transition-colors hover:bg-slate-800/20">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <LayoutTemplate className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-200">{page.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
                          {page.type || "Main"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/tenant/builder/${selectedWebsiteId}`}
                          className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                        >
                          Edit in Builder
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
