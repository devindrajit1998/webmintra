import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Inbox,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  Ticket,
  User,
  Users,
  X,
  Paperclip,
  Mail,
  Phone,
  Tag,
  Building,
} from "lucide-react";
import {
  getSupportTicket,
  getSupportTickets,
  replySupportTicket,
  resolveSupportTicket,
  updateSupportTicket,
  uploadImage,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support & Tickets | WebMintra Admin" }] }),
});

// ── Types ─────────────────────────────────────────────────────
type TicketStatus = "open" | "in_progress" | "waiting_reply" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: string;
  replyCount: number;
  lastRepliedAt?: string;
  tenant: { id: string; name?: string; email?: string; businessName?: string };
  createdAt: string;
  updatedAt: string;
}

interface Reply {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; name?: string; email?: string; role?: string };
  attachments?: { url: string; filename: string; size: number }[];
}

interface TicketDetail extends TicketSummary {
  replies: Reply[];
  attachments?: { url: string; filename: string; size: number }[];
}

// ── Main Page Component ───────────────────────────────────────
function SupportPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ["admin-support-list", { status, priority, search, page }],
    queryFn: () =>
      getSupportTickets({
        status: status || undefined,
        priority: priority || undefined,
        search: search.trim() || undefined,
        page,
        limit: 25,
      }),
    refetchInterval: 15_000,
  });

  const tickets: TicketSummary[] = useMemo(
    () => listQuery.data?.tickets ?? [],
    [listQuery.data?.tickets],
  );
  const summary = listQuery.data?.summary ?? {};
  const pagination = listQuery.data?.pagination ?? { page: 1, limit: 25, total: 0, pages: 1 };

  // Select first ticket on load if none selected
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current && tickets.length > 0) {
      setSelectedId(tickets[0].id);
      hasInitialized.current = true;
    }
  }, [tickets]);

  function selectTicket(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col gap-4 p-4 lg:p-6 bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Support & Enquiries</h1>
          <p className="mt-0.5 text-xs text-[#64748b]">
            View, reply, and manage all customer website enquiries and tenant support tickets.
          </p>
        </div>

        {/* Summary metric pills */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
            {summary.open ?? 0} Open
          </div>
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 shadow-2xs">
            {summary.in_progress ?? 0} In Progress
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold text-slate-600 shadow-2xs">
            {summary.resolved ?? 0} Resolved
          </div>
        </div>
      </div>

      {/* Split Panel Canvas */}
      <div className="grid flex-1 min-h-0 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* Left Column – Ticket List */}
        <div className="flex min-h-0 flex-col border-r border-[#e2e8f0] bg-[#f8fafc]">
          {/* Search and Filters Bar */}
          <div className="shrink-0 space-y-2.5 border-b border-[#e2e8f0] p-3.5 bg-white">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by ticket #, customer or subject..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8.5 pr-3 text-xs text-[#0f172a] placeholder:text-slate-400 outline-none transition focus:border-[#059669] focus:bg-white focus:ring-2 focus:ring-[#059669]/15"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status Tabs */}
              <div className="flex flex-1 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {[
                  { value: "", label: "All" },
                  { value: "open", label: "Open", count: summary.open },
                  { value: "in_progress", label: "Active", count: summary.in_progress },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatus(tab.value);
                      setPage(1);
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                      status === tab.value
                        ? "bg-[#0f172a] text-white shadow-2xs"
                        : "text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-black ${
                          status === tab.value
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Priority Select */}
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="h-7.5 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-[#475569] outline-none transition hover:border-slate-300 focus:border-[#059669]"
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Ticket List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {listQuery.isLoading ? (
              <Centered
                icon={<Loader2 className="h-6 w-6 animate-spin text-[#059669]" />}
                title="Loading enquiries & tickets..."
              />
            ) : listQuery.isError ? (
              <Centered
                icon={<AlertCircle className="h-6 w-6 text-rose-500" />}
                title="Could not load tickets"
                action={
                  <button
                    onClick={() => listQuery.refetch()}
                    className="text-xs font-bold text-[#059669] hover:underline"
                  >
                    Retry Loading
                  </button>
                }
              />
            ) : tickets.length === 0 ? (
              <Centered
                icon={<Inbox className="h-8 w-8 text-slate-300" />}
                title="No support tickets found"
                description="Try clearing search or filter criteria."
              />
            ) : (
              tickets.map((t) => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  active={selectedId === t.id}
                  onClick={() => selectTicket(t.id)}
                />
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {pagination.pages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-[#e2e8f0] bg-white px-3.5 py-2 text-xs text-[#64748b]">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0f172a] shadow-2xs hover:bg-slate-50 disabled:opacity-30 transition"
              >
                ← Prev
              </button>
              <span className="text-[11px] font-medium text-slate-500">
                Page {page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0f172a] shadow-2xs hover:bg-slate-50 disabled:opacity-30 transition"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right Column – Conversation & Action Panel */}
        <div className="flex min-h-0 flex-col bg-white">
          {selectedId ? (
            <ConversationPanel
              ticketId={selectedId}
              onUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ["admin-support-list"] });
                queryClient.invalidateQueries({ queryKey: ["admin-support-detail", selectedId] });
              }}
            />
          ) : (
            <Centered
              icon={<MessageSquare className="h-10 w-10 text-slate-300" />}
              title="Select an enquiry or ticket"
              description="Choose a conversation from the left sidebar to view messages, customer details, and reply."
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ticket Row Component ──────────────────────────────────────
function TicketRow({
  ticket,
  active,
  onClick,
}: {
  ticket: TicketSummary;
  active: boolean;
  onClick: () => void;
}) {
  const priorityColors: Record<string, string> = {
    urgent: "text-rose-700 bg-rose-50 border-rose-200",
    high: "text-orange-700 bg-orange-50 border-orange-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    low: "text-slate-600 bg-slate-100 border-slate-200",
  };

  const displayName = ticket.tenant?.name || ticket.tenant?.businessName || "Website Lead";
  const displayContact = ticket.tenant?.email || ticket.tenant?.businessName || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full p-4 text-left transition border-b border-slate-100 ${
        active ? "bg-emerald-50/50 border-l-4 border-l-[#059669] shadow-xs" : "hover:bg-slate-50/80"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[13px] font-bold ${
              active ? "text-[#065f46]" : "text-[#0f172a] group-hover:text-[#059669]"
            }`}
          >
            {ticket.subject}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748b]">
            <span className="font-mono font-bold text-[#0f172a]">{ticket.ticketNumber}</span>
            <span>·</span>
            <span className="truncate font-medium text-[#475569]">{displayName}</span>
          </div>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#64748b]">
        {ticket.description}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-slate-100/60">
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider ${
            priorityColors[ticket.priority] ?? priorityColors.low
          }`}
        >
          {ticket.priority}
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}

// ── Conversation Panel Component ──────────────────────────────
function ConversationPanel({ ticketId, onUpdated }: { ticketId: string; onUpdated: () => void }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; filename: string; size: number }[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-support-detail", ticketId],
    queryFn: () => getSupportTicket(ticketId),
    refetchInterval: 15_000,
  });

  const ticket: TicketDetail | undefined = detailQuery.data?.ticket;

  // Scroll to bottom on new replies
  useEffect(() => {
    if (ticket) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [ticket, ticketId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 2MB.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadImage(formData);
      setAttachments((prev) => [...prev, { url: res.url, filename: file.name, size: file.size }]);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const replyMutation = useMutation({
    mutationFn: () =>
      replySupportTicket(ticketId, { content: reply.trim(), isInternal, attachments }),
    onSuccess: (data) => {
      setReply("");
      setIsInternal(false);
      setAttachments([]);
      queryClient.setQueryData(
        ["admin-support-detail", ticketId],
        data.ticket ? { ticket: data.ticket } : (old: any) => old,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", ticketId] });
      onUpdated();
      toast.success(isInternal ? "Internal note added" : "Reply sent to customer");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateSupportTicket(ticketId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", ticketId] });
      onUpdated();
      toast.success("Ticket status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const priorityMutation = useMutation({
    mutationFn: (newPriority: string) => updateSupportTicket(ticketId, { priority: newPriority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", ticketId] });
      onUpdated();
      toast.success("Priority updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resolveMutation = useMutation({
    mutationFn: () => resolveSupportTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", ticketId] });
      onUpdated();
      toast.success("Ticket marked as resolved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (detailQuery.isLoading) {
    return (
      <Centered
        icon={<Loader2 className="h-7 w-7 animate-spin text-[#059669]" />}
        title="Loading ticket details..."
      />
    );
  }

  if (detailQuery.isError || !ticket) {
    return (
      <Centered
        icon={<AlertCircle className="h-7 w-7 text-rose-500" />}
        title="Could not load ticket conversation"
        action={
          <button
            onClick={() => detailQuery.refetch()}
            className="text-xs font-bold text-[#059669] hover:underline"
          >
            Retry Loading
          </button>
        }
      />
    );
  }

  const isClosed = ticket.status === "closed";
  const customerName = ticket.tenant?.name || "Website Lead";
  const customerEmail = ticket.tenant?.email || "";
  const customerBusiness = ticket.tenant?.businessName || "";

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Detail Header */}
      <div className="shrink-0 border-b border-[#e2e8f0] p-4 lg:p-5 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-black text-[#0f172a]">{ticket.subject}</h2>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
              <span className="font-mono font-bold text-[#0f172a]">{ticket.ticketNumber}</span>
              <span>·</span>
              <span className="font-medium text-[#334155]">{customerName}</span>
              <span>·</span>
              <span>Submitted {format(new Date(ticket.createdAt), "MMM d, yyyy · h:mm a")}</span>
            </div>
          </div>

          {/* Action Status and Priority Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <div className="relative">
              <select
                value={ticket.status}
                disabled={statusMutation.isPending}
                onChange={(e) => statusMutation.mutate(e.target.value)}
                className="h-8.5 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs font-bold text-[#0f172a] outline-none transition hover:bg-slate-100 focus:border-[#059669] disabled:opacity-50"
              >
                <option value="open">Status: Open</option>
                <option value="in_progress">Status: In Progress</option>
                <option value="waiting_reply">Status: Waiting Reply</option>
                <option value="resolved">Status: Resolved</option>
                <option value="closed">Status: Closed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Priority Select */}
            <div className="relative">
              <select
                value={ticket.priority}
                disabled={priorityMutation.isPending}
                onChange={(e) => priorityMutation.mutate(e.target.value)}
                className="h-8.5 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-8 text-xs font-bold text-[#0f172a] outline-none transition hover:bg-slate-100 focus:border-[#059669] disabled:opacity-50"
              >
                <option value="low">Priority: Low</option>
                <option value="medium">Priority: Medium</option>
                <option value="high">Priority: High</option>
                <option value="urgent">Priority: Urgent</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Quick Resolve Button */}
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
              <button
                type="button"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate()}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-100 disabled:opacity-50"
              >
                {resolveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
                <span>Resolve</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer & Lead Meta Card Strip */}
        <div className="mt-3.5 flex flex-wrap items-center gap-3 sm:gap-6 rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-xs text-[#475569]">
          {customerEmail && (
            <a
              href={`mailto:${customerEmail}`}
              className="flex items-center gap-1.5 font-medium text-[#0f172a] hover:text-[#059669] hover:underline"
            >
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{customerEmail}</span>
            </a>
          )}
          {customerBusiness && (
            <span className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span>{customerBusiness}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-slate-500">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
            </span>
          </span>
          {ticket.category && (
            <span className="flex items-center gap-1.5 text-slate-500">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span>{ticket.category}</span>
            </span>
          )}
        </div>
      </div>

      {/* Messages Thread Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 lg:p-6 bg-[#fcfdfd]">
        {/* Initial Original Message */}
        <ChatBubble
          author={customerName}
          content={ticket.description}
          date={ticket.createdAt}
          isAdmin={false}
          attachments={ticket.attachments}
        />

        {/* Subsequent Replies */}
        {ticket.replies.map((r) => (
          <ChatBubble
            key={r.id}
            author={r.author.role === "admin" ? r.author.name || "WebMintra Support" : customerName}
            content={r.content}
            date={r.createdAt}
            isAdmin={r.author.role === "admin"}
            isInternal={r.isInternal}
            attachments={r.attachments}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Reply Composer Box */}
      <div className="shrink-0 border-t border-[#e2e8f0] bg-white p-4">
        {isClosed ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-[#64748b]">
            <Lock className="h-4 w-4 text-slate-400" />
            <span>This ticket is closed. Re-open the ticket status above to post a reply.</span>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim() || attachments.length > 0) replyMutation.mutate();
            }}
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={5000}
              placeholder={
                isInternal
                  ? "Write an internal staff note (visible only to admins)..."
                  : `Reply to ${customerName} via ticket & email...`
              }
              className={`h-24 w-full resize-none rounded-xl border p-3 text-xs text-[#0f172a] placeholder:text-slate-400 outline-none transition ${
                isInternal
                  ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                  : "border-slate-200 bg-white focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
              }`}
            />

            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="group relative rounded-lg border border-slate-200 bg-slate-50 p-1"
                  >
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="h-10 w-10 rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-900 p-0.5 text-white shadow hover:bg-rose-600 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {/* Internal Note Toggle */}
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#475569] hover:text-[#0f172a]">
                <div
                  onClick={() => setIsInternal(!isInternal)}
                  className={`relative h-4.5 w-8 rounded-full transition ${
                    isInternal ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      isInternal ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <ShieldAlert
                  className={`h-4 w-4 ${isInternal ? "text-amber-600" : "text-slate-400"}`}
                />
                <span className={isInternal ? "text-amber-700 font-bold" : ""}>
                  {isInternal ? "Internal Note (Hidden from customer)" : "Mark as internal note"}
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || attachments.length >= 3}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#475569] shadow-2xs hover:bg-slate-50 hover:text-[#0f172a] disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#059669]" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>{uploading ? "Uploading..." : "Attach File"}</span>
                </button>

                <button
                  type="submit"
                  disabled={
                    (!reply.trim() && attachments.length === 0) ||
                    replyMutation.isPending ||
                    uploading
                  }
                  className={`inline-flex h-9 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition disabled:opacity-40 ${
                    isInternal
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-[#059669] hover:bg-[#047857]"
                  }`}
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {replyMutation.isPending
                      ? "Sending..."
                      : isInternal
                        ? "Save Internal Note"
                        : "Send Reply"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Chat Bubble Component ─────────────────────────────────────
function ChatBubble({
  author,
  content,
  date,
  isAdmin,
  isInternal,
  attachments,
}: {
  author: string;
  content: string;
  date: string;
  isAdmin: boolean;
  isInternal?: boolean;
  attachments?: { url: string; filename: string; size: number }[];
}) {
  return (
    <div className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
      <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] text-[#64748b]">
        <span className={`font-bold ${isAdmin ? "text-[#059669]" : "text-[#0f172a]"}`}>
          {author}
        </span>
        {isInternal && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-800 border border-amber-200">
            <ShieldAlert className="h-2.5 w-2.5" /> Internal Note
          </span>
        )}
        <span>·</span>
        <span>{format(new Date(date), "MMM d, yyyy · h:mm a")}</span>
      </div>

      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
          isInternal
            ? "border border-amber-200 bg-amber-50 text-amber-950"
            : isAdmin
              ? "bg-[#0f172a] text-white"
              : "border border-slate-200 bg-white text-[#0f172a]"
        }`}
      >
        {content}
      </div>

      {attachments && attachments.length > 0 && (
        <div
          className={`mt-2 flex flex-wrap gap-2 max-w-[85%] ${
            isAdmin ? "justify-end" : "justify-start"
          }`}
        >
          {attachments.map((file, i) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xs transition hover:border-[#059669]"
            >
              <img
                src={file.url}
                alt={file.filename}
                className="h-20 w-auto rounded-lg object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Badge Component ────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    waiting_reply: "bg-purple-50 text-purple-700 border-purple-200",
    resolved: "bg-slate-100 text-slate-700 border-slate-200",
    closed: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
        styles[status] ?? styles.open
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Centered Empty State ──────────────────────────────────────
function Centered({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-[#0f172a]">{title}</p>
        {description && <p className="mt-0.5 text-xs text-[#64748b]">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
