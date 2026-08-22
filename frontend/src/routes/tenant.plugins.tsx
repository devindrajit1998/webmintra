import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  MessageCircle,
  Puzzle,
  CheckCircle2,
  ExternalLink,
  Settings2,
  Loader2,
  Sparkles,
  Phone,
  HelpCircle,
  X,
  Save,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/components/TenantDashboard";
import {
  getWebsitePlugins,
  toggleWebsitePlugin,
  saveWebsitePluginConfig,
  type PluginCatalogItem,
  type InstalledPlugin,
} from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/plugins")({
  component: TenantPluginsPage,
  head: () => ({ meta: [{ title: "Plugins & Growth Apps | WebMintra" }] }),
});

const DEFAULT_CATALOG: PluginCatalogItem[] = [
  {
    slug: "custom-domains",
    name: "Custom Domain & Branding",
    category: "Infrastructure",
    badge: "Core",
    tagline: "Connect your own www address with automated SSL security.",
    description:
      "Replace the default subdomain with your official business domain name (e.g. www.yourcompany.in) to look professional and build trust.",
    icon: "Globe",
    color: "emerald",
    isCore: true,
    deepLink: "/tenant/domains",
    defaultConfig: {},
    fields: [],
  },
  {
    slug: "whatsapp-chat",
    name: "Floating WhatsApp Chat",
    category: "Sales & Leads",
    badge: "Popular",
    tagline: "Let visitors chat with you on WhatsApp with 1 tap.",
    description:
      "Adds a clean floating WhatsApp button on the bottom corner of your website so customers can instantly ask questions, inquire about prices, and place orders directly.",
    icon: "MessageCircle",
    color: "green",
    isCore: false,
    defaultConfig: {
      phoneNumber: "",
      greetingMessage: "Hello! I am interested in your services and would like more details.",
      buttonPosition: "bottom-right",
      popupHeader: "Chat with us on WhatsApp",
      popupSubheader: "Typically replies within a few minutes",
      callToAction: "Need help? Chat with us",
      showBadge: true,
    },
    fields: [
      {
        name: "phoneNumber",
        label: "WhatsApp Phone Number (with Country Code)",
        type: "tel",
        placeholder: "+91 98765 43210",
        required: true,
        helpText: "Enter your 10-digit mobile number with +91 country code.",
      },
      {
        name: "greetingMessage",
        label: "Pre-filled Message",
        type: "textarea",
        rows: 2,
        placeholder: "Hello! I would like to know more about your services.",
        required: false,
        helpText: "This text is automatically typed when a customer opens WhatsApp.",
      },
      {
        name: "callToAction",
        label: "Button Tooltip / Call to Action",
        type: "text",
        placeholder: "Need help? Chat with us",
        required: false,
        helpText: "Text displayed next to the WhatsApp icon.",
      },
      {
        name: "buttonPosition",
        label: "Position on Screen",
        type: "select",
        options: [
          { label: "Bottom Right (Recommended)", value: "bottom-right" },
          { label: "Bottom Left", value: "bottom-left" },
        ],
        required: false,
      },
    ],
  },
];

