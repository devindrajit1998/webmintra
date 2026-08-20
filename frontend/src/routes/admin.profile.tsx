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
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
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

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwords.newPassword),
    [passwords.newPassword],
  );
  const passwordsMatch =
    !passwords.confirmPassword || passwords.newPassword === passwords.confirmPassword;
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
        <div className="w-full rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-[#0b192c]">Profile could not be loaded</h1>
          <p className="mt-2 text-xs text-[#64748b]">
            {profileQuery.error?.message || "The profile service is unavailable."}
          </p>
          <button
            type="button"
            onClick={() => void profileQuery.refetch()}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857]"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-10 font-sans space-y-6">
      <header className="flex flex-col gap-3 border-b border-[#e2e8f0] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-[#fff7ed] border border-[#fed7aa] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#c2410c] mb-1.5 shadow-2xs">
            🇮🇳 Account Settings
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c] tracking-tight">Profile & Security</h1>
          <p className="mt-1 text-xs sm:text-sm text-[#64748b]">
            Keep your administrator identity and sign-in credentials current.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748b]">
          <Clock3 className="h-3.5 w-3.5" />
          Last updated {formatDate(profile.updatedAt, true)}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4 lg:block lg:text-center">
              <div className="group relative mx-0 h-16 w-16 shrink-0 lg:mx-auto lg:h-20 lg:w-20">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-[#059669] bg-[#ecfdf5] text-xl font-bold text-[#059669] lg:text-2xl shadow-xs">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={`${profile.name} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(profile.name)
                  )}
                </div>
                <label
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-[#0f172a]/70 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 backdrop-blur-2xs"
                  title="Upload profile image"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  <span className="sr-only">Upload profile image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="min-w-0 lg:mt-3">
                <h2 className="truncate text-base font-extrabold text-[#0b192c]">{profile.name}</h2>
                <p className="mt-0.5 truncate text-xs text-[#64748b]">{profile.email}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-3 text-xs font-bold">
              <label className="inline-flex cursor-pointer items-center gap-1 text-[#059669] hover:underline">
                <ImagePlus className="h-3.5 w-3.5" />{" "}
                {profile.avatarUrl ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="sr-only"
                />
              </label>
              {profile.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void handleAvatarRemove()}
                  disabled={isUploadingAvatar}
                  className="text-rose-500 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-center text-[10.5px] text-[#94a3b8]">
              PNG, JPG, WEBP · max 5 MB
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-[#f1f5f9] pt-3.5">
              <span className="text-xs font-semibold text-[#64748b]">Access level</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 text-[11px] font-bold capitalize text-[#047857]">
                <ShieldCheck className="h-3.5 w-3.5" /> {profile.role}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Account Status</h2>
            <div className="mt-3.5 space-y-3">
              <StatusRow label="Email Verification" verified={Boolean(profile.isEmailVerified)} />
              {profile.phone ? (
                <StatusRow label="Mobile Phone (+91)" verified={Boolean(profile.isPhoneVerified)} />
              ) : null}
              <div className="flex items-center justify-between gap-3 border-t border-[#f1f5f9] pt-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-[#64748b]">
                  <CalendarDays className="h-4 w-4 text-[#94a3b8]" /> Member since
                </span>
                <span className="font-bold text-[#0b192c]">{formatDate(profile.createdAt)}</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <form
            onSubmit={handleProfileSubmit}
            className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm"
          >
            <SectionHeader
              icon={<UserRound className="h-4 w-4" />}
              title="Personal Information"
              description="Information used to identify your administrator account across India."
            />
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Field label="Full name" htmlFor="profile-name" required>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    id="profile-name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={details.name}
                    onChange={(event) =>
                      setDetails((current) => ({ ...current, name: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white pl-10 pr-3 text-xs sm:text-sm text-[#0f172a] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                  />
                </div>
              </Field>
              <Field
                label="Email address"
                htmlFor="profile-email"
                hint="Managed through account verification"
              >
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    id="profile-email"
                    type="email"
                    readOnly
                    value={profile.email}
                    className="h-10 w-full cursor-not-allowed rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-10 pr-9 text-xs sm:text-sm text-[#64748b] outline-none"
                  />
                  {profile.isEmailVerified ? (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#059669]" />
                  ) : null}
                </div>
              </Field>
              <Field
                label="Mobile phone number"
                htmlFor="profile-phone"
                hint="Optional, include +91"
              >
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={details.phone}
                    onChange={(event) =>
                      setDetails((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white pl-10 pr-3 text-xs sm:text-sm text-[#0f172a] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                  />
                </div>
              </Field>
              <div className="flex items-end">
                <div className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-xs text-[#64748b]">
                  Account ID{" "}
                  <span className="mt-0.5 block truncate font-mono text-[11px] font-bold text-[#0b192c]">
                    {profile.id}
                  </span>
                </div>
              </div>
            </div>
            <FormActions>
              <p className="text-xs text-[#64748b]">
                {detailsChanged
                  ? "You have unsaved profile changes."
                  : "Profile details are up to date."}
              </p>
              <button
                type="submit"
                disabled={!detailsChanged || profileMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {profileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {profileMutation.isPending ? "Saving..." : "Save Profile"}
              </button>
            </FormActions>
          </form>

          <form
            onSubmit={handlePasswordSubmit}
            className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm"
          >
            <SectionHeader
              icon={<LockKeyhole className="h-4 w-4" />}
              title="Password & Credentials"
              description="Use a unique password you do not use for other services."
            />
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Field label="Current password" htmlFor="current-password" required>
                <PasswordInput
                  id="current-password"
                  value={passwords.currentPassword}
                  visible={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword((value) => !value)}
                  onChange={(value) =>
                    setPasswords((current) => ({ ...current, currentPassword: value }))
                  }
                  autoComplete="current-password"
                />
              </Field>
              <div className="hidden sm:block" />
              <Field
                label="New password"
                htmlFor="new-password"
                required
                hint="12 to 128 characters"
              >
                <PasswordInput
                  id="new-password"
                  value={passwords.newPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  onChange={(value) =>
                    setPasswords((current) => ({ ...current, newPassword: value }))
                  }
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm new password" htmlFor="confirm-password" required>
                <PasswordInput
                  id="confirm-password"
                  value={passwords.confirmPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  onChange={(value) =>
                    setPasswords((current) => ({ ...current, confirmPassword: value }))
                  }
                  autoComplete="new-password"
                  invalid={!passwordsMatch}
                />
                {!passwordsMatch ? (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">Passwords do not match.</p>
                ) : null}
              </Field>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748b]">Password strength</span>
                  <span className="font-bold text-[#0b192c]">{passwordStrength.label}</span>
                </div>
                <div
                  className="mt-2 grid grid-cols-4 gap-1.5"
                  aria-label={`Password strength: ${passwordStrength.label}`}
                >
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`h-1.5 rounded-full ${level <= passwordStrength.score ? passwordStrength.color : "bg-[#f1f5f9]"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <FormActions>
              <p className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <KeyRound className="h-3.5 w-3.5 text-[#ea580c]" /> Changing your password requires your current password.
              </p>
              <button
                type="submit"
                disabled={!passwordReady || passwordMutation.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {passwordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {passwordMutation.isPending ? "Updating..." : "Update Password"}
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
      <span className="font-medium text-[#64748b]">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-bold ${verified ? "text-[#047857]" : "text-[#c2410c]"}`}
      >
        {verified ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {verified ? "Verified" : "Pending OTP"}
      </span>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#f1f5f9] px-6 py-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-extrabold text-[#0b192c]">{title}</h2>
        <p className="mt-0.5 text-xs text-[#64748b]">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-xs font-bold text-[#0b192c]">
          {label}
          {required ? <span className="ml-1 text-[#ea580c]">*</span> : null}
        </label>
        {hint ? <span className="text-[10px] font-medium text-[#94a3b8]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  visible,
  onToggle,
  onChange,
  autoComplete,
  invalid = false,
}: {
  id: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-xl border pl-10 pr-10 text-xs sm:text-sm text-[#0f172a] outline-none transition ${invalid ? "border-rose-400 focus:border-rose-500" : "border-[#cbd5e1] bg-white focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"}`}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-[#94a3b8] transition hover:text-[#0f172a]"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#f1f5f9] bg-[#f8fafc] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="w-full animate-pulse" aria-busy="true" aria-label="Loading profile">
      <div className="mb-6 border-b border-[#e2e8f0] pb-5">
        <div className="h-3 w-28 rounded bg-[#e2e8f0]" />
        <div className="mt-3 h-7 w-52 rounded bg-[#e2e8f0]" />
        <div className="mt-2 h-4 w-80 max-w-full rounded bg-[#e2e8f0]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="h-72 rounded-2xl border border-[#e2e8f0] bg-white" />
        <div className="space-y-6">
          <div className="h-80 rounded-2xl border border-[#e2e8f0] bg-white" />
          <div className="h-96 rounded-2xl border border-[#e2e8f0] bg-white" />
        </div>
      </div>
    </div>
  );
}
