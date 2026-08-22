import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Lock, Mail, Save, Loader2 } from "lucide-react";
import { useTenantContext } from "@/components/TenantDashboard";
import {
  cancelAccountDeletionRequest,
  createAccountDeletionRequest,
  getAccountDeletionRequest,
  updateProfile,
  updatePassword,
} from "@/lib/auth-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/tenant/settings")({
  component: TenantSettingsPage,
  head: () => ({ meta: [{ title: "Settings | WebMintra" }] }),
});

function TenantSettingsPage() {
  const { user } = useTenantContext();
  const queryClient = useQueryClient();
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const deletionRequestQuery = useQuery({
    queryKey: ["account-deletion-request"],
    queryFn: getAccountDeletionRequest,
  });
  const deletionRequest = deletionRequestQuery.data?.deletionRequest;

  const requestDeletionMutation = useMutation({
    mutationFn: () => createAccountDeletionRequest(deletionReason, deletionConfirmation),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["account-deletion-request"] });
      setDeletionReason("");
      setDeletionConfirmation("");
      toast.success(result.message);
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: cancelAccountDeletionRequest,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["account-deletion-request"] });
      toast.success(result.message);
    },
    onError: (error) => toast.error(error.message),
  });

  // Profile Form State
  const [name, setName] = useState(user.name);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name cannot be empty");

    setIsSavingProfile(true);
    try {
      await updateProfile(name);
      toast.success("Profile updated successfully");
      // Reload to reflect name change in context/sidebar
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error("All password fields are required");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (newPassword.length < 12) {
      return toast.error("Password must be at least 12 characters");
    }

    setIsSavingPassword(true);
    try {
      await updatePassword(currentPassword, newPassword);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  }

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
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c2410c]">
            <User className="h-3.5 w-3.5" /> Account & Security
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Manage your personal profile details, authentication credentials, and security
            preferences.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="border-b border-[#f1f5f9] bg-[#f8fafc] p-6">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] shadow-2xs">
                <User className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-extrabold text-base text-[#0f172a]">Personal Profile</h2>
                <p className="text-xs text-[#64748b] mt-0.5">Update your display name and email</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2.5 pl-10 pr-4 text-xs font-bold text-[#64748b] cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-[#94a3b8]">
                Your email address is your unique workspace login credential.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-[#0f172a] outline-none transition focus:border-[#059669]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile || name === user.name}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-3 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSavingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSavingProfile ? "Saving Profile..." : "Save Profile"}</span>
            </button>
          </form>
        </section>

        {/* Security Card */}
        <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="border-b border-[#f1f5f9] bg-[#f8fafc] p-6">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] shadow-2xs">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-extrabold text-base text-[#0f172a]">Security & Password</h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Update your password to keep your account safe
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-[#0f172a] outline-none transition focus:border-[#059669]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="At least 12 characters"
                  className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-[#0f172a] outline-none transition focus:border-[#059669]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-[#0f172a] outline-none transition focus:border-[#059669]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-4 py-3 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSavingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              <span>{isSavingPassword ? "Updating Password..." : "Update Password"}</span>
            </button>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="overflow-hidden rounded-2xl border border-[#fecdd3] bg-white shadow-xs lg:col-span-2">
          <div className="border-b border-[#ffe4e6] bg-[#fff1f2] p-6">
            <h2 className="font-extrabold text-base text-[#e11d48]">Danger Zone</h2>
            <p className="mt-0.5 text-xs text-[#9f1239]">
              Account deletion requests require administrator review.
            </p>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xs font-bold text-[#0f172a]">
                {deletionRequest ? "Deletion request pending" : "Request account deletion"}
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#64748b]">
                {deletionRequest
                  ? `Submitted ${new Date(deletionRequest.requestedAt).toLocaleString()}. Your account remains active until an administrator approves the request.`
                  : "Submitting a request does not immediately delete your account. An administrator will review it before any permanent deletion occurs."}
              </p>
              {deletionRequest?.reason ? (
                <p className="mt-2 text-xs font-semibold text-[#64748b]">
                  Reason: {deletionRequest.reason}
                </p>
              ) : null}
            </div>

            {deletionRequestQuery.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
            ) : deletionRequest ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
                  >
                    Cancel Request
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel deletion request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your account will remain active and the administrator will no longer be asked
                      to delete it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={cancelDeletionMutation.isPending}
                      onClick={() => cancelDeletionMutation.mutate()}
                    >
                      Cancel Deletion Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-2.5 text-xs font-bold text-[#e11d48] transition hover:bg-[#ffe4e6] cursor-pointer"
                  >
                    Request Deletion
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Request permanent account deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                      An administrator must approve this request. If approved, your workspace and
                      associated data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-2">
                    <label className="block space-y-2">
                      <span className="text-xs font-bold text-[#0f172a]">Reason (optional)</span>
                      <textarea
                        value={deletionReason}
                        onChange={(event) => setDeletionReason(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-xl border border-[#e2e8f0] bg-white p-3 text-xs outline-none focus:border-rose-500"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-xs font-bold text-[#0f172a]">
                        Type <strong>DELETE MY ACCOUNT</strong> to confirm
                      </span>
                      <input
                        value={deletionConfirmation}
                        onChange={(event) => setDeletionConfirmation(event.target.value)}
                        className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs outline-none focus:border-rose-500 font-mono"
                      />
                    </label>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={
                        deletionConfirmation !== "DELETE MY ACCOUNT" ||
                        requestDeletionMutation.isPending
                      }
                      onClick={() => requestDeletionMutation.mutate()}
                      className="bg-rose-600 text-white hover:bg-rose-500"
                    >
                      {requestDeletionMutation.isPending ? "Submitting..." : "Submit Request"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
