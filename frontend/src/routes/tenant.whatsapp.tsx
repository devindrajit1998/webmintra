import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTenantWhatsAppStatus,
  connectTenantWhatsApp,
  reconnectTenantWhatsApp,
  logoutTenantWhatsApp,
  getTenantWhatsAppSettings,
  updateTenantWhatsAppSettings,
  testTenantWhatsAppMessage,
  getTenantWhatsAppCampaigns,
  createTenantWhatsAppCampaign,
  pauseTenantWhatsAppCampaign,
  resumeTenantWhatsAppCampaign,
  cancelTenantWhatsAppCampaign,
  getTenantWhatsAppMessages,
} from "@/lib/auth-api";
import { toast } from "sonner";
import {
  Smartphone,
  QrCode,
  RefreshCw,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Sparkles,
  Play,
  Pause,
  XCircle,
  Clock,
  CheckCheck,
  Megaphone,
  Sliders,
  History,
} from "lucide-react";

export const Route = createFileRoute("/tenant/whatsapp")({
  component: TenantWhatsAppPage,
  head: () => ({ meta: [{ title: "WhatsApp & Marketing | WebMintra" }] }),
});

function TenantWhatsAppPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"connection" | "automation" | "campaigns" | "logs">(
    "connection",
  );

  // WhatsApp Status polling
  const {
    data: statusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
    isFetching,
  } = useQuery({
    queryKey: ["tenantWhatsAppStatus"],
    queryFn: () => getTenantWhatsAppStatus(),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QR_READY" || status === "CONNECTING" ? 3000 : 15000;
    },
  });

  const isConnected = statusData?.isConnected || statusData?.status === "CONNECTED";
  const isWaitingForQr = statusData?.status === "QR_READY" || (statusData?.hasQr && !isConnected);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b192c]">
              WhatsApp Marketing & Follow-up
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${
                isConnected
                  ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
                  : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#10b981]" : "bg-[#f59e0b]"}`}
              />
              {isConnected
                ? "Connected"
                : statusData?.status === "QR_READY"
                  ? "Scan QR Code"
                  : "Not Linked"}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#64748b]">
            Link your own WhatsApp to send instant auto-replies, follow up with leads, and broadcast
            promotional campaigns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetchStatus()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("connection")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
            activeTab === "connection"
              ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
              : "text-[#64748b] hover:text-[#0b192c]"
          }`}
        >
          <Smartphone className="h-4 w-4" /> Device Link & Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("automation")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
            activeTab === "automation"
              ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
              : "text-[#64748b] hover:text-[#0b192c]"
          }`}
        >
          <Sliders className="h-4 w-4" /> Auto-Followup Rules
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
            activeTab === "campaigns"
              ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
              : "text-[#64748b] hover:text-[#0b192c]"
          }`}
        >
          <Megaphone className="h-4 w-4" /> Broadcast & Offers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
            activeTab === "logs"
              ? "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs"
              : "text-[#64748b] hover:text-[#0b192c]"
          }`}
        >
          <History className="h-4 w-4" /> Message Logs
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "connection" && (
        <ConnectionTab
          statusData={statusData}
          isLoading={isStatusLoading}
          isConnected={isConnected}
          isWaitingForQr={isWaitingForQr}
        />
      )}

      {activeTab === "automation" && <AutomationTab isConnected={isConnected} />}

      {activeTab === "campaigns" && <CampaignsTab isConnected={isConnected} />}

      {activeTab === "logs" && <LogsTab />}
    </div>
  );
}

