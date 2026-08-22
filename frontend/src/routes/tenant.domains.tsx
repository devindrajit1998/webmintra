import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDomains, addDomain, deleteDomain, verifyDomain } from "@/lib/auth-api";
import { useTenantContext } from "@/components/TenantDashboard";
import { Globe, Plus, Loader2, Trash2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/tenant/domains")({
  component: DomainsPage,
  head: () => ({ meta: [{ title: "Domains | WebMintra" }] }),
});

function DomainsPage() {
  const { websites } = useTenantContext();
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(websites[0]?.id || "");

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-domains"],
    queryFn: getDomains,
  });

  const domains = data?.domains || [];

  const addMutation = useMutation({
    mutationFn: () => addDomain(newDomain, selectedWebsiteId),
    onSuccess: () => {
      toast.success("Domain added successfully");
      setNewDomain("");
      queryClient.invalidateQueries({ queryKey: ["tenant-domains"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add domain");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      toast.success("Domain removed");
      queryClient.invalidateQueries({ queryKey: ["tenant-domains"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to remove domain"),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyDomain,
    onSuccess: (data: any) => {
      toast.success(data.message || "Domain verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["tenant-domains"] });
    },
    onError: (err: any) => {
      // Backend provides specific DNS failure reason — show it directly
      toast.error(err.message || "DNS verification failed", { duration: 8000 });
      queryClient.invalidateQueries({ queryKey: ["tenant-domains"] });
    },
  });

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
              <Globe className="h-3.5 w-3.5" /> Domain Management
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Custom Domains
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Connect your own custom domains, manage CNAME records, and enable automated SSL certificates.
            </p>
          </div>
        </div>
      </section>

      {/* Add Domain Section */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
        <h2 className="mb-4 font-display text-base font-extrabold text-[#0f172a]">Add a Custom Domain</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-[#0f172a]">Domain Name</label>
            <input
              type="text"
              placeholder="e.g. www.mycompany.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669]"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-bold text-[#0f172a]">Connect to Website</label>
            <select
              value={selectedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
            >
              <option value="" disabled>
                Select a website
              </option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => addMutation.mutate()}
            disabled={!newDomain || !selectedWebsiteId || addMutation.isPending}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#059669] px-6 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-[#047857] disabled:opacity-50 cursor-pointer shrink-0"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Add Domain</span>
          </button>
        </div>
      </div>

      {/* Domains List */}
      <div>
        <h2 className="mb-4 font-display text-base font-extrabold text-[#0f172a]">Your Connected Domains</h2>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
          </div>
        ) : domains.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center shadow-xs">
            <Globe className="h-10 w-10 text-[#cbd5e1]" />
            <h3 className="mt-3 font-display text-base font-extrabold text-[#0f172a]">No Domains Added</h3>
            <p className="mt-1 text-xs text-[#64748b]">Add your first custom domain above to route traffic to your website.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex flex-col gap-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-base font-extrabold text-[#0f172a]">{domain.domain}</h3>
                    {domain.status === "active" ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-0.5 text-[10px] font-extrabold text-[#065f46]">
                        <CheckCircle className="h-3 w-3 text-[#059669]" />
                        Active & Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-[#fff7ed] border border-[#fed7aa] px-2.5 py-0.5 text-[10px] font-extrabold text-[#c2410c]">
                        <AlertCircle className="h-3 w-3 text-[#ea580c]" />
                        Pending DNS Verification
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#64748b]">
                    Connected to{" "}
                    <span className="font-bold text-[#0f172a]">
                      {websites.find((w) => w.id === domain.websiteId)?.name || "Unknown Website"}
                    </span>
                  </div>

                  {domain.status === "pending_verification" && (
                    <div className="mt-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4.5 space-y-3">
                      <p className="text-xs font-extrabold text-[#c2410c]">DNS Configuration Setup</p>
                      <p className="text-xs text-[#64748b] leading-relaxed">
                        Add the following DNS record in your domain registrar (GoDaddy, Namecheap, Cloudflare, Hostinger), then click <strong>Verify DNS</strong>:
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white shadow-2xs">
                        <table className="w-full text-xs">
                          <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Record Type</th>
                              <th className="px-4 py-2.5 text-left">Host / Name</th>
                              <th className="px-4 py-2.5 text-left">Points To / Value</th>
                              <th className="px-4 py-2.5 text-left">TTL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f1f5f9]">
                            {domain.domain.startsWith("www.") || domain.domain.split(".").length > 2 ? (
                              <tr>
                                <td className="px-4 py-2.5 font-mono font-bold text-[#ea580c]">CNAME</td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-[#0f172a]">
                                  {domain.domain.startsWith("www.") ? "www" : domain.domain.split(".")[0]}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-bold text-[#059669]">
                                  cname.webmintra.in
                                </td>
                                <td className="px-4 py-2.5 font-mono text-[#64748b]">Automatic / 1/2 Hour</td>
                              </tr>
                            ) : (
                              <>
                                <tr>
                                  <td className="px-4 py-2.5 font-mono font-bold text-[#ea580c]">CNAME</td>
                                  <td className="px-4 py-2.5 font-mono font-semibold text-[#0f172a]">
                                    @ <span className="text-[10px] text-[#64748b] font-normal">(or www)</span>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono font-bold text-[#059669]">
                                    cname.webmintra.in
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-[#64748b]">Automatic / 1/2 Hour</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="rounded-lg bg-white/70 border border-[#fed7aa] p-3 text-[11px] text-[#64748b] space-y-1">
                        <p className="font-bold text-[#0f172a]">💡 Host / Name field tip:</p>
                        <p>
                          In GoDaddy/Namecheap/Cloudflare, set <strong>Name</strong> to <code className="bg-[#f1f5f9] px-1 py-0.5 rounded font-bold text-[#0f172a]">@</code> (or <code className="bg-[#f1f5f9] px-1 py-0.5 rounded font-bold text-[#0f172a]">www</code>), <strong>NOT</strong> your full domain name.
                        </p>
                        <p>
                          Set <strong>Points to / Value</strong> to <code className="bg-[#ecfdf5] text-[#059669] px-1 py-0.5 rounded font-bold">cname.webmintra.in</code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  {domain.status !== "active" && (
                    <button
                      onClick={() => verifyMutation.mutate(domain.id)}
                      disabled={verifyMutation.isPending}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-bold text-[#0f172a] shadow-2xs hover:bg-[#f8fafc] disabled:opacity-50 cursor-pointer transition"
                    >
                      {verifyMutation.isPending && verifyMutation.variables === domain.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#059669]" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-[#059669]" />
                      )}
                      <span>Verify DNS</span>
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(domain.id)}
                    disabled={deleteMutation.isPending}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-3.5 text-xs font-bold text-[#e11d48] hover:bg-[#ffe4e6] disabled:opacity-50 cursor-pointer transition"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === domain.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
