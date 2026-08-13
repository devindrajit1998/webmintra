import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { User, Lock, Mail, Save } from "lucide-react";
import { useTenantContext } from "@/components/TenantDashboard";
import { updateProfile, updatePassword } from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/settings")({
  component: TenantSettingsPage,
  head: () => ({ meta: [{ title: "Settings | WebMintra" }] }),
});

function TenantSettingsPage() {
  const { user } = useTenantContext();

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
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your personal profile and account security.</p>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input 
                  type="email" 
                  value={user.email} 
                  disabled 
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/50 py-3 pl-10 pr-4 text-sm text-slate-500 opacity-70 cursor-not-allowed" 
                />
              </div>
              <p className="text-[10px] text-slate-500">Your email address is used for login and notifications.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
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
                <p className="text-xs text-slate-400 mt-1">Update your password to keep your account secure</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Password</label>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">New Password</label>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Confirm New Password</label>
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
            <p className="text-xs text-slate-400 mt-1">Irreversible actions for your account</p>
          </div>
          
          <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Delete Account</h3>
              <p className="text-xs text-slate-500 mt-1">Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            <button 
              type="button" 
              className="flex-shrink-0 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-400 border border-rose-500/20 transition hover:bg-rose-500/20 hover:border-rose-500/30"
              onClick={() => toast.error("Account deletion requires admin approval.")}
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