// ── CONNECTION TAB ─────────────────────────────────────────────
function ConnectionTab({ statusData, isLoading, isConnected, isWaitingForQr }: any) {
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");

  const connectMutation = useMutation({
    mutationFn: connectTenantWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppStatus"] });
      toast.success("Generating your unique QR code...");
    },
    onError: (err: any) => toast.error(err.message || "Failed to start connection."),
  });

  const reconnectMutation = useMutation({
    mutationFn: reconnectTenantWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppStatus"] });
      toast.success("Generated a fresh pairing QR code.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to reconnect."),
  });

  const logoutMutation = useMutation({
    mutationFn: logoutTenantWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppStatus"] });
      toast.success("WhatsApp disconnected and session removed.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to disconnect."),
  });

  const testMutation = useMutation({
    mutationFn: testTenantWhatsAppMessage,
    onSuccess: () => {
      toast.success(`Test alert sent successfully to ${testPhone}!`);
      setTestPhone("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to send test message."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-[#0b192c]">WhatsApp Device Linking</h2>
        <p className="mt-0.5 text-xs text-[#64748b]">
          Link your WhatsApp by scanning the QR code below. Messages sent will appear from your
          number.
        </p>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#64748b] gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-[#059669]" />
              <p className="text-xs font-semibold">Checking connection state...</p>
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-[#047857]">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[#059669]" />
                <div>
                  <h4 className="text-sm font-extrabold">Device Connected & Active</h4>
                  <p className="text-xs text-[#065f46] mt-0.5">
                    Linked to phone:{" "}
                    <strong className="font-mono">+{statusData?.connectedPhone}</strong>
                    {statusData?.connectedPushName ? ` (${statusData.connectedPushName})` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#64748b]">
                  All form leads and broadcasts will be sent from this number.
                </span>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {logoutMutation.isPending ? "Unlinking..." : "Unlink WhatsApp"}
                </button>
              </div>
            </div>
          ) : isWaitingForQr && statusData?.qrDataUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-[#fed7aa] bg-[#fff7ed]/50 p-5">
              <div className="shrink-0 rounded-2xl border-2 border-[#ea580c] bg-white p-2.5 shadow-md">
                <img
                  src={statusData.qrDataUrl}
                  alt="WhatsApp Pairing QR Code"
                  className="h-44 w-44 rounded-lg object-contain"
                />
              </div>
              <div className="space-y-2 text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] border border-[#fed7aa] px-2.5 py-0.5 text-[11px] font-extrabold text-[#c2410c]">
                  <QrCode className="h-3.5 w-3.5" /> Link Device
                </div>
                <h4 className="text-sm font-bold text-[#0f172a]">3 Simple Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-[#64748b] leading-relaxed">
                  <li>
                    Open <strong>WhatsApp</strong> on your phone
                  </li>
                  <li>
                    Go to <strong>Settings</strong> ➔ <strong>Linked Devices</strong>
                  </li>
                  <li>
                    Tap <strong>Link a Device</strong> and point your camera at this QR code
                  </li>
                </ol>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => reconnectMutation.mutate()}
                    disabled={reconnectMutation.isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ea580c] hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh QR Code
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc]">
              <Smartphone className="mx-auto h-8 w-8 text-[#94a3b8]" />
              <div>
                <h4 className="text-sm font-extrabold text-[#0f172a]">No Device Linked</h4>
                <p className="text-xs text-[#64748b] max-w-sm mx-auto mt-0.5">
                  Click below to generate a QR code and connect your business WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                {connectMutation.isPending ? "Starting..." : "Generate QR Code"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test Message Sandbox */}
      <div className="lg:col-span-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#0b192c]">Test Live Connection</h3>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Send a sample WhatsApp message to any mobile number to verify delivery.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (testPhone.trim()) testMutation.mutate(testPhone.trim());
            }}
            className="mt-5 space-y-3"
          >
            <div>
              <label className="block text-[11px] font-bold text-[#0f172a] mb-1">
                Recipient Mobile Number
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210 or +919876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={!isConnected || testMutation.isPending}
                className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669] disabled:bg-[#f8fafc] disabled:opacity-60 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={!isConnected || !testPhone.trim() || testMutation.isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {testMutation.isPending ? "Sending..." : "Send Test WhatsApp Message"}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-xl bg-[#f8fafc] p-3 text-[11px] text-[#64748b] border border-[#f1f5f9]">
          🔒 Messages are encrypted and dispatched directly through your own connected phone
          session.
        </div>
      </div>
    </div>
  );
}

// ── AUTOMATION TAB ─────────────────────────────────────────────
function AutomationTab({ isConnected }: { isConnected: boolean }) {
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [leadAlertEnabled, setLeadAlertEnabled] = useState(true);
  const [leadAlertPhone, setLeadAlertPhone] = useState("");

  const { data: settingsData } = useQuery({
    queryKey: ["tenantWhatsAppSettings"],
    queryFn: async () => {
      const res = await getTenantWhatsAppSettings();
      if (res?.settings) {
        setTemplate(res.settings.autoReplyTemplate || "");
        setAutoReplyEnabled(res.settings.autoReplyEnabled !== false);
        setLeadAlertEnabled(res.settings.leadAlertEnabled !== false);
        setLeadAlertPhone(res.settings.leadAlertPhone || "");
      }
      return res;
    },
  });

  const saveMutation = useMutation({
    mutationFn: updateTenantWhatsAppSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppSettings"] });
      toast.success("Automation rules saved successfully.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save settings."),
  });

  const insertTag = (tag: string) => {
    setTemplate((prev) => `${prev} {{${tag}}}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Settings Form */}
      <div className="lg:col-span-7 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-extrabold text-[#0b192c]">Lead Auto-Reply Automation</h2>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Automatically send an instant WhatsApp greeting as soon as a visitor fills out any
            website form.
          </p>
        </div>

        {/* Auto Reply Toggle */}
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
          <div>
            <h4 className="text-xs font-bold text-[#0f172a]">Enable Customer Auto-Reply</h4>
            <p className="text-[11px] text-[#64748b]">
              Sends instant confirmation to the customer's phone.
            </p>
          </div>
          <input
            type="checkbox"
            checked={autoReplyEnabled}
            onChange={(e) => setAutoReplyEnabled(e.target.checked)}
            className="h-4 w-4 rounded text-[#059669] focus:ring-[#059669]"
          />
        </div>

        {/* Template Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#0f172a]">
            Auto-Reply Message Template
          </label>
          <textarea
            rows={4}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Hi {{name}}, thank you for contacting {{businessName}}! We will reach out shortly."
            className="w-full rounded-xl border border-[#cbd5e1] p-3 text-xs text-[#0f172a] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
          />

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10.5px] font-semibold text-[#64748b]">Insert tag:</span>
            {["name", "businessName", "phone", "siteName"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold text-[#c2410c] hover:bg-[#ffedd5] transition"
              >
                + {`{{${tag}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Lead Alert Toggle */}
        <div className="border-t border-[#f1f5f9] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#0f172a]">New Lead Notification Alert</h4>
              <p className="text-[11px] text-[#64748b]">
                Receive a WhatsApp alert on your phone whenever someone submits a lead.
              </p>
            </div>
            <input
              type="checkbox"
              checked={leadAlertEnabled}
              onChange={(e) => setLeadAlertEnabled(e.target.checked)}
              className="h-4 w-4 rounded text-[#059669] focus:ring-[#059669]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#0f172a] mb-1">
              Alert Phone Number (optional, defaults to your business phone)
            </label>
            <input
              type="text"
              placeholder="e.g. +919876543210"
              value={leadAlertPhone}
              onChange={(e) => setLeadAlertPhone(e.target.value)}
              className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            saveMutation.mutate({
              autoReplyEnabled,
              autoReplyTemplate: template,
              leadAlertEnabled,
              leadAlertPhone,
            })
          }
          disabled={saveMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
        >
          {saveMutation.isPending ? "Saving..." : "Save Automation Settings"}
        </button>
      </div>

      {/* Simulated Preview Box */}
      <div className="lg:col-span-5 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3 mb-4">
            <Sparkles className="h-4 w-4 text-[#ea580c]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0b192c]">
              Simulated Live Preview
            </h3>
          </div>

          {/* WhatsApp Chat Bubble */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#64748b]">
              <span className="font-bold text-[#059669]">Incoming Auto-Reply</span>
              <span>Just now</span>
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-[#ecfdf5] p-3 text-xs text-[#0f172a] leading-relaxed border border-[#a7f3d0]">
              {template ? (
                template
                  .replace(/\{\{\s*name\s*\}\}/g, "Rahul Sharma")
                  .replace(/\{\{\s*businessName\s*\}\}/g, "SmileCare Dental")
                  .replace(/\{\{\s*phone\s*\}\}/g, "+91 98765 43210")
                  .replace(/\{\{\s*siteName\s*\}\}/g, "SmileCare Dental")
              ) : (
                <span className="text-[#94a3b8] italic">
                  Compose your template to see a preview.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-3 text-[11px] text-[#64748b] border border-[#e2e8f0]">
          💡 Variables like <code className="font-bold text-[#0f172a]">{`{{name}}`}</code> are
          automatically replaced with the customer's actual submission data.
        </div>
      </div>
    </div>
  );
}

// ── CAMPAIGNS TAB ──────────────────────────────────────────────
function CampaignsTab({ isConnected }: { isConnected: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["tenantWhatsAppCampaigns"],
    queryFn: () => getTenantWhatsAppCampaigns(),
  });

  const createMutation = useMutation({
    mutationFn: createTenantWhatsAppCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppCampaigns"] });
      toast.success("Campaign created! Delivery queue started.");
      setName("");
      setMessage("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to start campaign."),
  });

  const pauseMutation = useMutation({
    mutationFn: pauseTenantWhatsAppCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppCampaigns"] });
      toast.success("Campaign paused.");
    },
  });

  const resumeMutation = useMutation({
    mutationFn: resumeTenantWhatsAppCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppCampaigns"] });
      toast.success("Campaign resumed.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTenantWhatsAppCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantWhatsAppCampaigns"] });
      toast.success("Campaign cancelled.");
    },
  });

  const eligibleCount = campaignData?.eligibleLeads ?? 0;
  const campaigns = campaignData?.campaigns || [];

  return (
    <div className="space-y-6">
      {/* Create Campaign Card */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#0b192c]">Broadcast Promotional Offer</h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Send festival offers, discounts, or announcements to prospective leads who submitted
              forms on your site.
            </p>
          </div>
          <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-3.5 py-1.5 text-xs font-bold text-[#c2410c]">
            🎯 {eligibleCount} Eligible WhatsApp Contacts
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && message.trim()) {
              createMutation.mutate({ name: name.trim(), message: message.trim() });
            }
          }}
          className="mt-5 space-y-4 max-w-2xl"
        >
          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1">Campaign Title</label>
            <input
              type="text"
              placeholder="e.g. Diwali 20% Discount Offer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f172a] mb-1">
              Broadcast Message Content
            </label>
            <textarea
              rows={4}
              placeholder="🎉 Special weekend offer! Get 20% off all services this week. Reply 'YES' to claim."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-[#cbd5e1] p-3 text-xs text-[#0f172a] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] shadow-2xs"
            />
            <p className="mt-1 text-[10.5px] text-[#64748b]">
              Messages are sent with a safe 4–7 second delay between recipients to protect your
              number.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              !isConnected ||
              eligibleCount === 0 ||
              !name.trim() ||
              !message.trim() ||
              createMutation.isPending
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            {createMutation.isPending
              ? "Queuing Broadcast..."
              : `Dispatch Campaign to ${eligibleCount} Contacts`}
          </button>
        </form>
      </div>

      {/* Campaign List */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <h3 className="text-sm font-extrabold text-[#0b192c] mb-4">Past Broadcast Campaigns</h3>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#64748b]">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748b] border border-dashed border-[#cbd5e1] rounded-xl">
            No broadcast campaigns created yet.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c: any) => (
              <div
                key={c._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-extrabold text-[#0f172a]">{c.name}</h4>
                    <span className="rounded-full bg-white border border-[#e2e8f0] px-2 py-0.5 text-[10px] font-bold text-[#64748b] uppercase">
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#64748b] line-clamp-1">{c.message}</p>
                  <p className="mt-1 text-[10.5px] text-[#94a3b8]">
                    Sent: {c.sentCount} / {c.totalRecipients} · Failed: {c.failedCount}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {c.status === "sending" && (
                    <button
                      type="button"
                      onClick={() => pauseMutation.mutate(c._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                    >
                      <Pause className="h-3 w-3" /> Pause
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button
                      type="button"
                      onClick={() => resumeMutation.mutate(c._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-1 text-xs font-bold text-[#047857] hover:bg-[#d1fae5]"
                    >
                      <Play className="h-3 w-3" /> Resume
                    </button>
                  )}
                  {["sending", "paused"].includes(c.status) && (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(c._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <XCircle className="h-3 w-3" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LOGS TAB ───────────────────────────────────────────────────
function LogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["tenantWhatsAppMessages"],
    queryFn: () => getTenantWhatsAppMessages({ limit: 30 }),
    refetchInterval: 5000,
  });

  const messages = data?.messages || [];

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <h3 className="text-sm font-extrabold text-[#0b192c] mb-4">
        Live Message Queue & Delivery History
      </h3>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-[#64748b]">Loading logs...</div>
      ) : messages.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#64748b] border border-dashed border-[#cbd5e1] rounded-xl">
          No messages in queue or history yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#f1f5f9] text-[#64748b] font-bold">
                <th className="pb-3">Recipient</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Message</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f8fafc]">
              {messages.map((m: any) => (
                <tr key={m._id} className="hover:bg-[#f8fafc]/60">
                  <td className="py-3 font-mono font-bold text-[#0f172a]">+{m.recipient}</td>
                  <td className="py-3 capitalize text-[#64748b]">
                    {m.messageType?.replace("_", " ")}
                  </td>
                  <td className="py-3 text-[#0f172a] max-w-xs truncate">{m.message}</td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        m.status === "sent"
                          ? "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]"
                          : m.status === "processing" || m.status === "queued"
                            ? "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 text-[#94a3b8] text-[11px]">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
