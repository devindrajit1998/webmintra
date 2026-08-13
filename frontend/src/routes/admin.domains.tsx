import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDomains } from "@/lib/admin-api";
import { Loader2, Search, Filter, Globe2, ShieldCheck, ShieldAlert, Link as LinkIcon, ExternalLink } from "lucide-react";

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
          <h1 className="font-display text-2xl font-bold tracking-tight">Domains</h1>
          <p className="mt-1 text-xs text-slate-500">Manage tenant custom domains and SSL certificates.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input 
                placeholder="Search domains..." 
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
                <option value="active">Active</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="expired">Expired</option>
              </select>
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Domain</th>
                <th className="px-6 py-4 font-medium">Tenant</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">SSL Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /><p className="text-sm text-slate-500">Loading domains...</p></div></td></tr>
              ) : data?.domains?.length ? (
                data.domains.map((domain: any) => (
                  <tr key={domain.id} className="transition-colors hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Globe2 className="h-4 w-4 text-slate-400" />
                        <div>
                          <a href={`https://${domain.domain}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-cyan-400 hover:underline">
                            {domain.domain} <ExternalLink className="h-3 w-3" />
                          </a>
                          {domain.isPrimary && <span className="mt-1 inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase text-emerald-400">Primary</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-200">{domain.tenant?.businessName || domain.tenant?.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{domain.tenant?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                        domain.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' :
                        domain.status === 'pending_verification' ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' :
                        'border-slate-700 bg-slate-800 text-slate-300'
                      }`}>
                        {domain.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {domain.sslStatus === 'active' ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <ShieldCheck className="h-4 w-4" /> Secured
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <ShieldAlert className="h-4 w-4" /> {domain.sslStatus.replace("_", " ")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-medium text-cyan-400 hover:text-cyan-300">Verify DNS</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">No domains found.</td></tr>
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
