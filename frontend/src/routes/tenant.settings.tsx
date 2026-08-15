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
    <div className="max-w-6xl space-y-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage your personal profile and account security.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm">
          <div className="border-b border-slate-800/60 bg-slate-900/40 p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400 ring-1 ring-inset ring-cyan-400/20">
                <User className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Personal Profile</h2>
                <p className="text-xs text-slate-400 mt-1">Update your basic information</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/50 py-3 pl-10 pr-4 text-sm text-slate-500 opacity-70 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Your email address is used for login and notifications.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/70" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-slate-200 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile || name === user.name}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            >
              <Save className="h-4 w-4" />
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Security Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm">
          <div className="border-b border-slate-800/60 bg-slate-900/40 p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400 ring-1 ring-inset ring-violet-400/20">
                <Lock className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Security</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Update your password to keep your account secure
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 px-4 text-sm text-slate-200 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400/70" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 px-4 text-sm text-slate-200 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Minimum 12 characters required.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400/70" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 px-4 text-sm text-slate-200 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            >
              <Save className="h-4 w-4" />
              {isSavingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="overflow-hidden rounded-2xl border border-rose-900/50 bg-slate-900/40 shadow-xl backdrop-blur-sm lg:col-span-2">
          <div className="border-b border-slate-800/60 bg-slate-900/40 p-6">
            <h2 className="font-display text-lg font-semibold text-rose-400">Danger Zone</h2>
            <p className="mt-1 text-xs text-slate-400">
              Account deletion requests require administrator review.
            </p>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {deletionRequest ? "Deletion request pending" : "Request account deletion"}
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                {deletionRequest
                  ? `Submitted ${new Date(deletionRequest.requestedAt).toLocaleString()}. Your account remains active until an administrator approves the request.`
                  : "Submitting a request does not immediately delete your account. An administrator will review it before any permanent deletion occurs."}
              </p>
              {deletionRequest?.reason ? (
                <p className="mt-2 text-xs text-slate-400">Reason: {deletionRequest.reason}</p>
              ) : null}
            </div>

            {deletionRequestQuery.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
            ) : deletionRequest ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex-shrink-0 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
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
                    className="flex-shrink-0 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-400 transition hover:border-rose-500/30 hover:bg-rose-500/20"
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
                      <span className="text-sm font-medium">Reason (optional)</span>
                      <textarea
                        value={deletionReason}
                        onChange={(event) => setDeletionReason(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-rose-500"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium">
                        Type <strong>DELETE MY ACCOUNT</strong> to confirm
                      </span>
                      <input
                        value={deletionConfirmation}
                        onChange={(event) => setDeletionConfirmation(event.target.value)}
                        className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-rose-500"
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
