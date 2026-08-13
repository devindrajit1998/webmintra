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
} from "lucide-react";
import { toast } from "sonner";
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
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load business information.");
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
  const completedFields = [business.name, business.logoUrl, business.email, business.phone, business.address, business.description].filter(Boolean).length;
  const completion = Math.round((completedFields / 6) * 100);

  function updateField(field: keyof BusinessInfo, value: string) {
    setBusiness((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business.name.trim()) return toast.error("Business name is required.");
    if (business.email && !/^\S+@\S+\.\S+$/.test(business.email)) return toast.error("Enter a valid business email address.");

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
    <form onSubmit={handleSubmit} className="space-y-6 pb-10">
      <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-300">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Business profile</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold text-white">Business information</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Manage the identity and contact details used across your websites and customer touchpoints.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!hasChanges || isSaving} onClick={() => setBusiness(savedBusiness)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 px-4 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw className="h-4 w-4" />Discard</button>
          <button type="submit" disabled={!hasChanges || isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-5 text-xs font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? "Saving" : "Save changes"}</button>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1826]">
        <div className="flex flex-col gap-6 border-b border-slate-800 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <BrandMark business={business} />
            <div className="min-w-0"><p className="truncate font-display text-xl font-bold text-white">{business.name || "Your business"}</p><p className="mt-1 truncate text-xs text-slate-500">{business.email || user.email}</p></div>
          </div>
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-300">Profile completeness</span><span className="font-bold text-emerald-300">{completion}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${completion}%` }} /></div>
          </div>
        </div>
        <div className="grid divide-y divide-slate-800 lg:grid-cols-[minmax(0,1fr)_360px] lg:divide-x lg:divide-y-0">
          <div className="p-5 sm:p-6">
            <SectionHeading title="Brand assets" description="Upload the visual identity shown across your web presence." />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <AssetUploader title="Business logo" detail="PNG, JPG, WebP, or SVG. Up to 2 MB." value={business.logoUrl} assetType="logo" onChange={(url) => updateField("logoUrl", url)} />
              <AssetUploader title="Browser favicon" detail="Square PNG, ICO, SVG, or WebP. Up to 2 MB." value={business.faviconUrl} assetType="favicon" onChange={(url) => updateField("faviconUrl", url)} square />
            </div>
          </div>
          <aside className="bg-slate-950/20 p-5 sm:p-6">
            <SectionHeading title="Brand preview" description="A quick view of your saved identity." />
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-700 bg-white">
              <div className="flex h-10 items-center gap-2 border-b border-slate-200 bg-slate-100 px-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><div className="ml-2 flex h-6 min-w-0 flex-1 items-center gap-2 rounded bg-white px-2 text-[9px] text-slate-400">{business.faviconUrl ? <img src={business.faviconUrl} alt="" className="h-3.5 w-3.5 object-contain" /> : <Globe2 className="h-3 w-3" />}yourwebsite.com</div></div>
              <div className="flex h-20 items-center gap-3 px-5">{business.logoUrl ? <img src={business.logoUrl} alt="Business logo preview" className="max-h-10 max-w-[150px] object-contain" /> : <span className="flex h-9 w-9 items-center justify-center rounded bg-slate-900 text-sm font-black text-white">{business.name.slice(0, 1).toUpperCase() || "B"}</span>}<span className="text-sm font-bold text-slate-900">{business.name || "Your business"}</span></div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />Your favicon is applied to published sites after you save this profile.</p>
          </aside>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#0b1826] p-5 sm:p-6">
        <SectionHeading title="Business details" description="Public-facing information customers use to identify and contact your business." />
        <div className="mt-6 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Business name" required value={business.name} onChange={(value) => updateField("name", value)} placeholder="e.g. Northstar Studio" icon={<Building2 className="h-4 w-4" />} />
          <Field label="Business email" type="email" value={business.email} onChange={(value) => updateField("email", value)} placeholder="hello@example.com" icon={<Mail className="h-4 w-4" />} />
          <Field label="Business phone" type="tel" value={business.phone} onChange={(value) => updateField("phone", value)} placeholder="+91 98765 43210" icon={<Phone className="h-4 w-4" />} />
          <div className="space-y-2 md:col-span-2 xl:col-span-3"><label htmlFor="business-address" className="text-xs font-semibold text-slate-300">Business address</label><div className="relative"><MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" /><textarea id="business-address" value={business.address} onChange={(event) => updateField("address", event.target.value)} maxLength={300} rows={3} placeholder="Street, city, state, and postal code" className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" /></div><Counter value={business.address.length} max={300} /></div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3"><label htmlFor="business-description" className="text-xs font-semibold text-slate-300">Business description</label><textarea id="business-description" value={business.description} onChange={(event) => updateField("description", event.target.value)} maxLength={500} rows={5} placeholder="Describe what your business does, who it serves, and what makes it different." className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" /><Counter value={business.description.length} max={500} /></div>
        </div>
      </section>
    </form>
  );
}

