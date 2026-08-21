import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getTenants,
  createTenant,
  updateTenantStatus,
  deleteTenant,
  updateTenant,
  impersonateTenant,
  getInvitations,
  cancelInvitation,
} from "@/lib/admin-api";
import {
  Loader2,
  Search,
  Plus,
  Filter,
  UserCheck,
  UserX,
  AlertTriangle,
  Trash2,
  Pencil,
  LogIn,
} from "lucide-react";

import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/SaaSSkeletons";
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
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      updateTenantStatus(id, newStatus),
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
      category: "Other",
    });
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Tenants</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">Manage business accounts, workspaces, and invitations.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(!isInviteOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] active:scale-95"
        >
          <Plus className="h-4 w-4" /> Invite tenant
        </button>
      </div>

      <div className="mb-6 flex gap-6 border-b border-[#e2e8f0]">
        <button
          onClick={() => setActiveTab("tenants")}
          className={`pb-2.5 text-sm font-bold transition-colors ${
            activeTab === "tenants"
              ? "border-b-2 border-[#059669] text-[#0f172a]"
              : "text-[#64748b] hover:text-[#0f172a] font-medium"
          }`}
        >
          Active Tenants
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`pb-2.5 text-sm font-bold transition-colors ${
            activeTab === "invitations"
              ? "border-b-2 border-[#059669] text-[#0f172a]"
              : "text-[#64748b] hover:text-[#0f172a] font-medium"
          }`}
        >
          Invitation History
        </button>
      </div>

      {isInviteOpen && (
        <form
          onSubmit={handleInvite}
          className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xs"
        >
          <h2 className="text-base font-bold text-[#0f172a] mb-4">Invite new tenant</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              required
              placeholder="Owner Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            />
            <input
              required
              type="email"
              placeholder="Owner Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            />
            <input
              required
              placeholder="Business Name"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            />
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Business</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
          {inviteMutation.isError && (
            <p className="mt-2 text-sm text-rose-600 font-medium">{inviteMutation.error.message}</p>
          )}
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
              plan: editingTenant.plan,
            });
          }}
          className="mb-6 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xs"
        >
          <h2 className="text-base font-bold text-[#0f172a] mb-4">Edit tenant</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <input
              required
              placeholder="Owner Name"
              value={editingTenant.name || ""}
              onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            />
            <input
              required
              type="email"
              placeholder="Owner Email"
              value={editingTenant.email || ""}
              onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            />
            <input
              required
              placeholder="Business Name"
              value={editingTenant.businessName || ""}
              onChange={(e) => setEditingTenant({ ...editingTenant, businessName: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] placeholder-[#94a3b8] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            />
            <select
              value={editingTenant.plan || "starter"}
              onChange={(e) => setEditingTenant({ ...editingTenant, plan: e.target.value })}
              className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Business</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setEditingTenant(null)}
              className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {editMutation.isError && (
            <p className="mt-2 text-sm text-rose-600 font-medium">{editMutation.error.message}</p>
          )}
        </form>
      )}

      {activeTab === "invitations" && (
        <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-[#475569]">
                <tr>
                  <th className="px-5 py-3.5">Business / Owner</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Sent / Expires</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {isLoadingInvitations ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748b]">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#059669]" />
                    </td>
                  </tr>
                ) : invitationsData?.invitations?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#64748b] font-medium">
                      No invitations found.
                    </td>
                  </tr>
                ) : (
                  invitationsData?.invitations?.map((inv: any) => (
                    <tr key={inv.id} className="transition-colors hover:bg-[#f8fafc]">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#0f172a]">{inv.businessName}</div>
                        <div className="text-xs text-[#64748b] mt-0.5">
                          {inv.ownerName} &bull; {inv.ownerEmail}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-xs font-bold capitalize text-[#c2410c]">
                          {inv.plan}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            inv.status === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : inv.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-[#334155]">
                        <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                        <span className="text-[#64748b] font-normal">
                          Exp: {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === "pending" && (
                            <button
                              onClick={() => cancelInvMutation.mutate(inv.id)}
                              disabled={cancelInvMutation.isPending}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                          {inv.status === "pending" && inv.invitationUrl && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(inv.invitationUrl);
                                toast.success("Link copied!");
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#334155] transition hover:bg-[#f1f5f9]"
                            >
                              Copy Link
                            </button>
                          )}
                        </div>
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
        <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] p-4 bg-[#fafcfb]">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  placeholder="Search tenants..."
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
                  className="h-9 appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-8 text-xs text-[#0f172a] font-medium focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="invitation-sent">Invitation Sent</option>
                </select>
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              </div>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-[#475569] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">Business / Owner</th>
                    <th className="px-6 py-3.5 font-bold">Plan</th>
                    <th className="px-6 py-3.5 font-bold">Status</th>
                    <th className="px-6 py-3.5 font-bold">Joined</th>
                    <th className="px-6 py-3.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {data?.tenants?.length ? (
                    data.tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="transition-colors hover:bg-[#f8fafc]">
                      <td className="px-6 py-4">
                        <Link
                          to="/admin/tenants/$id"
                          params={{ id: tenant.id }}
                          className="flex items-center gap-3 group"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] font-bold text-[#059669] group-hover:bg-[#059669] group-hover:text-white transition-colors">
                            {(tenant.businessName || tenant.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#0f172a] group-hover:text-[#059669] transition-colors">
                              {tenant.businessName || "No Business Name"}
                            </p>
                            <p className="text-xs text-[#64748b]">
                              {tenant.name} · {tenant.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-0.5 text-xs font-bold capitalize text-[#c2410c]">
                          {tenant.plan === "pro" ? "Business" : tenant.plan || "None"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tenant.tenantStatus === "active" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" /> Active
                          </span>
                        )}
                        {tenant.tenantStatus === "suspended" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                            <UserX className="h-3.5 w-3.5" /> Suspended
                          </span>
                        )}
                        {tenant.tenantStatus === "invitation-sent" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" /> Invited
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-[#475569]">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={tenant.tenantStatus}
                            onChange={(e) =>
                              statusMutation.mutate({ id: tenant.id, newStatus: e.target.value })
                            }
                            className="rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-medium text-[#334155] focus:border-[#059669] outline-none"
                            disabled={statusMutation.isPending}
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspend</option>
                            {tenant.tenantStatus === "invitation-sent" && (
                              <option value="invitation-sent">Invited</option>
                            )}
                          </select>
                          <button
                            onClick={() => setEditingTenant(tenant)}
                            className="rounded-lg border border-[#e2e8f0] p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
                            title="Edit tenant"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Log in as ${tenant.businessName || tenant.name}? You will need to log back in to your admin account later.`,
                                )
                              ) {
                                impersonateMutation.mutate(tenant.id);
                              }
                            }}
                            disabled={impersonateMutation.isPending}
                            className="rounded-lg border border-amber-200 bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            title="Impersonate tenant"
                          >
                            <LogIn className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this tenant? This action cannot be undone.",
                                )
                              ) {
                                deleteMutation.mutate(tenant.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                            title="Delete tenant"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#64748b] font-medium">
                      No tenants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

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
      )}
    </div>
  );
}
