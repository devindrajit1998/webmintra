import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  Globe2,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Upload,
  X,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { MediaLibraryModal } from "@/components/ui/media-library-modal";
import { useTenantContext } from "@/components/TenantDashboard";
import {
  getBusinessInfo,
  updateBusinessInfo,
  uploadBusinessBranding,
  type BusinessInfo,
} from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/business")({
  component: TenantBusinessPage,
  head: () => ({ meta: [{ title: "Business information | WebMintra" }] }),
});

const emptyBusiness: BusinessInfo = {
  name: "",
  logoUrl: "",
  faviconUrl: "",
  address: "",
  email: "",
  phone: "",
  description: "",
};

function TenantBusinessPage() {
  const { user } = useTenantContext();
  const [business, setBusiness] = useState<BusinessInfo>(emptyBusiness);
  const [savedBusiness, setSavedBusiness] = useState<BusinessInfo>(emptyBusiness);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    getBusinessInfo()
      .then(({ business: loaded }) => {
        if (!active) return;
        setBusiness(loaded);
        setSavedBusiness(loaded);
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof Error ? error.message : "Unable to load business information.",
          );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(business) !== JSON.stringify(savedBusiness),
    [business, savedBusiness],
  );
  const completedFields = [
    business.name,
    business.logoUrl,
    business.email,
    business.phone,
    business.address,
    business.description,
  ].filter(Boolean).length;
  const completion = Math.round((completedFields / 6) * 100);

  function updateField(field: keyof BusinessInfo, value: string) {
    setBusiness((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business.name.trim()) return toast.error("Business name is required.");
    if (business.email && !/^\S+@\S+\.\S+$/.test(business.email))
      return toast.error("Enter a valid business email address.");

    setIsSaving(true);
    try {
      const { business: updated } = await updateBusinessInfo(business);
      setBusiness(updated);
      setSavedBusiness(updated);
      toast.success("Business profile saved.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to save business information.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <form onSubmit={handleSubmit} className="max-w-[1600px] space-y-6 pb-12">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white px-5 py-6 shadow-xs sm:px-7">
        <div className="absolute inset-x-0 top-0 flex h-1" aria-hidden="true">
          <span className="flex-1 bg-[#ea580c]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#059669]" />
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#fff7ed] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-48 w-48 rounded-full bg-[#ecfdf5] blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c2410c]">
              <Building2 className="h-3.5 w-3.5" /> Identity & Branding
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Business Information
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Manage the brand identity, logo, and contact details used across your websites and
              customer emails.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!hasChanges || isSaving}
              onClick={() => setBusiness(savedBusiness)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 text-xs font-bold text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Discard</span>
            </button>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? "Saving..." : "Save Profile"}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
        <div className="flex flex-col gap-6 border-b border-[#f1f5f9] p-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between bg-[#f8fafc]">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark business={business} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-extrabold text-[#0f172a]">
                {business.name || "Your Business"}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-[#64748b]">
                {business.email || user.email}
              </p>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#64748b]">Profile Completeness</span>
              <span className="font-extrabold text-[#059669]">{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
              <div
                className="h-full rounded-full bg-[#059669] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>
        <div className="grid divide-y divide-[#f1f5f9] lg:grid-cols-[minmax(0,1fr)_380px] lg:divide-x lg:divide-y-0">
          <div className="p-6 sm:p-7">
            <SectionHeading
              title="Brand Assets"
              description="Upload the visual logo and favicon shown across your websites and search tabs."
            />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <AssetUploader
                title="Business Logo"
                detail="PNG, JPG, WebP, or SVG. Up to 2 MB."
                value={business.logoUrl}
                assetType="logo"
                onChange={(url) => updateField("logoUrl", url)}
              />
              <AssetUploader
                title="Browser Favicon"
                detail="Square PNG, ICO, SVG, or WebP. Up to 2 MB."
                value={business.faviconUrl}
                assetType="favicon"
                onChange={(url) => updateField("faviconUrl", url)}
                square
              />
            </div>
          </div>
          <aside className="bg-[#f8fafc] p-6 sm:p-7">
            <SectionHeading
              title="Live Brand Preview"
              description="Preview of your header logo and browser tab favicon."
            />
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
              <div className="flex h-10 items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-3.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#fca5a5]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#fde047]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#86efac]" />
                <div className="ml-2 flex h-6 min-w-0 flex-1 items-center gap-2 rounded-lg bg-white border border-[#e2e8f0] px-2 text-[10px] font-semibold text-[#64748b]">
                  {business.faviconUrl ? (
                    <img src={business.faviconUrl} alt="" className="h-3.5 w-3.5 object-contain" />
                  ) : (
                    <Globe2 className="h-3 w-3 text-[#059669]" />
                  )}
                  yourwebsite.com
                </div>
              </div>
              <div className="flex h-24 items-center gap-3.5 px-6">
                {business.logoUrl ? (
                  <img
                    src={business.logoUrl}
                    alt="Business logo preview"
                    className="max-h-12 max-w-[150px] object-contain"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-sm font-black text-[#059669]">
                    {business.name.slice(0, 1).toUpperCase() || "B"}
                  </span>
                )}
                <span className="text-sm font-extrabold text-[#0f172a]">
                  {business.name || "Your business"}
                </span>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#64748b]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#059669]" />
              Your favicon and logo are instantly applied to published sites when you save.
            </p>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs sm:p-7">
        <SectionHeading
          title="Contact & Location Details"
          description="Public-facing information displayed on your contact pages, footer widgets, and invoice receipts."
        />
        <div className="mt-6 grid gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Business name"
            required
            value={business.name}
            onChange={(value) => updateField("name", value)}
            placeholder="e.g. Northstar Studio"
            icon={<Building2 className="h-4 w-4" />}
          />
          <Field
            label="Business email"
            type="email"
            value={business.email}
            onChange={(value) => updateField("email", value)}
            placeholder="hello@example.com"
            icon={<Mail className="h-4 w-4" />}
          />
          <Field
            label="Business phone"
            type="tel"
            value={business.phone}
            onChange={(value) => updateField("phone", value)}
            placeholder="+91 98765 43210"
            icon={<Phone className="h-4 w-4" />}
          />
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <label htmlFor="business-address" className="text-xs font-bold text-[#0f172a]">
              Business address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-[#94a3b8]" />
              <textarea
                id="business-address"
                value={business.address}
                onChange={(event) => updateField("address", event.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Street, city, state, and postal code"
                className="w-full resize-y rounded-xl border border-[#e2e8f0] bg-white py-3 pl-10 pr-4 text-xs font-semibold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#059669]"
              />
            </div>
            <Counter value={business.address.length} max={300} />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <label htmlFor="business-description" className="text-xs font-bold text-[#0f172a]">
              Business description
            </label>
            <textarea
              id="business-description"
              value={business.description}
              onChange={(event) => updateField("description", event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Describe what your business does, who it serves, and what makes it different."
              className="w-full resize-y rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-xs font-semibold leading-relaxed text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#059669]"
            />
            <Counter value={business.description.length} max={500} />
          </div>
        </div>
      </section>
    </form>
  );
}

function AssetUploader({
  title,
  detail,
  value,
  assetType,
  onChange,
  square = false,
}: {
  title: string;
  detail: string;
  value: string;
  assetType: "logo" | "favicon";
  onChange: (url: string) => void;
  square?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <div>
        <p className="text-xs font-extrabold text-[#0f172a]">{title}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-[#64748b]">{detail}</p>
      </div>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`mt-3.5 flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#cbd5e1] bg-white transition hover:border-[#059669] hover:bg-[#ecfdf5]/30 cursor-pointer ${square ? "h-36" : "h-36"}`}
      >
        {value ? (
          <img
            src={value}
            alt={`${title} preview`}
            className={square ? "h-20 w-20 object-contain" : "max-h-20 max-w-[75%] object-contain"}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-[#94a3b8]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b]">
              {square ? (
                <Globe2 className="h-5 w-5 text-[#059669]" />
              ) : (
                <ImageIcon className="h-5 w-5 text-[#059669]" />
              )}
            </span>
            <span className="text-xs font-bold text-[#64748b]">Choose from library</span>
          </span>
        )}
      </button>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-white border border-[#e2e8f0] text-xs font-bold text-[#0f172a] hover:bg-[#f8fafc] cursor-pointer transition shadow-2xs"
        >
          <Layers className="h-3.5 w-3.5 text-[#059669]" />
          {value ? "Change Image" : "Browse Library"}
        </button>
        {value ? (
          <button
            type="button"
            title={`Remove ${title}`}
            aria-label={`Remove ${title}`}
            onClick={() => onChange("")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48] hover:bg-[#ffe4e6] cursor-pointer transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <label className="mt-2.5 block">
        <span className="sr-only">{title} URL</span>
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={2048}
          placeholder="Or paste an image URL"
          className="h-9 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-[11px] font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669]"
        />
      </label>

      <MediaLibraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(url) => {
          onChange(url);
          toast.success(`${title} selected.`);
        }}
        title={`Select ${title}`}
        initialSelectedUrl={value}
        aspectRatioHint={square ? "Square format recommended" : "Horizontal logo"}
      />
    </div>
  );
}

function BrandMark({ business }: { business: BusinessInfo }) {
  return business.logoUrl ? (
    <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white p-2 shadow-2xs">
      <img
        src={business.logoUrl}
        alt="Business logo"
        className="max-h-full max-w-full object-contain"
      />
    </span>
  ) : (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-xl font-black text-[#059669] shadow-2xs">
      {business.name.slice(0, 1).toUpperCase() || "B"}
    </span>
  );
}
function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="font-display text-sm font-extrabold text-[#0f172a]">{title}</h2>
      <p className="mt-0.5 text-xs text-[#64748b]">{description}</p>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  icon: React.ReactNode;
}) {
  const id = `business-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold text-[#0f172a]">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">{icon}</span>
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={type === "email" ? 254 : type === "tel" ? 20 : 120}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white pl-10 pr-4 text-xs font-semibold text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#059669]"
        />
      </div>
    </div>
  );
}
function Counter({ value, max }: { value: number; max: number }) {
  return (
    <p className="text-right text-[10px] font-semibold text-[#94a3b8]">
      {value}/{max}
    </p>
  );
}
function LoadingState() {
  return (
    <div className="grid min-h-[55vh] place-items-center rounded-2xl border border-[#e2e8f0] bg-white">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#059669]" />
        <p className="mt-3 text-xs font-semibold text-[#64748b]">Loading business profile...</p>
      </div>
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[55vh] place-items-center rounded-2xl border border-[#fecdd3] bg-[#fff1f2] p-8 text-center">
      <div>
        <h1 className="font-display text-base font-extrabold text-[#e11d48]">
          Could not load business profile
        </h1>
        <p className="mt-1 text-xs text-[#64748b]">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