function AssetUploader({ title, detail, value, assetType, onChange, square = false }: { title: string; detail: string; value: string; assetType: "logo" | "favicon"; onChange: (url: string) => void; square?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select a supported image file.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be 2 MB or smaller.");
    setIsUploading(true);
    try {
      const result = await uploadBusinessBranding(file, assetType);
      onChange(result.url);
      toast.success(`${title} uploaded. Save changes to apply it.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <div className="rounded-lg border border-slate-700 bg-slate-950/35 p-4"><div><p className="text-sm font-bold text-slate-200">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div><button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading} className={`mt-4 flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-600 bg-slate-950/50 transition hover:border-emerald-400 hover:bg-emerald-400/5 ${square ? "h-36" : "h-36"}`}>{isUploading ? <Loader2 className="h-6 w-6 animate-spin text-emerald-300" /> : value ? <img src={value} alt={`${title} preview`} className={square ? "h-20 w-20 object-contain" : "max-h-20 max-w-[75%] object-contain"} /> : <span className="flex flex-col items-center gap-2 text-slate-500"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300">{square ? <Globe2 className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}</span><span className="text-xs font-semibold">Choose image</span></span>}</button><div className="mt-3 flex gap-2"><button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading} className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-slate-700 text-[11px] font-bold text-slate-300 hover:bg-slate-800"><Upload className="h-3.5 w-3.5" />{value ? "Replace" : "Upload"}</button>{value ? <button type="button" title={`Remove ${title}`} aria-label={`Remove ${title}`} onClick={() => onChange("")} className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-400/20 text-rose-300 hover:bg-rose-400/10"><X className="h-3.5 w-3.5" /></button> : null}</div><label className="mt-3 block"><span className="sr-only">{title} URL</span><input type="url" value={value} onChange={(event) => onChange(event.target.value)} maxLength={2048} placeholder="Or paste an image URL" className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 text-[11px] text-slate-300 outline-none placeholder:text-slate-600 focus:border-emerald-400" /></label><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} /></div>;
}

function BrandMark({ business }: { business: BusinessInfo }) { return business.logoUrl ? <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-white p-2"><img src={business.logoUrl} alt="Business logo" className="max-h-full max-w-full object-contain" /></span> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-xl font-black text-slate-950">{business.name.slice(0, 1).toUpperCase() || "B"}</span>; }
function SectionHeading({ title, description }: { title: string; description: string }) { return <div><h2 className="font-display text-base font-bold text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>; }
function Field({ label, value, onChange, placeholder, type = "text", required = false, icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean; icon: React.ReactNode }) { const id = `business-${label.toLowerCase().replaceAll(" ", "-")}`; return <div className="space-y-2"><label htmlFor={id} className="text-xs font-semibold text-slate-300">{label}{required ? <span className="ml-1 text-emerald-400">*</span> : null}</label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span><input id={id} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} maxLength={type === "email" ? 254 : type === "tel" ? 20 : 120} placeholder={placeholder} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/70 pl-10 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" /></div></div>; }
function Counter({ value, max }: { value: number; max: number }) { return <p className="text-right text-[10px] text-slate-600">{value}/{max}</p>; }
function LoadingState() { return <div className="grid min-h-[55vh] place-items-center rounded-xl border border-slate-800 bg-[#0b1826]"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-300" /><p className="mt-3 text-sm text-slate-500">Loading business profile...</p></div></div>; }
function ErrorState({ message }: { message: string }) { return <div className="grid min-h-[55vh] place-items-center rounded-xl border border-rose-400/20 bg-rose-400/5 p-6 text-center"><div><h1 className="font-display text-xl font-bold text-rose-300">Could not load business profile</h1><p className="mt-2 text-sm text-slate-400">{message}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-rose-400 px-4 py-2 text-sm font-bold text-slate-950">Try again</button></div></div>; }
