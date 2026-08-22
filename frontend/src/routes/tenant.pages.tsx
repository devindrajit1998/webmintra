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
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white px-5 py-6 shadow-xs sm:px-7">
        <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
          <span className="flex-1 bg-[#ea580c]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#059669]" />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#fff7ed] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-[#ecfdf5] blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c2410c]">
              <FileText className="h-3.5 w-3.5" /> Website Structure
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Website Pages
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Overview of all published pages and sub-routes for your selected website.
            </p>
          </div>
          {selectedWebsiteId && (
            <Link
              to={`/tenant/builder/${selectedWebsiteId}`}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857]"
            >
              <LayoutTemplate className="h-4 w-4" /> Open Visual Builder
            </Link>
          )}
        </div>
      </section>

      {websites.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center shadow-xs">
          <Globe className="h-12 w-12 text-[#cbd5e1]" />
          <h2 className="mt-4 text-base font-extrabold text-[#0f172a]">No websites found</h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">
            You need to create a website first before you can manage its pages.
          </p>
          <Link
            to="/tenant/websites"
            className="mt-4 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#047857] transition"
          >
            Go to Websites
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="flex flex-col gap-3 border-b border-[#f1f5f9] p-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between bg-[#f8fafc]">
            <div className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-[#059669]" />
              <select
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
                className="h-10 min-w-48 rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                placeholder="Search pages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full sm:w-64 rounded-xl border border-[#e2e8f0] bg-white pl-10 pr-4 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0f172a]">
              <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
                <tr>
                  <th className="px-6 py-4">Page Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                        <span className="text-xs font-semibold text-[#64748b]">
                          Loading pages...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-12 text-center text-xs font-semibold text-[#64748b]"
                    >
                      No pages found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => (
                    <tr key={page.id} className="transition-colors hover:bg-[#f8fafc]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
                            <LayoutTemplate className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-[#0f172a]">{page.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-0.5 text-[10px] font-bold text-[#64748b]">
                          {page.type || "Main"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/tenant/builder/${selectedWebsiteId}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] hover:text-[#047857]"
                        >
                          Edit in Builder →
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
