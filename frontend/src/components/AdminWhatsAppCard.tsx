import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminWhatsAppStatus,
  reconnectAdminWhatsApp,
  logoutAdminWhatsApp,
  testAdminWhatsAppMessage,
} from "@/lib/admin-api";
import { toast } from "sonner";
import {
  QrCode,
  Smartphone,
  RefreshCw,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function AdminWhatsAppCard() {
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["adminWhatsAppStatus"],
    queryFn: () => getAdminWhatsAppStatus(),
    refetchInterval: (query) => {
      // Poll every 3 seconds if waiting for QR scan, otherwise poll every 15 seconds
      const status = query.state.data?.status;
      return status === "waiting_for_qr" || status === "connecting" ? 3000 : 15000;
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: reconnectAdminWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWhatsAppStatus"] });
      toast.success("Re-initialization triggered. Generating QR code...");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to trigger reconnect.");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutAdminWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWhatsAppStatus"] });
      toast.success("WhatsApp session cleared.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log out.");
    },
  });

  const testMessageMutation = useMutation({
    mutationFn: (phone: string) => testAdminWhatsAppMessage(phone),
    onSuccess: () => {
      toast.success(`Test message sent successfully to ${testPhone}!`);
      setTestPhone("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send test message.");
    },
  });

  const isConnected = data?.isAuthenticated || data?.status === "connected";
  const isWaitingForQr = data?.status === "waiting_for_qr" || (data?.hasQr && !isConnected);

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] shadow-2xs">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#0b192c]">
                WhatsApp Lead Notification Engine
              </h2>
              <span className="rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 text-[10px] font-extrabold text-[#047857]">
                Free / Zero Cost
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Self-hosted Baileys client. Link once using QR code to send instant WhatsApp alerts
              when leads submit forms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Status / QR Area */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#64748b] gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-[#059669]" />
              <p className="text-xs font-semibold">Checking WhatsApp client status...</p>
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-[#047857]">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-[#059669]" />
                <div>
                  <h4 className="text-sm font-extrabold">Device Connected & Active</h4>
                  <p className="text-xs text-[#065f46] mt-0.5">
                    Your Node server is paired with WhatsApp. Lead form submissions will be
                    automatically forwarded to tenants.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#64748b]">
                  Session stored locally in{" "}
                  <code className="text-[#0f172a] font-mono bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1]">
                    .whatsapp-auth
                  </code>
                </span>
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {logoutMutation.isPending ? "Logging out..." : "Unlink & Reset Device"}
                </button>
              </div>
            </div>
          ) : isWaitingForQr && data?.qrDataUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0 rounded-2xl border-2 border-[#059669] bg-white p-2.5 shadow-md">
                <img
                  src={data.qrDataUrl}
                  alt="WhatsApp Pairing QR Code"
                  className="h-44 w-44 rounded-lg object-contain"
                />
              </div>
              <div className="space-y-2.5 text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] border border-[#fed7aa] px-2.5 py-0.5 text-[11px] font-extrabold text-[#c2410c]">
                  <QrCode className="h-3.5 w-3.5" /> Scan with WhatsApp
                </div>
                <h4 className="text-sm font-bold text-[#0f172a]">How to connect:</h4>
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
                <p className="text-[11px] text-[#94a3b8]">
                  Auto-refreshes automatically until paired.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
              <div>
                <h4 className="text-sm font-extrabold text-[#0f172a]">
                  WhatsApp Client Disconnected
                </h4>
                <p className="text-xs text-[#64748b] max-w-sm mx-auto mt-0.5">
                  Click the button below to start the Baileys client and generate a new QR code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => reconnectMutation.mutate()}
                disabled={reconnectMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                {reconnectMutation.isPending ? "Starting Client..." : "Generate QR Code"}
              </button>
            </div>
          )}
        </div>

        {/* Test Message Box */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-white p-5">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748b]">
              Send Test Alert
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Verify your connected number by sending a test alert to any WhatsApp mobile number.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (testPhone.trim()) testMessageMutation.mutate(testPhone.trim());
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#0f172a] mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210 or +919876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  disabled={!isConnected || testMessageMutation.isPending}
                  className="h-9 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs text-[#0f172a] placeholder:text-[#94a3b8] outline-none transition focus:border-[#059669] focus:ring-1 focus:ring-[#059669] disabled:bg-[#f8fafc] disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={!isConnected || !testPhone.trim() || testMessageMutation.isPending}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {testMessageMutation.isPending ? "Sending Test..." : "Send Test WhatsApp Alert"}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-lg bg-[#f8fafc] p-2.5 text-[11px] text-[#64748b] flex items-center gap-2 border border-[#f1f5f9]">
            <ShieldCheck className="h-4 w-4 text-[#059669] shrink-0" />
            <span>
              Encrypted directly from your server over official WhatsApp WebSocket protocol.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
