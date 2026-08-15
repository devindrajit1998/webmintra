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
    <div className="max-w-[1600px] space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          Custom Domains
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage custom domains for your websites. Connect your own domain to make your site public.
        </p>
      </div>

      {/* Add Domain Section */}
      <div className="rounded-2xl border border-slate-800 bg-[#0b1826] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Add a Custom Domain</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-300">Domain Name</label>
            <input
              type="text"
              placeholder="e.g. www.mycompany.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#0d1c2d] px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-300">Connect to Website</label>
            <select
              value={selectedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#0d1c2d] px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 font-medium text-white transition-all hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0b1826] disabled:opacity-50"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            Add Domain
          </button>
        </div>
      </div>

      {/* Domains List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Your Domains</h2>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : domains.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0b1826]/50 text-center">
            <Globe className="h-10 w-10 text-slate-700" />
            <h3 className="mt-3 font-display text-lg font-bold text-white">No Domains Added</h3>
            <p className="mt-1 text-sm text-slate-400">Add a custom domain above to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-[#0b1826] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg font-bold text-white">{domain.domain}</h3>
                    {domain.status === "active" ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Connected to{" "}
                    <span className="font-semibold text-slate-300">
                      {websites.find((w) => w.id === domain.websiteId)?.name || "Unknown Website"}
                    </span>
                  </div>

                  {domain.status === "pending_verification" && (
                    <div className="mt-4 rounded-xl border border-blue-900/30 bg-blue-900/10 p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-400">Setup Instructions</p>
                      <p className="text-xs text-slate-400">
                        Add the following <strong>CNAME</strong> record in your DNS provider, then
                        click <strong>Verify DNS</strong>:
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full text-xs">
                          <thead className="bg-[#0a1525] text-slate-400">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold">Type</th>
                              <th className="px-4 py-2 text-left font-semibold">Name / Host</th>
                              <th className="px-4 py-2 text-left font-semibold">
                                Value / Points To
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            <tr className="bg-[#0b1826]">
                              <td className="px-4 py-2 font-mono text-amber-400">CNAME</td>
                              <td className="px-4 py-2 font-mono text-slate-300">
                                {domain.domain}
                              </td>
                              <td className="px-4 py-2 font-mono text-cyan-400">
                                {window.location.hostname.includes("localhost")
                                  ? `cname.${window.location.host}`
                                  : "cname.webmintra.cloud"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-slate-500">
                        DNS propagation may take up to 48 hours. For root/apex domains (e.g.
                        mycompany.com without www), use an A record pointing to our server IP
                        instead.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {domain.status !== "active" && (
                    <button
                      onClick={() => verifyMutation.mutate(domain.id)}
                      disabled={verifyMutation.isPending}
                      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none disabled:opacity-50"
                    >
                      {verifyMutation.isPending && verifyMutation.variables === domain.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Verify DNS
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(domain.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 focus:outline-none disabled:opacity-50"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === domain.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove
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