function TenantPluginsPage() {
  const { websites } = useTenantContext();
  const queryClient = useQueryClient();

  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(websites[0]?.id || "");

  useEffect(() => {
    if (!selectedWebsiteId && websites.length > 0) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  const [activeConfigPlugin, setActiveConfigPlugin] = useState<{
    catalog: PluginCatalogItem;
    installed?: InstalledPlugin;
  } | null>(null);

  const currentWebsite = websites.find((w) => w.id === selectedWebsiteId);

  const { data, isLoading } = useQuery({
    queryKey: ["website-plugins", selectedWebsiteId],
    queryFn: () => getWebsitePlugins(selectedWebsiteId),
    enabled: Boolean(selectedWebsiteId),
  });

  const catalog = data?.catalog?.length ? data.catalog : DEFAULT_CATALOG;
  const installedPlugins = data?.plugins || [];

  const toggleMutation = useMutation({
    mutationFn: ({ slug, isEnabled }: { slug: string; isEnabled: boolean }) =>
      toggleWebsitePlugin(selectedWebsiteId, slug, isEnabled),
    onSuccess: (_, variables) => {
      toast.success(variables.isEnabled ? "App activated on your website!" : "App disabled.");
      queryClient.invalidateQueries({
        queryKey: ["website-plugins", selectedWebsiteId],
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update plugin status");
    },
  });

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
      {/* Top Banner */}
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
              <Puzzle className="h-3.5 w-3.5" /> 1-Click Business Apps
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Plugins & Growth Apps
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Easy plug-and-play tools to connect your custom domain and let customers contact you
              on WhatsApp. Zero coding needed.
            </p>
          </div>

          {/* Website Switcher */}
          {websites.length > 1 && (
            <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-1.5 px-3">
              <span className="text-xs font-bold text-[#64748b]">Website:</span>
              <select
                value={selectedWebsiteId}
                onChange={(e) => setSelectedWebsiteId(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-[#0f172a] outline-none cursor-pointer"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Empty Websites Warning if applicable */}
      {websites.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center shadow-xs">
          <Globe className="h-10 w-10 text-[#cbd5e1]" />
          <h3 className="mt-3 font-display text-base font-extrabold text-[#0f172a]">
            No Websites Found
          </h3>
          <p className="mt-1 text-xs text-[#64748b]">
            Create or publish your first website to activate plugins and connect apps.
          </p>
          <Link
            to="/tenant/websites"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
          >
            Create Website
          </Link>
        </div>
      ) : isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {catalog.map((plugin) => {
            const installed = installedPlugins.find((p) => p.pluginSlug === plugin.slug);
            const isEnabled = installed?.isEnabled ?? false;

            return (
              <div
                key={plugin.slug}
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-xs transition-all hover:shadow-md ${
                  isEnabled ? "border-[#a7f3d0] ring-1 ring-[#a7f3d0]/60" : "border-[#e2e8f0]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl border shadow-2xs ${
                          plugin.slug === "whatsapp-chat"
                            ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]"
                            : "bg-[#f0fdfa] border-[#99f6e4] text-[#0d9488]"
                        }`}
                      >
                        {plugin.slug === "whatsapp-chat" ? (
                          <MessageCircle className="h-6 w-6" />
                        ) : (
                          <Globe className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-extrabold text-[#0f172a]">
                            {plugin.name}
                          </h3>
                          {plugin.badge && (
                            <span className="rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 text-[9px] font-extrabold text-[#065f46]">
                              {plugin.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#64748b]">{plugin.tagline}</p>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle or Status */}
                    {!plugin.isCore ? (
                      <button
                        type="button"
                        onClick={() =>
                          toggleMutation.mutate({
                            slug: plugin.slug,
                            isEnabled: !isEnabled,
                          })
                        }
                        disabled={toggleMutation.isPending}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isEnabled ? "bg-[#059669]" : "bg-[#cbd5e1]"
                        }`}
                      >
                        <span className="sr-only">Toggle {plugin.name}</span>
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Included
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-[#64748b]">
                    {plugin.description}
                  </p>

                  {/* Highlights & Config Info */}
                  {plugin.slug === "whatsapp-chat" && (
                    <div className="mt-4 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-3 text-xs">
                      {installed?.config?.phoneNumber ? (
                        <div className="flex items-center gap-2 text-[#0f172a] font-semibold">
                          <Phone className="h-3.5 w-3.5 text-[#059669]" />
                          <span>Connected Number:</span>
                          <span className="font-mono text-[#059669] font-bold">
                            {installed.config.phoneNumber}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[#ea580c] font-semibold">
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span>No phone number set yet. Click Configure to add.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {plugin.slug === "custom-domains" && (
                    <div className="mt-4 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-3 text-xs text-[#64748b]">
                      Connect apex or subdomains like{" "}
                      <code className="text-[#059669] font-bold">www.yourshop.in</code> with
                      automated SSL lock.
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-6 flex items-center justify-between border-t border-[#f1f5f9] pt-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748b]">
                    {isEnabled ? (
                      <span className="flex items-center gap-1 text-[#059669]">
                        <span className="h-2 w-2 rounded-full bg-[#059669]" /> Active on website
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#94a3b8]">
                        <span className="h-2 w-2 rounded-full bg-[#cbd5e1]" /> Inactive
                      </span>
                    )}
                  </div>

                  {plugin.deepLink ? (
                    <Link
                      to={plugin.deepLink}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-4 py-2 text-xs font-extrabold text-[#0f172a] transition hover:bg-[#f1f5f9] shadow-2xs cursor-pointer"
                    >
                      <span>Manage Domains</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#059669]" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveConfigPlugin({
                          catalog: plugin,
                          installed,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#047857] shadow-xs cursor-pointer"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      <span>Configure App</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Configuration Modal */}
      {activeConfigPlugin && (
        <ConfigPluginModal
          websiteId={selectedWebsiteId}
          plugin={activeConfigPlugin.catalog}
          installed={activeConfigPlugin.installed}
          onClose={() => setActiveConfigPlugin(null)}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["website-plugins", selectedWebsiteId],
            });
            setActiveConfigPlugin(null);
          }}
        />
      )}
    </div>
  );
}

function ConfigPluginModal({
  websiteId,
  plugin,
  installed,
  onClose,
  onSaved,
}: {
  websiteId: string;
  plugin: PluginCatalogItem;
  installed?: InstalledPlugin;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [config, setConfig] = useState<Record<string, any>>({
    ...plugin.defaultConfig,
    ...(installed?.config || {}),
  });
  const [isEnabled, setIsEnabled] = useState<boolean>(installed?.isEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveWebsitePluginConfig(websiteId, plugin.slug, config, isEnabled);
      toast.success(`${plugin.name} settings saved successfully!`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold text-[#0f172a]">
                Configure {plugin.name}
              </h2>
              <p className="text-xs text-[#64748b]">Customize your floating WhatsApp chat button</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Active Switch */}
          <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <div>
              <p className="text-xs font-extrabold text-[#0f172a]">Activate Widget on Website</p>
              <p className="text-[11px] text-[#64748b]">
                Show floating WhatsApp button to all website visitors
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? "bg-[#059669]" : "bg-[#cbd5e1]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Form Fields */}
          {plugin.fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-bold text-[#0f172a] flex items-center justify-between">
                <span>
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </span>
              </label>

              {field.type === "textarea" ? (
                <textarea
                  rows={field.rows || 3}
                  value={config[field.name] || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669]"
                />
              ) : field.type === "select" ? (
                <select
                  value={config[field.name] || field.options?.[0]?.value || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  value={config[field.name] || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669]"
                />
              )}

              {field.helpText && <p className="text-[11px] text-[#64748b]">{field.helpText}</p>}
            </div>
          ))}

          {/* Live Preview Card */}
          <div className="rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-xs">
            <p className="font-extrabold text-[#065f46] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#059669]" /> Live Preview of Button:
            </p>
            <div className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full font-bold text-xs shadow-md">
              <MessageCircle className="h-4 w-4" />
              <span>{config.callToAction || "Chat with us"}</span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f1f5f9]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-6 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
