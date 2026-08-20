import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDomains } from "@/lib/admin-api";
import {
  Loader2,
  Search,
  Filter,
  Globe2,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/admin/domains")({
  component: DomainsPage,
});

function DomainsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["adminDomains", { page, search, status }],
    queryFn: () => getDomains({ page, limit: 10, search, status }),
  });

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Domains</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Manage tenant custom domains and SSL certificates.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#fafcfb]">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                placeholder="Search domains..."
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
                <option value="active">Active</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#475569] border-b border-[#e2e8f0]">
              <tr>
                <th className="px-6 py-3.5 font-bold">Domain</th>
                <th className="px-6 py-3.5 font-bold">Tenant</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">SSL Status</th>
                <th className="px-6 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                      <p className="text-sm font-medium text-[#64748b]">Loading domains...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.domains?.length ? (
                data.domains.map((domain: any) => (
                  <tr key={domain.id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
                          <Globe2 className="h-4 w-4" />
                        </div>
                        <div>
                          <a
                            href={`https://${domain.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 font-bold text-[#059669] hover:underline"
                          >
                            {domain.domain} <ExternalLink className="h-3 w-3" />
                          </a>
                          {domain.isPrimary && (
                            <span className="mt-1 inline-block rounded bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#047857]">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#0f172a]">
                        {domain.tenant?.businessName || domain.tenant?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-[#64748b]">{domain.tenant?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          domain.status === "active"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : domain.status === "pending_verification"
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : "border border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {domain.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {domain.sslStatus === "active" ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" /> Secured
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <ShieldAlert className="h-3.5 w-3.5" /> {domain.sslStatus.replace("_", " ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-bold text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition">
                        Verify DNS
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748b] font-medium">
                    No domains found.
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
