import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  cancelInvitation,
  createInvitation,
  getManagedTenants,
  getInvitations,
  type Invitation,
  type ManagedTenant,
  updateTenantStatus,
} from "@/lib/auth-api";

export function TenantManagement() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<ManagedTenant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    ownerEmail: "",
    plan: "starter",
    trialDays: "0",
    category: "Business",
    notes: "",
  });
  async function load() {
    try {
      const [tenantData, invitationData] = await Promise.all([
        getManagedTenants(),
        getInvitations(),
      ]);
      setTenants(tenantData.tenants);
      setInvitations(invitationData.invitations);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load tenant lifecycle data.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    try {
      setNotice("");
      const result = await createInvitation({ ...form, trialDays: Number(form.trialDays) });
      await navigator.clipboard?.writeText(result.invitation.invitationUrl ?? "");
      setNotice(
        "Invitation created. Its secure link has been copied when clipboard access is available.",
      );
      setForm({
        businessName: "",
        ownerName: "",
        ownerEmail: "",
        plan: "starter",
        trialDays: "0",
        category: "Business",
        notes: "",
      });
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create invitation.");
    }
  }
  return (
    <main className="min-h-screen bg-[#07111f] p-5 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Administration
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold">Tenant management</h1>
          </div>
          <Link to="/admin" className="rounded-lg border border-slate-700 px-3 py-2 text-sm">
            Back to dashboard
          </Link>
        </div>
        {notice ? (
          <p className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
            {notice}
          </p>
        ) : null}
        <section className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <form onSubmit={invite} className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
            <h2 className="font-display text-lg font-bold">Invite tenant</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              The owner sets their own password and completes their own onboarding. No admin access
              to tenant workspaces is provided.
            </p>
            <div className="mt-5 grid gap-3">
              {Object.entries(form).map(([key, value]) => (
                <label key={key} className="text-xs font-semibold capitalize text-slate-300">
                  {key.replace(/([A-Z])/g, " $1")}{" "}
                  {key === "plan" ? (
                    <select
                      value={value}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, plan: event.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3"
                    >
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="pro">Pro</option>
                    </select>
                  ) : (
                    <input
                      required={key !== "notes"}
                      type={
                        key === "ownerEmail" ? "email" : key === "trialDays" ? "number" : "text"
                      }
                      value={value}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [key]: event.target.value }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3"
                    />
                  )}
                </label>
              ))}
            </div>
            <button className="mt-5 w-full rounded-lg bg-emerald-400 py-2.5 text-sm font-bold text-slate-950">
              Create invitation
            </button>
          </form>
          <section className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
            <h2 className="font-display text-lg font-bold">Tenant workspaces</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3">Business / owner</th>
                    <th>Plan</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-t border-slate-800">
                      <td className="py-3">
                        <p className="font-semibold">{tenant.businessName}</p>
                        <p className="mt-1 text-slate-500">
                          {tenant.ownerName} · {tenant.ownerEmail}
                        </p>
                      </td>
                      <td className="capitalize">{tenant.plan}</td>
                      <td>{tenant.onboardingCompleted ? "Complete" : "Onboarding"}</td>
                      <td className="capitalize">{tenant.status.replace("-", " ")}</td>
                      <td>
                        <select
                          value={tenant.status === "invitation-sent" ? "active" : tenant.status}
                          onChange={(event) =>
                            void updateTenantStatus(
                              tenant.id,
                              event.target.value as ManagedTenant["status"],
                            ).then(load)
                          }
                          className="rounded border border-slate-700 bg-slate-900 p-1"
                        >
                          <option value="active">Activate</option>
                          <option value="suspended">Suspend</option>
                          <option value="archived">Archive</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="mt-7 font-display text-base font-bold">Pending invitations</h3>
            <div className="mt-3 space-y-2">
              {invitations
                .filter((item) => item.status === "pending")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 p-3 text-xs"
                  >
                    <span>
                      {item.businessName} · {item.ownerEmail}
                    </span>
                    <button
                      onClick={() => void cancelInvitation(item.id).then(load)}
                      className="text-rose-300"
                    >
                      Cancel
                    </button>
                  </div>
                )) || <p className="text-xs text-slate-500">No pending invitations.</p>}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
