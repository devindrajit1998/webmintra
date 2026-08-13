import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  MoreHorizontal,
  Search,
  Send,
  ShieldAlert,
  Ticket,
  Users,
  X,
  Paperclip,
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
  head: () => ({ meta: [{ title: "Support | WebMintra Admin" }] }),
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
}
interface TicketDetail extends TicketSummary {
  replies: Reply[];
}

// ── Page ──────────────────────────────────────────────────────
function SupportPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-support-list", search, status, priority, page],
    queryFn: () => getSupportTickets({ page, limit: 20, search, status, priority }),
  });

  const tickets: TicketSummary[] = listQuery.data?.tickets ?? [];
  const summary = listQuery.data?.summary ?? {};
  const pagination = listQuery.data?.pagination ?? { total: 0, pages: 1 };

  function selectTicket(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-0">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Support tickets</h1>
          <p className="mt-1 text-xs text-slate-500">View, reply, and manage all tenant support requests.</p>
        </div>
        {/* Summary chips */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Open", key: "open", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { label: "In Progress", key: "in_progress", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
            { label: "Resolved", key: "resolved", color: "text-slate-400 bg-slate-700/40 border-slate-700" },
          ].map(({ label, key, color }) => (
            <div key={key} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${color}`}>
              {summary[key] ?? 0} {label}
            </div>
          ))}
        </div>
      </div>

      {/* Split Panel */}
      <div className="grid flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#0b1826] lg:grid-cols-[minmax(300px,380px)_1fr]">
        {/* Left – ticket list */}
        <div className="flex min-h-0 flex-col border-r border-slate-800">
          {/* Filters */}
          <div className="shrink-0 space-y-3 border-b border-slate-800 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search tickets..."
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-9 pr-3 text-xs outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-2">
              {/* Status tabs */}
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
                    onClick={() => { setStatus(tab.value); setPage(1); }}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${status === tab.value ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${status === tab.value ? "bg-slate-800 text-slate-300" : "bg-slate-800/50 text-slate-500"}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                className="h-8 rounded-lg border border-slate-700 bg-slate-950/60 px-2 text-[11px] text-slate-400"
              >
                <option value="">Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <Centered icon={<Loader2 className="h-7 w-7 animate-spin text-cyan-400" />} title="Loading tickets..." />
            ) : listQuery.isError ? (
              <Centered
                icon={<AlertCircle className="h-7 w-7 text-rose-400" />}
                title="Could not load tickets"
                action={<button onClick={() => listQuery.refetch()} className="text-xs text-cyan-400">Retry</button>}
              />
            ) : tickets.length === 0 ? (
              <Centered icon={<Inbox className="h-8 w-8 text-slate-600" />} title="No tickets found" description="Try changing the filters." />
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

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-slate-800 px-3 py-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >← Prev</button>
              <span className="text-[11px] text-slate-500">{page} / {pagination.pages}</span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >Next →</button>
            </div>
          )}
        </div>

        {/* Right – conversation */}
        <div className="flex min-h-0 flex-col">
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
              icon={<MessageSquare className="h-12 w-12 text-slate-700" />}
              title="Select a ticket"
              description="Choose a conversation from the list to read messages and reply."
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ticket Row ────────────────────────────────────────────────
function TicketRow({ ticket, active, onClick }: { ticket: TicketSummary; active: boolean; onClick: () => void }) {
  const priorityColors: Record<string, string> = {
    urgent: "text-rose-400 bg-rose-500/10",
    high: "text-orange-400 bg-orange-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    low: "text-slate-400 bg-slate-700/40",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full border-b border-slate-800/70 p-4 text-left transition ${active ? "bg-cyan-500/5 border-l-2 border-l-cyan-500" : "hover:bg-slate-900/40"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">{ticket.subject}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{ticket.ticketNumber} · {ticket.tenant?.businessName || ticket.tenant?.email || "Unknown tenant"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={ticket.status} />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{ticket.description}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityColors[ticket.priority] ?? "text-slate-400"}`}>{ticket.priority}</span>
        <span className="text-[10px] text-slate-600">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
      </div>
    </button>
  );
}

