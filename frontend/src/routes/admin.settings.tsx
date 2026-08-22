import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getSettings, updateSettings, uploadAdminFile } from "@/lib/admin-api";
import { RichCKEditor } from "@/components/RichCKEditor";
import {
  Loader2,
  Settings as SettingsIcon,
  Save,
  AlertTriangle,
  Image as ImageIcon,
  SearchCheck,
  FilePenLine,
} from "lucide-react";
import { AdminSeoPage } from "@/components/AdminSeoPage";

import { toast } from "sonner";
export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [activeView, setActiveView] = useState<"seo" | "platform" | "content">("seo");

  const { data, isLoading } = useQuery({
    queryKey: ["adminSettings"],
    queryFn: () => getSettings(),
  });

  useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {};
      data.settings.forEach((s: any) => {
        initial[s.key] = s.value;
      });
      setFormData(initial);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (updates: any[]) => updateSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      queryClient.invalidateQueries({ queryKey: ["publicSettings"] });
      toast.success("Settings updated successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update settings.");
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.settings) return;

    // Find what changed
    const updates = Object.keys(formData)
      .map((key) => {
        const orig = data.settings.find((s: any) => s.key === key);
        if (orig && orig.value !== formData[key]) {
          return { key, value: formData[key] };
        }
        return null;
      })
      .filter(Boolean);

    if (updates.length > 0) {
      updateMutation.mutate(updates);
    }
  }

  const handleImageUpload = async (key: string, file: File) => {
    try {
      setUploading((prev) => ({ ...prev, [key]: true }));
      const res = await uploadAdminFile(file);
      if (res?.url) {
        setFormData((prev) => ({ ...prev, [key]: res.url }));
        toast.success("Image uploaded successfully.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading)
    return (
      <div className="p-10 text-center text-[#64748b]">
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
          <p className="text-xs font-medium text-[#64748b]">Loading settings...</p>
        </div>
      </div>
    );

  const viewTabs = (
    <div className="mb-6 inline-flex rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-2xs">
      <button
        type="button"
        onClick={() => setActiveView("seo")}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
          activeView === "seo"
            ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
            : "text-[#64748b] hover:text-[#0b192c]"
        }`}
      >
        <SearchCheck className="h-4 w-4" /> Search Optimization
      </button>
      <button
        type="button"
        onClick={() => setActiveView("platform")}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
          activeView === "platform"
            ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
            : "text-[#64748b] hover:text-[#0b192c]"
        }`}
      >
        <SettingsIcon className="h-4 w-4" /> Platform Settings
      </button>
      <button
        type="button"
        onClick={() => setActiveView("content")}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
          activeView === "content"
            ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
            : "text-[#64748b] hover:text-[#0b192c]"
        }`}
      >
        <FilePenLine className="h-4 w-4" /> Public Content
      </button>
    </div>
  );

  if (activeView === "seo")
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        {viewTabs}
        <AdminSeoPage />
      </div>
    );

  const contentSettings =
    data?.settings?.filter((setting: any) => setting.group === "content") || [];

  if (activeView === "content")
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        {viewTabs}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b192c]">
            Public Content
          </h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Edit the legal content published on public policy pages. Changes become visible after
            saving.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6 pb-20">
          {contentSettings.map((setting: any) => (
            <section
              key={setting.key}
              className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs"
            >
              <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-4">
                <h2 className="text-sm font-bold text-[#0b192c]">{setting.label}</h2>
                <p className="mt-1 text-xs text-[#64748b]">{setting.description}</p>
              </div>
              <div className="p-5">
                <RichCKEditor
                  value={formData[setting.key] || ""}
                  onChange={(value) =>
                    setFormData((previous) => ({ ...previous, [setting.key]: value }))
                  }
                  placeholder={`Write the ${setting.label.toLowerCase()} content...`}
                  minHeight="360px"
                />
              </div>
            </section>
          ))}

          <div className="sticky bottom-6 z-10 flex justify-end rounded-xl border border-[#e2e8f0] bg-white/95 p-4 shadow-lg backdrop-blur">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {updateMutation.isPending ? "Saving content..." : "Save Public Content"}
            </button>
          </div>
        </form>
      </div>
    );

  // Group settings by category
  const groups: Record<string, any[]> = {};
  data?.settings?.forEach((setting: any) => {
    const group = setting.group || "general";
    if (group === "seo" || group === "content") return;
    if (!groups[group]) groups[group] = [];
    groups[group].push(setting);
  });

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {viewTabs}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b192c]">
            Platform Settings
          </h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Configure global platform behavior and defaults.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-20">
        {Object.entries(groups).map(([groupName, settings]) => (
          <div
            key={groupName}
            className="rounded-xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden"
          >
            <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3.5 flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-[#ea580c]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569] capitalize">
                {groupName} Settings
              </h2>
            </div>
            <div className="p-6 grid gap-6">
              {settings.map((setting) => (
                <div
                  key={setting.key}
                  className="flex flex-col gap-2 border-b border-[#e2e8f0] pb-6 last:border-0 last:pb-0"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <label
                        htmlFor={setting.key}
                        className="text-xs font-bold text-[#0b192c] block"
                      >
                        {setting.key
                          .split(".")
                          .pop()
                          ?.replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str: string) => str.toUpperCase())}
                      </label>
                      <p className="text-xs text-[#64748b] mt-1">
                        {setting.description || "Configuration value for the platform."}
                      </p>
                    </div>
                    <div className="w-72 shrink-0">
                      {setting.type === "image" ? (
                        <div className="flex flex-col gap-3">
                          {formData[setting.key] ? (
                            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#cbd5e1] bg-[#f8fafc]">
                              <img
                                src={formData[setting.key]}
                                alt=""
                                className="h-full w-full object-contain p-1"
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc]">
                              <ImageIcon className="h-6 w-6 text-[#94a3b8]" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0])
                                handleImageUpload(setting.key, e.target.files[0]);
                            }}
                            className="block w-full text-xs text-[#64748b] file:mr-3 file:rounded-lg file:border-0 file:bg-[#fff7ed] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#c2410c] hover:file:bg-[#ffedd5] cursor-pointer"
                          />
                          {uploading[setting.key] && (
                            <span className="text-xs font-semibold text-[#ea580c] flex items-center gap-1">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                            </span>
                          )}
                          <input
                            id={setting.key}
                            type="text"
                            placeholder="Or enter image URL"
                            value={formData[setting.key] || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, [setting.key]: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                          />
                        </div>
                      ) : setting.type === "boolean" ? (
                        <select
                          id={setting.key}
                          value={formData[setting.key] || "false"}
                          onChange={(e) =>
                            setFormData({ ...formData, [setting.key]: e.target.value })
                          }
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : setting.type === "number" ? (
                        <input
                          id={setting.key}
                          type="number"
                          value={formData[setting.key] || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, [setting.key]: e.target.value })
                          }
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        />
                      ) : setting.key === "site.currency" || setting.key.includes("currency") ? (
                        <select
                          id={setting.key}
                          value={formData[setting.key] || "INR"}
                          onChange={(e) =>
                            setFormData({ ...formData, [setting.key]: e.target.value })
                          }
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        >
                          <option value="INR">INR (Indian Rupee - ₹)</option>
                          <option value="USD">USD (US Dollar - $)</option>
                          <option value="EUR">EUR (Euro - €)</option>
                          <option value="GBP">GBP (British Pound - £)</option>
                        </select>
                      ) : setting.key === "site.language" || setting.key.includes("language") ? (
                        <select
                          id={setting.key}
                          value={formData[setting.key] || "en"}
                          onChange={(e) =>
                            setFormData({ ...formData, [setting.key]: e.target.value })
                          }
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        >
                          <option value="en">English (en)</option>
                          <option value="hi">Hindi (hi)</option>
                          <option value="es">Spanish (es)</option>
                          <option value="fr">French (fr)</option>
                        </select>
                      ) : (
                        <input
                          id={setting.key}
                          type="text"
                          value={formData[setting.key] || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, [setting.key]: e.target.value })
                          }
                          className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        />
                      )}
                    </div>
                  </div>
                  {setting.key === "platform.maintenanceMode" &&
                    formData[setting.key] === "true" && (
                      <div className="flex items-center gap-2 mt-2 rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-3 text-xs font-semibold text-[#c2410c]">
                        <AlertTriangle className="h-4 w-4 shrink-0" /> Maintenance mode will block
                        all non-admin access!
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end sticky bottom-6 z-10 p-4 bg-white/95 backdrop-blur rounded-xl border border-[#e2e8f0] shadow-lg">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving changes..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
