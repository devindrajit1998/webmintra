import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  getTenant,
  updateTenant,
  impersonateTenant,
  getTemplates,
  updateWebsiteTemplate,
  reviewAccountDeletionRequest,
} from "@/lib/admin-api";
import { Loader2, ArrowLeft, LogIn, Save, User as UserIcon, Globe2, Activity } from "lucide-react";

import { toast } from "sonner";
export const Route = createFileRoute("/admin/tenants/$id")({
  component: TenantDetailsPage,
});

function TenantDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["adminTenant", id],
    queryFn: () => getTenant(id),
  });

  const [form, setForm] = useState<any>({});
  const [editingTemplateFor, setEditingTemplateFor] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const { data: templatesData } = useQuery({
    queryKey: ["adminTemplates"],
    queryFn: () => getTemplates(),
    enabled: !!editingTemplateFor,
  });

  const templateMutation = useMutation({
    mutationFn: (templateId: string) => updateWebsiteTemplate(editingTemplateFor.id, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTenant", id] });
      setEditingTemplateFor(null);
      setSelectedTemplateId("");
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (data?.tenant) {
      setForm({
        name: data.tenant.name || "",
        email: data.tenant.email || "",
        phone: data.tenant.phone || "",
        businessName: data.tenant.business?.name || "",
        businessEmail: data.tenant.business?.email || "",
        businessPhone: data.tenant.business?.phone || "",
        businessAddress: data.tenant.business?.address || "",
        businessDescription: data.tenant.business?.description || "",
        plan: data.tenant.plan || "starter",
      });
    }
  }, [data]);

  const editMutation = useMutation({
    mutationFn: (updateData: any) => updateTenant(id, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTenant", id] });
      queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
      toast.success("Tenant updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const reviewDeletionMutation = useMutation({
    mutationFn: (decision: "approve" | "reject") => reviewAccountDeletionRequest(id, decision),
    onSuccess: (result, decision) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ["adminTenant", id] });
      queryClient.invalidateQueries({ queryKey: ["adminTenants"] });
      if (decision === "approve") window.location.href = "/admin/tenants";
    },
    onError: (error) => toast.error(error.message),
  });

  const [showImpersonateModal, setShowImpersonateModal] = useState(false);

  const impersonateMutation = useMutation({
    mutationFn: impersonateTenant,
    onSuccess: () => {
      window.location.href = "/tenant";
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  if (!data?.tenant) {
    return <div className="p-8 text-center text-[#64748b]">Tenant not found.</div>;
  }

  const { tenant, websites, domains, recentActivity } = data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editMutation.mutate(form);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/tenants"
          className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">
            {tenant.business?.name || tenant.name}
          </h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            {tenant.email} &bull; Joined {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowImpersonateModal(true)}
            disabled={impersonateMutation.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#fff7ed] border border-[#fed7aa] px-4 text-xs font-bold text-[#c2410c] transition hover:bg-[#ffedd5] disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <LogIn className="h-4 w-4" /> Impersonate
          </button>
        </div>
      </div>

      {data.deletionRequest ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-base font-bold text-rose-800">
                Account deletion requested
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                Requested {new Date(data.deletionRequest.requestedAt).toLocaleString()}
              </p>
              {data.deletionRequest.reason ? (
                <p className="mt-2 text-sm text-[#334155]">Reason: {data.deletionRequest.reason}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={reviewDeletionMutation.isPending}
                onClick={() => {
                  if (window.confirm("Reject this account deletion request?")) {
                    reviewDeletionMutation.mutate("reject");
                  }
                }}
                className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={reviewDeletionMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Permanently delete ${tenant.name} and associated workspace data? This cannot be undone.`,
                    )
                  ) {
                    reviewDeletionMutation.mutate("approve");
                  }
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Approve & Delete
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Edit Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xs"
          >
            <div className="mb-6 flex items-center gap-2 border-b border-[#e2e8f0] pb-4">
              <UserIcon className="h-5 w-5 text-[#059669]" />
              <h2 className="text-base font-bold text-[#0f172a]">Profile Details</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Owner Information
                </h3>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">Full Name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Email Address
                  </span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Phone Number
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Subscription Plan
                  </span>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Business</option>
                  </select>
                </label>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Business Information
                </h3>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Business Name
                  </span>
                  <input
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Business Phone
                  </span>
                  <input
                    value={form.businessPhone}
                    onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Business Address
                  </span>
                  <input
                    value={form.businessAddress}
                    onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[#475569]">
                    Description
                  </span>
                  <textarea
                    value={form.businessDescription}
                    onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-[#cbd5e1] bg-white p-3 text-sm text-[#0f172a] focus:border-[#059669] focus:ring-1 focus:ring-[#059669] outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-[#e2e8f0] pt-6">
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50"
              >
                {editMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Data */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2 border-b border-[#e2e8f0] pb-4">
              <Globe2 className="h-5 w-5 text-[#059669]" />
              <h2 className="text-base font-bold text-[#0f172a]">Websites & Domains</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Websites ({websites?.length || 0})
                </h3>
                {websites?.length > 0 ? (
                  <ul className="space-y-2">
                    {websites.map((w: any) => (
                      <li
                        key={w.id}
                        className="rounded-lg border border-[#e2e8f0] bg-[#fafcfb] p-3 text-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#0f172a]">{w.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#64748b]">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${w.status === "published" ? "bg-[#059669]" : "bg-amber-500"}`}
                            />
                            <span className="capitalize">{w.status}</span>
                          </div>
                        </div>
                        {w.templateName && (
                          <div className="text-right flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                              Template: {w.templateName}
                            </span>
                            <a
                              href={`/admin/websites_/${w.id}/builder`}
                              className="inline-flex items-center gap-1 rounded-md border border-[#059669]/30 bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857] hover:bg-[#059669] hover:text-white transition"
                            >
                              Edit Inline
                            </a>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#64748b]">No websites created yet.</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Domains ({domains?.length || 0})
                </h3>
                {domains?.length > 0 ? (
                  <ul className="space-y-2">
                    {domains.map((d: any) => (
                      <li
                        key={d.id}
                        className="rounded-lg border border-[#e2e8f0] bg-[#fafcfb] p-3 text-sm flex items-center justify-between"
                      >
                        <span className="font-bold text-[#0f172a]">{d.domain}</span>
                        <span className="text-[10px] font-bold uppercase text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">{d.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#64748b]">No custom domains connected.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2 border-b border-[#e2e8f0] pb-4">
              <Activity className="h-5 w-5 text-violet-600" />
              <h2 className="text-base font-bold text-[#0f172a]">Recent Activity</h2>
            </div>
            {recentActivity?.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((act: any) => (
                  <div key={act.id} className="border-l-2 border-[#059669] pl-3">
                    <p className="text-xs font-medium text-[#334155]">{act.description}</p>
                    <p className="mt-1 text-[10px] text-[#64748b]">
                      {new Date(act.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748b]">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* Impersonate Confirmation Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] shadow-2xs mb-4">
                <LogIn className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-extrabold text-[#0f172a]">
                Log in as {tenant.business?.name || tenant.name}?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                You will temporarily enter this tenant's workspace session. To return to the administrator platform, you will need to log back into your admin account.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImpersonateModal(false)}
                  disabled={impersonateMutation.isPending}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => impersonateMutation.mutate(tenant.id)}
                  disabled={impersonateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#c2410c] px-5 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-[#9a3412] transition cursor-pointer disabled:opacity-50"
                >
                  {impersonateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span>{impersonateMutation.isPending ? "Logging in..." : "Confirm & Log in"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
