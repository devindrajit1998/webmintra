import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  ImagePlus,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { changeAdminPassword, getProfile, updateProfile, uploadAdminFile } from "@/lib/admin-api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profile")({
  component: ProfilePage,
});

type AdminProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  avatarUrl?: string;
};

type ProfileResponse = { profile: AdminProfile };

type PasswordStrength = {
  score: number;
  label: string;
  color: string;
};

function formatDate(value?: string, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return "A";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "Enter a new password", color: "bg-slate-700" };
  const checks = [
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  if (score <= 1) return { score, label: "Weak", color: "bg-rose-500" };
  if (score === 2) return { score, label: "Fair", color: "bg-amber-400" };
  if (score === 3) return { score, label: "Good", color: "bg-cyan-400" };
  return { score, label: "Strong", color: "bg-emerald-400" };
}

function ProfilePage() {
  const queryClient = useQueryClient();
  const [details, setDetails] = useState({ name: "", phone: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ["adminProfile"],
    queryFn: getProfile,
  });

  const profile = profileQuery.data?.profile;

  useEffect(() => {
    if (profile) {
      setDetails({ name: profile.name ?? "", phone: profile.phone ?? "" });
    }
  }, [profile]);

  const detailsChanged = Boolean(
    profile &&
    (details.name.trim() !== profile.name || details.phone.trim() !== (profile.phone ?? "")),
  );

  const passwordStrength = useMemo(() => getPasswordStrength(passwords.newPassword), [passwords.newPassword]);
  const passwordsMatch = !passwords.confirmPassword || passwords.newPassword === passwords.confirmPassword;
  const passwordReady = Boolean(
    passwords.currentPassword &&
    passwords.newPassword.length >= 12 &&
    passwords.newPassword.length <= 128 &&
    passwords.newPassword === passwords.confirmPassword,
  );

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (response: ProfileResponse) => {
      queryClient.setQueryData<ProfileResponse>(["adminProfile"], (current) => ({
        profile: { ...(current?.profile ?? profile), ...response.profile } as AdminProfile,
      }));
      toast.success("Profile details updated");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to update your profile."),
  });

  const passwordMutation = useMutation({
    mutationFn: changeAdminPassword,
    onSuccess: (response) => {
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success(response.message || "Password changed successfully");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to change your password."),
  });

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = details.name.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    profileMutation.mutate({ name, phone: details.phone.trim() });
  }

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (!passwordReady) {
      toast.error("Use a password between 12 and 128 characters.");
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile images must be 5 MB or smaller.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const upload = await uploadAdminFile(file);
      if (!upload?.url) throw new Error("The image upload did not return a URL.");
      const response = await updateProfile({ avatarUrl: upload.url });
      queryClient.setQueryData<ProfileResponse>(["adminProfile"], (current) => ({
        profile: { ...(current?.profile ?? profile), ...response.profile } as AdminProfile,
      }));
      toast.success("Profile image updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload profile image.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleAvatarRemove() {
    setIsUploadingAvatar(true);
    try {
      const response = await updateProfile({ avatarUrl: "" });
      queryClient.setQueryData<ProfileResponse>(["adminProfile"], (current) => ({
        profile: { ...(current?.profile ?? profile), ...response.profile } as AdminProfile,
      }));
      toast.success("Profile image removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove profile image.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (profileQuery.isLoading) return <ProfileSkeleton />;

  if (profileQuery.isError || !profile) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
        <div className="w-full rounded-lg border border-rose-500/25 bg-[#0b1826] p-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-100">Profile could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-400">{profileQuery.error?.message || "The profile service is unavailable."}</p>
          <button
            type="button"
            onClick={() => void profileQuery.refetch()}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <header className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">Account settings</p>
          <h1 className="text-2xl font-bold text-slate-50">Profile & security</h1>
          <p className="mt-1 text-sm text-slate-400">Keep your administrator identity and sign-in credentials current.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Last updated {formatDate(profile.updatedAt, true)}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-5">
            <div className="flex items-center gap-4 lg:block lg:text-center">
              <div className="group relative mx-0 h-16 w-16 shrink-0 lg:mx-auto lg:h-20 lg:w-20">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-emerald-400/25 bg-emerald-400/10 text-xl font-bold text-emerald-300 lg:text-2xl">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.name} profile`} className="h-full w-full object-cover" /> : getInitials(profile.name)}
                </div>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-slate-950/75 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" title="Upload profile image">
                  {isUploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                  <span className="sr-only">Upload profile image</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} disabled={isUploadingAvatar} className="sr-only" />
                </label>
              </div>
              <div className="min-w-0 lg:mt-3">
                <h2 className="truncate text-base font-semibold text-slate-100">{profile.name}</h2>
                <p className="mt-0.5 truncate text-xs text-slate-400">{profile.email}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-3 text-[11px]">
              <label className="inline-flex cursor-pointer items-center gap-1 text-emerald-300 hover:text-emerald-200">
                <ImagePlus className="h-3.5 w-3.5" /> {profile.avatarUrl ? "Replace image" : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} disabled={isUploadingAvatar} className="sr-only" />
              </label>
              {profile.avatarUrl ? <button type="button" onClick={() => void handleAvatarRemove()} disabled={isUploadingAvatar} className="text-slate-500 hover:text-rose-300 disabled:opacity-50">Remove</button> : null}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">PNG, JPG, WEBP or GIF · max 5 MB</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-500">Access level</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> {profile.role}
              </span>
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-[#0b1826] p-4">
            <h2 className="text-xs font-semibold uppercase text-slate-400">Account status</h2>
            <div className="mt-3 space-y-3">
              <StatusRow label="Email" verified={Boolean(profile.isEmailVerified)} />
              {profile.phone ? <StatusRow label="Phone" verified={Boolean(profile.isPhoneVerified)} /> : null}
              <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs">
                <span className="flex items-center gap-2 text-slate-400"><CalendarDays className="h-4 w-4" /> Member since</span>
                <span className="font-medium text-slate-200">{formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <form onSubmit={handleProfileSubmit} className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b1826]">
            <SectionHeader
              icon={<UserRound className="h-4 w-4" />}
              title="Personal information"
              description="Information used to identify your administrator account."
            />
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Full name" htmlFor="profile-name" required>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="profile-name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={details.name}
                    onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/40 pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                  />
                </div>
              </Field>
              <Field label="Email address" htmlFor="profile-email" hint="Managed through account verification">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="profile-email"
                    type="email"
                    readOnly
                    value={profile.email}
                    className="h-10 w-full cursor-not-allowed rounded-md border border-slate-800 bg-slate-950/25 pl-9 pr-9 text-sm text-slate-400 outline-none"
                  />
                  {profile.isEmailVerified ? <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" /> : null}
                </div>
              </Field>
              <Field label="Phone number" htmlFor="profile-phone" hint="Optional, include country code">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={details.phone}
                    onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-950/40 pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                  />
                </div>
              </Field>
              <div className="flex items-end">
                <div className="w-full rounded-md border border-slate-800 bg-slate-950/25 px-3 py-2.5 text-xs text-slate-400">
                  Account ID <span className="mt-1 block truncate font-mono text-[11px] text-slate-300">{profile.id}</span>
                </div>
              </div>
            </div>
            <FormActions>
              <p className="text-xs text-slate-500">{detailsChanged ? "You have unsaved profile changes." : "Profile details are up to date."}</p>
              <button
                type="submit"
                disabled={!detailsChanged || profileMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {profileMutation.isPending ? "Saving" : "Save profile"}
              </button>
            </FormActions>
          </form>

          <form onSubmit={handlePasswordSubmit} className="overflow-hidden rounded-lg border border-slate-800 bg-[#0b1826]">
            <SectionHeader
              icon={<LockKeyhole className="h-4 w-4" />}
              title="Password"
              description="Use a unique password you do not use for another account."
            />
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Current password" htmlFor="current-password" required>
                <PasswordInput
                  id="current-password"
                  value={passwords.currentPassword}
                  visible={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword((value) => !value)}
                  onChange={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))}
                  autoComplete="current-password"
                />
              </Field>
              <div className="hidden sm:block" />
              <Field label="New password" htmlFor="new-password" required hint="12 to 128 characters">
                <PasswordInput
                  id="new-password"
                  value={passwords.newPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm new password" htmlFor="confirm-password" required>
                <PasswordInput
                  id="confirm-password"
                  value={passwords.confirmPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))}
                  autoComplete="new-password"
                  invalid={!passwordsMatch}
                />
                {!passwordsMatch ? <p className="mt-1.5 text-xs text-rose-400">Passwords do not match.</p> : null}
              </Field>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Password strength</span>
                  <span className="font-medium text-slate-300">{passwordStrength.label}</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label={`Password strength: ${passwordStrength.label}`}>
                  {[1, 2, 3, 4].map((level) => (
                    <span key={level} className={`h-1 rounded-full ${level <= passwordStrength.score ? passwordStrength.color : "bg-slate-800"}`} />
                  ))}
                </div>
              </div>
            </div>
            <FormActions>
              <p className="flex items-center gap-1.5 text-xs text-slate-500"><KeyRound className="h-3.5 w-3.5" /> Changing your password requires the current password.</p>
              <button
                type="submit"
                disabled={!passwordReady || passwordMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {passwordMutation.isPending ? "Updating" : "Update password"}
              </button>
            </FormActions>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`inline-flex items-center gap-1.5 font-medium ${verified ? "text-emerald-300" : "text-amber-300"}`}>
        {verified ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {verified ? "Verified" : "Not verified"}
      </span>
    </div>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-emerald-300">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, required, children }: { label: string; htmlFor: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-xs font-medium text-slate-300">{label}{required ? <span className="ml-1 text-emerald-400">*</span> : null}</label>
        {hint ? <span className="text-[10px] text-slate-600">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, visible, onToggle, onChange, autoComplete, invalid = false }: { id: string; value: string; visible: boolean; onToggle: () => void; onChange: (value: string) => void; autoComplete: string; invalid?: boolean }) {
  return (
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-md border bg-slate-950/40 pl-9 pr-10 text-sm text-slate-100 outline-none transition focus:ring-2 ${invalid ? "border-rose-500 focus:border-rose-400 focus:ring-rose-400/10" : "border-slate-700 focus:border-emerald-400 focus:ring-emerald-400/10"}`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">{children}</div>;
}

function ProfileSkeleton() {
  return (
    <div className="w-full animate-pulse" aria-busy="true" aria-label="Loading profile">
      <div className="mb-6 border-b border-slate-800 pb-5">
        <div className="h-3 w-28 rounded bg-slate-800" />
        <div className="mt-3 h-7 w-52 rounded bg-slate-800" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-slate-800/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="h-72 rounded-lg border border-slate-800 bg-[#0b1826]" />
        <div className="space-y-6">
          <div className="h-80 rounded-lg border border-slate-800 bg-[#0b1826]" />
          <div className="h-96 rounded-lg border border-slate-800 bg-[#0b1826]" />
        </div>
      </div>
    </div>
  );
}
