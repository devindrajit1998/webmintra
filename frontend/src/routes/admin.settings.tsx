import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getSettings, updateSettings, uploadAdminFile } from "@/lib/admin-api";
import { Loader2, Settings as SettingsIcon, Save, AlertTriangle, Image as ImageIcon, SearchCheck } from "lucide-react";
import { AdminSeoPage } from "@/components/AdminSeoPage";

import { toast } from "sonner";
export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [activeView, setActiveView] = useState<"seo" | "platform">("seo");

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
      toast.success("Settings updated successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update settings.");
    }
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.settings) return;

    // Find what changed
    const updates = Object.keys(formData).map(key => {
      const orig = data.settings.find((s: any) => s.key === key);
      if (orig && orig.value !== formData[key]) {
        return { key, value: formData[key] };
      }
      return null;
    }).filter(Boolean);

    if (updates.length > 0) {
      updateMutation.mutate(updates);
    }
  }

  const handleImageUpload = async (key: string, file: File) => {
    try {
      setUploading(prev => ({ ...prev, [key]: true }));
      const res = await uploadAdminFile(file);
      if (res?.url) {
        setFormData(prev => ({ ...prev, [key]: res.url }));
        toast.success("Image uploaded successfully.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) return <div className="p-10 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-3 py-8"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /><p className="text-sm text-slate-500">Loading settings...</p></div></div>;

  const viewTabs = (
    <div className="mb-6 inline-flex rounded border border-slate-800 bg-slate-950 p-1">
      <button type="button" onClick={() => setActiveView("seo")} className={`inline-flex h-9 items-center gap-2 rounded px-4 text-xs font-semibold ${activeView === "seo" ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}><SearchCheck className="h-4 w-4" /> Search Optimization</button>
      <button type="button" onClick={() => setActiveView("platform")} className={`inline-flex h-9 items-center gap-2 rounded px-4 text-xs font-semibold ${activeView === "platform" ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}><SettingsIcon className="h-4 w-4" /> Platform Settings</button>
    </div>
  );

  if (activeView === "seo") return <div>{viewTabs}<AdminSeoPage /></div>;

  // Group settings by category
  const groups: Record<string, any[]> = {};
  data?.settings?.forEach((setting: any) => {
    const group = setting.group || 'general';
    if (group === 'seo') return;
    if (!groups[group]) groups[group] = [];
    groups[group].push(setting);
  });

  return (
    <div className="w-full">
      {viewTabs}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="mt-1 text-xs text-slate-500">Configure global platform behavior and defaults.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {Object.entries(groups).map(([groupName, settings]) => (
          <div key={groupName} className="rounded-xl border border-slate-800 bg-[#0b1826] overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/50 p-4 flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-200 capitalize">{groupName} Settings</h2>
            </div>
            <div className="p-6 grid gap-6">
              {settings.map((setting) => (
                <div key={setting.key} className="flex flex-col gap-2 border-b border-slate-800/50 pb-6 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <label htmlFor={setting.key} className="font-medium text-slate-200 block">
                        {setting.key.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                      </label>
                      <p className="text-xs text-slate-500 mt-1">{setting.description || 'Configuration value for the platform.'}</p>
                    </div>
                    <div className="w-64 shrink-0">
                      {setting.type === 'image' ? (
                        <div className="flex flex-col gap-3">
                          {formData[setting.key] ? (
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                              <img src={formData[setting.key]} alt="" className="h-full w-full object-contain p-1" />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50">
                              <ImageIcon className="h-6 w-6 text-slate-600" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleImageUpload(setting.key, e.target.files[0]);
                            }}
                            className="block w-full text-xs text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-900/30 file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-400 hover:file:bg-cyan-900/50 cursor-pointer"
                          />
                          {uploading[setting.key] && <span className="text-xs text-cyan-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</span>}
                          <input
                            id={setting.key}
                            type="text"
                            placeholder="Or enter image URL"
                            value={formData[setting.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500"
                          />
                        </div>
                      ) : setting.type === 'boolean' ? (
                        <select
                          id={setting.key}
                          value={formData[setting.key] || "false"}
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500"
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : setting.type === 'number' ? (
                        <input
                          id={setting.key}
                          type="number"
                          value={formData[setting.key] || ""}
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500"
                        />
                      ) : setting.key === 'site.currency' || setting.key.includes('currency') ? (
                        <select
                          id={setting.key}
                          value={formData[setting.key] || "INR"}
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500"
                        >
                          <option value="INR">INR (Indian Rupee)</option>
                          <option value="USD">USD (US Dollar)</option>
                          <option value="EUR">EUR (Euro)</option>
                          <option value="GBP">GBP (British Pound)</option>
                        </select>
                      ) : setting.key === 'site.language' || setting.key.includes('language') ? (
                        <select
                          id={setting.key}
                          value={formData[setting.key] || "en"}
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500"
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
                          onChange={(e) => setFormData({ ...formData, [setting.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-cyan-500"
                        />
                      )}
                    </div>
                  </div>
                  {setting.key === 'platform.maintenanceMode' && formData[setting.key] === 'true' && (
                    <div className="flex items-center gap-2 mt-2 rounded bg-amber-500/10 p-3 text-xs text-amber-400">
                      <AlertTriangle className="h-4 w-4" /> Maintenance mode will block all non-admin access!
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end sticky bottom-6 z-10 p-4 bg-[#091521]/90 backdrop-blur rounded-xl border border-slate-800 shadow-xl">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving changes..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
