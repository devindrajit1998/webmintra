import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getTenants, createTenant, updateTenantStatus, deleteTenant, updateTenant, impersonateTenant, getInvitations, cancelInvitation } from "@/lib/admin-api";
import { Loader2, Search, Plus, Filter, UserCheck, UserX, AlertTriangle, Trash2, Pencil, LogIn } from "lucide-react";

import { toast } from "sonner";
export const Route = createFileRoute("/admin/tenants/")({
  component: TenantsPage,
});

function TenantsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"tenants" | "invitations">("tenants");

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", businessName: "", plan: "starter" });

  const { data, isLoading } = useQuery({
    queryKey: ["adminTenants", { page, search, status }],
    queryFn: () => getTenants({ page, limit: 10, search, status }),
  });

  const { data: invitationsData, isLoading: isLoadingInvitations } = useQuery({
    queryKey: ["adminInvitations"],
    queryFn: getInvitations,
  });

  const inviteMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvitations"] });
      setIsInviteOpen(false);
      setForm({ name: "", email: "", businessName: "", plan: "starter" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string, newStatus: string }) => updateTenantStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
    },
  });

  const cancelInvMutation = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminInvitations"] });
      toast.success("Invitation cancelled");
    },
    onError: (err) => toast.error(err.message),
  });

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const editMutation = useMutation({
    mutationFn: (data: any) => updateTenant(editingTenant.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
      setEditingTenant(null);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: impersonateTenant,
    onSuccess: () => {
      // Force reload to completely wipe admin state and load tenant context
      window.location.href = "/tenant";
    },
    onError: (err) => toast.error(err.message),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    inviteMutation.mutate({
      ownerName: form.name,
      ownerEmail: form.email,
      businessName: form.businessName,
      plan: form.plan,
      category: "Other"
    });
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="mt-1 text-xs text-slate-500">Manage business accounts and workspaces.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(!isInviteOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Invite tenant
        </button>
      </div>

      <div className="mb-6 flex gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("tenants")}
          className={`pb-2 text-sm font-medium ${activeTab === "tenants" ? "border-b-2 border-emerald-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
        >
          Active Tenants
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`pb-2 text-sm font-medium ${activeTab === "invitations" ? "border-b-2 border-emerald-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
        >
          Invitation History
        </button>
      </div>

      {isInviteOpen && (
        <form onSubmit={handleInvite} className="mb-6 rounded-xl border border-slate-800 bg-[#0b1826] p-5">
          <h2 className="font-display text-lg font-bold mb-4">Invite new tenant</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <input required placeholder="Owner Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" />
            <input required type="email" placeholder="Owner Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" />
            <input required placeholder="Business Name" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" />
            <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm">
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Business</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button type="button" onClick={() => setIsInviteOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={inviteMutation.isPending} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 disabled:opacity-50 flex items-center justify-center gap-2">
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
          {inviteMutation.isError && <p className="mt-2 text-sm text-red-400">{inviteMutation.error.message}</p>}
        </form>
      )}

      {editingTenant && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate({
              name: editingTenant.name,
              email: editingTenant.email,
              businessName: editingTenant.businessName,
              plan: editingTenant.plan
            });
          }}
          className="mb-6 rounded-xl border border-slate-800 bg-[#0b1826] p-5"
        >
          <h2 className="font-display text-lg font-bold mb-4">Edit tenant</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <input required placeholder="Owner Name" value={editingTenant.name || ""} onChange={e => setEditingTenant({ ...editingTenant, name: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" />
            <input required type="email" placeholder="Owner Email" value={editingTenant.email || ""} onChange={e => setEditingTenant({ ...editingTenant, email: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" />
            <input required placeholder="Business Name" value={editingTenant.businessName || ""} onChange={e => setEditingTenant({ ...editingTenant, businessName: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm" />
            <select value={editingTenant.plan || "starter"} onChange={e => setEditingTenant({ ...editingTenant, plan: e.target.value })} className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm">
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Business</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button type="button" onClick={() => setEditingTenant(null)} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={editMutation.isPending} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 disabled:opacity-50 flex items-center justify-center gap-2">
              {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {editMutation.isError && <p className="mt-2 text-sm text-red-400">{editMutation.error.message}</p>}
        </form>
      )}

      {activeTab === "invitations" && (
        <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/50 text-xs font-semibold text-slate-400">
                <tr>
                  <th className="px-5 py-3">Business / Owner</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent / Expires</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoadingInvitations ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : invitationsData?.invitations?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No invitations found.
                    </td>
                  </tr>
                ) : (
                  invitationsData?.invitations?.map((inv: any) => (
                    <tr key={inv.id} className="transition hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-200">{inv.businessName}</div>
                        <div className="text-xs text-slate-500">
                          {inv.ownerName} &bull; {inv.ownerEmail}
                        </div>
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-300">{inv.plan}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "pending" ? "bg-amber-500/10 text-amber-400" :
                          inv.status === "accepted" ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-slate-800 text-slate-400"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                        <br />
                        <span className="text-slate-500">Exp: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {inv.status === "pending" && (
                          <button
                            onClick={() => cancelInvMutation.mutate(inv.id)}
                            disabled={cancelInvMutation.isPending}
                            className="inline-flex h-8 items-center justify-center rounded border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        {inv.status === "pending" && inv.invitationUrl && (
                           <button
                             onClick={() => { navigator.clipboard.writeText(inv.invitationUrl); toast.success("Link copied!"); }}
                             className="ml-2 inline-flex h-8 items-center justify-center rounded border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
                           >
                             Copy Link
                           </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "tenants" && (
        <div className="rounded-xl border border-slate-800 bg-[#0b1826]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  placeholder="Search tenants..."
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
                  <option value="suspended">Suspended</option>
                  <option value="invitation-sent">Invitation Sent</option>
                </select>
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Business / Owner</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /><p className="text-sm text-slate-500">Loading tenants...</p></div></td></tr>
                ) : data?.tenants?.length ? (
                  data.tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="transition-colors hover:bg-slate-800/20">
                      <td className="px-6 py-4">
                        <Link to="/admin/tenants/$id" params={{ id: tenant.id }} className="flex items-center gap-3 group">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-bold text-slate-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                            {(tenant.businessName || tenant.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">{tenant.businessName || "No Business Name"}</p>
                            <p className="text-xs text-slate-500">{tenant.name} · {tenant.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-300">
                          {tenant.plan === "pro" ? "Business" : tenant.plan || "None"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tenant.tenantStatus === "active" && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><UserCheck className="h-3.5 w-3.5" /> Active</span>}
                        {tenant.tenantStatus === "suspended" && <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400"><UserX className="h-3.5 w-3.5" /> Suspended</span>}
                        {tenant.tenantStatus === "invitation-sent" && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Invited</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={tenant.tenantStatus}
                            onChange={(e) => statusMutation.mutate({ id: tenant.id, newStatus: e.target.value })}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"
                            disabled={statusMutation.isPending}
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspend</option>
                            {tenant.tenantStatus === "invitation-sent" && <option value="invitation-sent">Invited</option>}
                          </select>
                          <button
                            onClick={() => setEditingTenant(tenant)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                            title="Edit tenant"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Log in as ${tenant.businessName || tenant.name}? You will need to log back in to your admin account later.`)) {
                                impersonateMutation.mutate(tenant.id);
                              }
                            }}
                            disabled={impersonateMutation.isPending}
                            className="rounded-md p-1.5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors disabled:opacity-50"
                            title="Impersonate tenant"
                          >
                            <LogIn className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
                                deleteMutation.mutate(tenant.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors disabled:opacity-50"
                            title="Delete tenant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-500">No tenants found.</td></tr>
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
      )}
    </div>
  );
}
