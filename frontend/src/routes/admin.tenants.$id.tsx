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
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!data?.tenant) {
    return <div className="p-8 text-center text-slate-400">Tenant not found.</div>;
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
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {tenant.business?.name || tenant.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {tenant.email} Â· Joined {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => {
              if (window.confirm(`Log in as ${tenant.business?.name || tenant.name}?`)) {
                impersonateMutation.mutate(tenant.id);
              }
            }}
            disabled={impersonateMutation.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-500/10 px-4 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> Impersonate
          </button>
        </div>
      </div>

      {data.deletionRequest ? (
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-lg font-bold text-rose-300">
                Account deletion requested
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Requested {new Date(data.deletionRequest.requestedAt).toLocaleString()}
              </p>
              {data.deletionRequest.reason ? (
                <p className="mt-2 text-sm text-slate-300">Reason: {data.deletionRequest.reason}</p>
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
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
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
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
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
            className="rounded-xl border border-slate-800 bg-[#0b1826] p-6"
          >
            <div className="mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
              <UserIcon className="h-5 w-5 text-cyan-400" />
              <h2 className="font-display text-lg font-bold">Profile Details</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Owner Information
                </h3>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">Full Name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Email Address
                  </span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Phone Number
                  </span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Subscription Plan
                  </span>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Business</option>
                  </select>
                </label>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Business Information
                </h3>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Business Name
                  </span>
                  <input
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Business Phone
                  </span>
                  <input
                    value={form.businessPhone}
                    onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Business Address
                  </span>
                  <input
                    value={form.businessAddress}
                    onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-400">
                    Description
                  </span>
                  <textarea
                    value={form.businessDescription}
                    onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-800 pt-6">
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-400 disabled:opacity-50"
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
          <div className="rounded-xl border border-slate-800 bg-[#0b1826] p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-4">
              <Globe2 className="h-5 w-5 text-emerald-400" />
              <h2 className="font-display text-lg font-bold">Websites & Domains</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Websites ({websites?.length || 0})
                </h3>
                {websites?.length > 0 ? (
                  <ul className="space-y-2">
                    {websites.map((w: any) => (
                      <li
                        key={w.id}
                        className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-2 text-sm flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{w.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${w.status === "published" ? "bg-emerald-400" : "bg-amber-400"}`}
                            />
                            {w.status}
                          </div>
                        </div>
                        {w.templateName && (
                          <div className="text-right flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                              Template: {w.templateName}
                            </span>
                            <a
                              href={`/admin/websites_/${w.id}/builder`}
                              className="inline-flex items-center gap-1 rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition"
                            >
                              Edit Inline
                            </a>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No websites created yet.</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Domains ({domains?.length || 0})
                </h3>
                {domains?.length > 0 ? (
                  <ul className="space-y-2">
                    {domains.map((d: any) => (
                      <li
                        key={d.id}
                        className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-2 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-300">{d.domain}</span>
                        <span className="text-[10px] uppercase text-emerald-400">{d.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No custom domains connected.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0b1826] p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-4">
              <Activity className="h-5 w-5 text-violet-400" />
              <h2 className="font-display text-lg font-bold">Recent Activity</h2>
            </div>
            {recentActivity?.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((act: any) => (
                  <div key={act.id} className="border-l-2 border-slate-700 pl-3">
                    <p className="text-xs text-slate-300">{act.description}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(act.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
