import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getAdminMailbox,
  getAdminMailboxMessage,
  replyAdminMailboxMessage,
  updateAdminMailboxMessageStatus,
  convertAdminMailboxLead,
  deleteAdminMailboxMessage,
} from "@/lib/admin-api";
import {
  Mail,
  Inbox,
  Star,
  Send,
  Trash2,
  Archive,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Building2,
  Clock,
  Reply,
  Loader2,
  Tag,
  Paperclip,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/mailbox")({
  component: MailboxPage,
  head: () => ({ meta: [{ title: "Support Mailbox & Inbound Email | WebMintra Admin" }] }),
});

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  support: { label: "Support", color: "bg-blue-50 text-blue-700 border-blue-200" },
  sales_inquiry: {
    label: "Sales Inquiry",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  billing: { label: "Billing", color: "bg-amber-50 text-amber-700 border-amber-200" },
  feedback: { label: "Feedback", color: "bg-purple-50 text-purple-700 border-purple-200" },
  general: { label: "General", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export function MailboxPage() {
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState<"inbox" | "starred" | "archived" | "spam">("inbox");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // List Query
  const {
    data: mailboxData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["adminMailbox", { folder, category: categoryFilter, search }],
    queryFn: () =>
      getAdminMailbox({
        folder: folder === "inbox" ? undefined : folder,
        category: categoryFilter || undefined,
        search: search || undefined,
      }),
    refetchInterval: 20000,
  });

  // Selected Message Thread Query
  const { data: activeMessageData, isLoading: isLoadingMessage } = useQuery({
    queryKey: ["adminMailboxMessage", selectedMessageId],
    queryFn: () => (selectedMessageId ? getAdminMailboxMessage(selectedMessageId) : null),
    enabled: Boolean(selectedMessageId),
  });

  const activeMessage = activeMessageData?.message;

  // Mutations
  const replyMutation = useMutation({
    mutationFn: ({ id, htmlBody }: { id: string; htmlBody: string }) =>
      replyAdminMailboxMessage(id, { htmlBody }),
    onSuccess: (res) => {
      toast.success(res.message || "Reply sent successfully!");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["adminMailboxMessage", selectedMessageId] });
      queryClient.invalidateQueries({ queryKey: ["adminMailbox"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to send reply."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateAdminMailboxMessageStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMailbox"] });
      queryClient.invalidateQueries({ queryKey: ["adminMailboxMessage", selectedMessageId] });
    },
  });

  const convertLeadMutation = useMutation({
    mutationFn: (id: string) => convertAdminMailboxLead(id),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["adminMailboxMessage", selectedMessageId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to convert lead."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminMailboxMessage(id),
    onSuccess: () => {
      toast.success("Email deleted.");
      setSelectedMessageId(null);
      queryClient.invalidateQueries({ queryKey: ["adminMailbox"] });
    },
  });

  function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMessageId || !replyText.trim()) return;
    replyMutation.mutate({ id: selectedMessageId, htmlBody: replyText });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <Mail className="h-4 w-4 text-[#ea580c]" /> Inbound Customer Communication
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-1 flex items-center gap-2.5">
            <Inbox className="h-7 w-7 text-[#059669]" /> Support Mailbox &amp; Inbound Inbox
          </h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Manage incoming emails to{" "}
            <code className="font-mono text-[#0f172a] bg-[#f1f5f9] px-1.5 py-0.5 rounded">
              support@webmintra.in
            </code>
            , send instant replies, and convert client requests into CRM leads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetch();
              toast.success("Mailbox refreshed.");
            }}
            disabled={isFetching}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-bold text-[#0f172a] shadow-2xs transition hover:bg-[#f8fafc] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 text-[#059669] ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Mailbox Master-Detail Layout ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Folders & Message List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Folders & Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-2xl border border-[#e2e8f0] shadow-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFolder("inbox")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  folder === "inbox"
                    ? "bg-[#059669] text-white shadow-xs"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                Inbox
                {Boolean(mailboxData?.unreadCount) && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${folder === "inbox" ? "bg-white text-[#059669]" : "bg-[#059669] text-white"}`}
                  >
                    {mailboxData?.unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFolder("starred")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  folder === "starred"
                    ? "bg-[#059669] text-white shadow-xs"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                }`}
              >
                <Star className="h-3.5 w-3.5" />
                Starred
              </button>
              <button
                onClick={() => setFolder("archived")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  folder === "archived"
                    ? "bg-[#059669] text-white shadow-xs"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                Archived
              </button>
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-2.5 py-1 text-xs font-bold text-[#0f172a] outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="support">Support</option>
              <option value="sales_inquiry">Sales Inquiry</option>
              <option value="billing">Billing</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search sender, email, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#cbd5e1] bg-white text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/10"
            />
          </div>

          {/* Email Item Feed */}
          <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden divide-y divide-[#f1f5f9] max-h-[700px] overflow-y-auto">
            {isLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#059669] mx-auto" />
                <p className="mt-2 text-xs font-bold text-[#64748b]">Loading mailbox...</p>
              </div>
            ) : mailboxData?.messages?.length ? (
              mailboxData.messages.map((msg: any) => {
                const isSelected = selectedMessageId === msg._id;
                const isUnread = msg.status === "unread";
                const catBadge = CATEGORY_BADGES[msg.category] || CATEGORY_BADGES.general;

                return (
                  <div
                    key={msg._id}
                    onClick={() => setSelectedMessageId(msg._id)}
                    className={`p-4 transition cursor-pointer ${
                      isSelected
                        ? "bg-[#ecfdf5] border-l-4 border-l-[#059669]"
                        : isUnread
                          ? "bg-white font-bold hover:bg-[#f8fafc]"
                          : "bg-[#fafcfb] opacity-85 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            statusMutation.mutate({
                              id: msg._id,
                              data: { isStarred: !msg.isStarred },
                            });
                          }}
                          className={`p-0.5 rounded transition ${msg.isStarred ? "text-amber-500" : "text-[#cbd5e1] hover:text-[#94a3b8]"}`}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                        <p className="text-xs font-extrabold text-[#0f172a] truncate">
                          {msg.fromName || msg.fromEmail}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-[#94a3b8] shrink-0">
                        {new Date(msg.receivedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <p
                      className={`text-xs mt-1 truncate ${isUnread ? "font-extrabold text-[#0f172a]" : "text-[#334155]"}`}
                    >
                      {msg.subject}
                    </p>

                    <p className="text-[11px] text-[#64748b] truncate mt-0.5 line-clamp-1">
                      {msg.textBody ||
                        msg.htmlBody?.replace(/<[^>]*>?/gm, "") ||
                        "No content preview"}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#f1f5f9]/70">
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-extrabold ${catBadge.color}`}
                      >
                        {catBadge.label}
                      </span>
                      {msg.replies?.length > 0 && (
                        <span className="text-[10px] font-bold text-[#059669] flex items-center gap-1">
                          <Reply className="h-3 w-3" /> Replied ({msg.replies.length})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-xs text-[#64748b]">
                <Mail className="h-8 w-8 text-[#cbd5e1] mx-auto mb-2" />
                No emails found in this folder.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Thread Details & Reply Composer */}
        <div className="lg:col-span-7">
          {selectedMessageId && activeMessage ? (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs p-6 space-y-6 animate-in fade-in">
              {/* Thread Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-5">
                <div>
                  <h2 className="text-lg font-black text-[#0f172a] leading-tight">
                    {activeMessage.subject}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#64748b]">
                    <span>
                      From: <strong>{activeMessage.fromName || activeMessage.fromEmail}</strong>{" "}
                      &lt;{activeMessage.fromEmail}&gt;
                    </span>
                    <span>•</span>
                    <span>{new Date(activeMessage.receivedAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Quick Header Actions */}
                <div className="flex items-center gap-2">
                  {!activeMessage.leadId && (
                    <button
                      onClick={() => convertLeadMutation.mutate(activeMessage._id)}
                      disabled={convertLeadMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-[#059669] hover:bg-emerald-100 transition cursor-pointer"
                      title="Convert to CRM Lead"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Convert to Lead
                    </button>
                  )}
                  <button
                    onClick={() =>
                      statusMutation.mutate({
                        id: activeMessage._id,
                        data: {
                          status: activeMessage.status === "archived" ? "read" : "archived",
                        },
                      })
                    }
                    className="p-2 rounded-xl border border-[#cbd5e1] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] transition cursor-pointer"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this email permanently?")) {
                        deleteMutation.mutate(activeMessage._id);
                      }
                    }}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Linked Entity Badges */}
              {(activeMessage.tenantId || activeMessage.leadId) && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-xs">
                  {activeMessage.tenantId && (
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#059669]">
                      <Building2 className="h-3.5 w-3.5" /> Verified Tenant Workspace:{" "}
                      {activeMessage.tenantId?.business?.name || activeMessage.tenantId?.name}
                    </span>
                  )}
                  {activeMessage.leadId && (
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#ea580c]">
                      <UserCheck className="h-3.5 w-3.5" /> Linked CRM Lead:{" "}
                      {activeMessage.leadId?.name} ({activeMessage.leadId?.status})
                    </span>
                  )}
                </div>
              )}

              {/* Original Incoming Email Body */}
              <div className="p-5 rounded-2xl bg-[#fafcfb] border border-[#e2e8f0] text-sm text-[#0f172a] leading-relaxed overflow-x-auto">
                {activeMessage.htmlBody ? (
                  <div dangerouslySetInnerHTML={{ __html: activeMessage.htmlBody }} />
                ) : (
                  <p className="whitespace-pre-wrap">{activeMessage.textBody}</p>
                )}
              </div>

              {/* Thread History / Previous Replies */}
              {activeMessage.replies?.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#f1f5f9]">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748b] flex items-center gap-2">
                    <Reply className="h-4 w-4 text-[#059669]" /> Reply History (
                    {activeMessage.replies.length})
                  </h3>
                  {activeMessage.replies.map((rep: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border border-[#cbd5e1] text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[#64748b]">
                        <span className="font-bold text-[#0f172a]">
                          {rep.authorName} &lt;{rep.authorEmail}&gt;
                        </span>
                        <span>{new Date(rep.sentAt).toLocaleString()}</span>
                      </div>
                      <div className="pt-1 text-[#334155] leading-relaxed">
                        {rep.textBody ? (
                          <p className="whitespace-pre-wrap">{rep.textBody}</p>
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: rep.htmlBody }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Composer Form */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t border-[#f1f5f9]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#0f172a] flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-[#059669]" /> Reply to{" "}
                    {activeMessage.fromEmail}
                  </label>
                  <span className="text-[11px] text-[#64748b]">Delivered via Resend / SMTP</span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your response to the customer..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] p-3 text-xs font-medium text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/10 resize-y"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={replyMutation.isPending || !replyText.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#047857] disabled:opacity-50 transition cursor-pointer"
                  >
                    {replyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-16 text-center space-y-2">
              <Inbox className="h-10 w-10 text-[#059669] mx-auto opacity-70" />
              <h3 className="text-sm font-extrabold text-[#0f172a]">
                Select an email from the left
              </h3>
              <p className="text-xs text-[#64748b] max-w-sm mx-auto">
                Read customer inquiries, view previous thread replies, and respond directly to{" "}
                <code className="font-mono text-[#0f172a]">support@webmintra.in</code>{" "}
                conversations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