// ── Conversation Panel ────────────────────────────────────────
function ConversationPanel({ ticketId, onUpdated }: { ticketId: string; onUpdated: () => void }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; filename: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-support-detail", ticketId],
    queryFn: () => getSupportTicket(ticketId),
    refetchInterval: 30_000,
  });

  const ticket: TicketDetail | undefined = detailQuery.data?.ticket;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (ticket) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [ticket?.replies?.length, ticketId]);

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
    mutationFn: () => replySupportTicket(ticketId, { content: reply.trim(), isInternal, attachments }),
    onSuccess: (data) => {
      setReply("");
      setIsInternal(false);
      setAttachments([]);
      // Optimistically update the detail
      queryClient.setQueryData(["admin-support-detail", ticketId], data.ticket
        ? { ticket: data.ticket }
        : (old: any) => old);
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", ticketId] });
      onUpdated();
      toast.success(isInternal ? "Internal note added" : "Reply sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateSupportTicket(ticketId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", ticketId] });
      onUpdated();
      toast.success("Status updated");
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
      toast.success("Ticket resolved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (detailQuery.isLoading) {
    return <Centered icon={<Loader2 className="h-8 w-8 animate-spin text-cyan-400" />} title="Loading conversation..." />;
  }

  if (detailQuery.isError || !ticket) {
    return (
      <Centered
        icon={<AlertCircle className="h-8 w-8 text-rose-400" />}
        title="Could not load ticket"
        action={<button onClick={() => detailQuery.refetch()} className="text-sm text-cyan-400">Retry</button>}
      />
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <>
      {/* Ticket header */}
      <div className="shrink-0 border-b border-slate-800 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">{ticket.subject}</h2>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ticket.ticketNumber}
              {ticket.category && <> · {ticket.category}</>}
              · {ticket.tenant?.businessName || ticket.tenant?.email || "Unknown tenant"}
              · {format(new Date(ticket.createdAt), "PPp")}
            </p>
          </div>

          {/* Action controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status selector */}
            <div className="relative">
              <select
                value={ticket.status}
                disabled={statusMutation.isPending}
                onChange={(e) => statusMutation.mutate(e.target.value)}
                className="h-8 cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-900 pl-3 pr-7 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_reply">Waiting Reply</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            </div>

            {/* Priority selector */}
            <div className="relative">
              <select
                value={ticket.priority}
                disabled={priorityMutation.isPending}
                onChange={(e) => priorityMutation.mutate(e.target.value)}
                className="h-8 cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-900 pl-3 pr-7 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            </div>

            {/* Resolve button */}
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
              <button
                type="button"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {resolveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Resolve
              </button>
            )}
          </div>
        </div>

        {/* Tenant info strip */}
        <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-slate-900/50 px-3 py-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><Users className="h-3 w-3" />{ticket.tenant?.email ?? "—"}</span>
          <span className="flex items-center gap-1.5"><Ticket className="h-3 w-3" />{ticket.ticketNumber}</span>
          <span className="flex items-center gap-1.5"><Clock3 className="h-3 w-3" />Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
          {ticket.replyCount > 0 && (
            <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3" />{ticket.replyCount} {ticket.replyCount === 1 ? "reply" : "replies"}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-5">
        {/* Initial description (first message from tenant) */}
        <ChatBubble
          author={ticket.tenant?.businessName || ticket.tenant?.email || "Tenant"}
          content={ticket.description}
          date={ticket.createdAt}
          isAdmin={false}
          attachments={ticket.attachments}
        />

        {/* Replies */}
        {ticket.replies.map((r) => (
          <ChatBubble
            key={r.id}
            author={r.author.role === "admin" ? (r.author.name || "WebMintra Support") : (ticket.tenant?.businessName || ticket.tenant?.email || "Tenant")}
            content={r.content}
            date={r.createdAt}
            isAdmin={r.author.role === "admin"}
            isInternal={r.isInternal}
            attachments={r.attachments}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-950/40 p-4">
        {isClosed ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            This ticket is closed. Change the status to reply.
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (reply.trim() || attachments.length > 0) replyMutation.mutate(); }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              maxLength={5000}
              placeholder={isInternal ? "Write an internal note (not visible to tenant)..." : "Write a reply to the tenant..."}
              className={`h-24 w-full resize-none rounded-lg border p-3 text-sm outline-none transition ${isInternal ? "border-amber-700/50 bg-amber-950/20 text-amber-100 placeholder:text-amber-900/60 focus:border-amber-600" : "border-slate-700 bg-slate-950 text-slate-100 focus:border-cyan-500"}`}
            />
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((file, i) => (
                  <div key={i} className="group relative rounded border border-slate-700 bg-slate-900 p-1">
                    <img src={file.url} alt={file.filename} className="h-10 w-10 object-cover opacity-80" />
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 p-0.5 text-slate-400 opacity-0 hover:text-rose-400 group-hover:opacity-100 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400 hover:text-slate-300">
                <div
                  onClick={() => setIsInternal(!isInternal)}
                  className={`relative h-4 w-7 rounded-full transition ${isInternal ? "bg-amber-500" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${isInternal ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </div>
                <ShieldAlert className={`h-3.5 w-3.5 ${isInternal ? "text-amber-400" : "text-slate-600"}`} />
                {isInternal ? <span className="font-medium text-amber-400">Internal note</span> : "Mark as internal note"}
              </label>
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
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-cyan-400 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading..." : "Attach"}
                </button>
                <span className="text-[11px] text-slate-600">{reply.length}/5000</span>
                <button
                  type="submit"
                  disabled={(!reply.trim() && attachments.length === 0) || replyMutation.isPending || uploading}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition disabled:opacity-40 ${isInternal ? "bg-amber-500 text-amber-950 hover:bg-amber-400" : "bg-cyan-500 text-cyan-950 hover:bg-cyan-400"}`}
                >
                  {replyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {replyMutation.isPending ? "Sending..." : isInternal ? "Add note" : "Send reply"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────
function ChatBubble({
  author, content, date, isAdmin, isInternal, attachments,
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
      <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-300">{author}</span>
        {isInternal && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-400">
            <ShieldAlert className="h-2.5 w-2.5" /> Internal
          </span>
        )}
        <span>{format(new Date(date), "MMM d, yyyy · h:mm a")}</span>
      </div>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${
          isInternal
            ? "border border-amber-700/30 bg-amber-950/25 text-amber-100"
            : isAdmin
              ? "border border-cyan-800/30 bg-cyan-950/40 text-cyan-100"
              : "border border-slate-700/50 bg-slate-800 text-slate-200"
        }`}
      >
        {content}
      </div>
      {attachments && attachments.length > 0 && (
        <div className={`mt-2 flex flex-wrap gap-2 max-w-[85%] ${isAdmin ? "justify-end" : "justify-start"}`}>
          {attachments.map((file, i) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
            >
              <img src={file.url} alt={file.filename} className="h-20 w-auto object-cover opacity-90 transition group-hover:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-400",
    in_progress: "bg-cyan-500/10 text-cyan-400",
    waiting_reply: "bg-violet-500/10 text-violet-400",
    resolved: "bg-slate-700/60 text-slate-400",
    closed: "bg-slate-900 text-slate-600",
  };
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status] ?? styles.open}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Centered Empty / Loading ──────────────────────────────────
function Centered({
  icon, title, description, action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      {icon}
      <div>
        <p className="text-sm font-semibold text-slate-300">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
