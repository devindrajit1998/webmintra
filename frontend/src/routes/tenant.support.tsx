import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
  Paperclip,
} from "lucide-react";
import {
  createTenantTicket,
  getTenantTicket,
  getTenantTickets,
  replyToTenantTicket,
  uploadSupportAttachment,
  type SupportTicket,
} from "@/lib/auth-api";

export const Route = createFileRoute("/tenant/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support | WebMintra" }] }),
});

const emptyForm = {
  subject: "",
  description: "",
  priority: "medium" as SupportTicket["priority"],
  category: "Technical",
};

// ── Types ─────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-slate-400 bg-slate-700/40 border-slate-700",
};

// ── Page ──────────────────────────────────────────────────────
function SupportPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [reply, setReply] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; filename: string; size: number }[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const listQuery = useQuery({
    queryKey: ["tenant-support", search, status],
    queryFn: () => getTenantTickets({ limit: 50, search, status }),
  });
  const detailQuery = useQuery({
    queryKey: ["tenant-support-detail", selectedId],
    queryFn: () => getTenantTicket(selectedId!),
    enabled: !!selectedId,
    refetchInterval: 30_000,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 2MB.");
      return;
    }

    try {
      setUploading(true);
      const res = await uploadSupportAttachment(file);
      setAttachments((prev) => [...prev, { url: res.url, filename: res.filename, size: res.size }]);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => createTenantTicket({ ...data, attachments }),
    onSuccess: ({ ticket }) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-support"] });
      setSelectedId(ticket.id);
      setForm(emptyForm);
      setAttachments([]);
      setShowCreate(false);
      toast.success(`Ticket ${ticket.ticketNumber} created`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const replyMutation = useMutation({
    mutationFn: () => replyToTenantTicket(selectedId!, reply.trim(), attachments),
    onSuccess: () => {
      setReply("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["tenant-support"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-support-detail", selectedId] });
      toast.success("Reply sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tickets = listQuery.data?.tickets ?? [];
  const summary = listQuery.data?.summary ?? {};
  const pagination = listQuery.data?.pagination ?? { total: 0 };
  const ticket = detailQuery.data?.ticket;

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (ticket) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [ticket, selectedId]);

  return (
    <div className="max-w-[1600px] space-y-6 pb-12">
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
              <LifeBuoy className="h-3.5 w-3.5" /> Customer Support
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Support Tickets
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              Contact the WebMintra technical team, track resolutions, and submit requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Ticket
          </button>
        </div>
      </section>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#e2e8f0] sm:grid-cols-4 shadow-xs">
        <SummaryCard label="Total" value={pagination.total} icon={Inbox} />
        <SummaryCard label="Open" value={summary.open ?? 0} icon={AlertCircle} />
        <SummaryCard
          label="In Progress"
          value={(summary.in_progress ?? 0) + (summary.waiting_reply ?? 0)}
          icon={Clock3}
        />
        <SummaryCard
          label="Resolved"
          value={(summary.resolved ?? 0) + (summary.closed ?? 0)}
          icon={CheckCircle2}
        />
      </div>

      {/* Main split panel */}
      <section className="grid min-h-[640px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs lg:grid-cols-[minmax(320px,400px)_1fr]">
        {/* Ticket list (left) */}
        <div
          className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-[#e2e8f0] lg:border-r`}
        >
          {/* Filters */}
          <div className="space-y-3 border-b border-[#f1f5f9] p-4 bg-[#f8fafc]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket # or subject..."
                className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white pl-10 pr-3 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669] transition"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {[
                { value: "", label: "All" },
                { value: "open", label: "Open" },
                { value: "in_progress", label: "Active" },
                { value: "resolved", label: "Resolved" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatus(tab.value)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    status === tab.value
                      ? "bg-[#059669] text-white shadow-xs"
                      : "text-[#64748b] hover:bg-white hover:text-[#0f172a]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f1f5f9]">
            {listQuery.isLoading ? (
              <Centered
                icon={<Loader2 className="h-8 w-8 animate-spin text-[#059669]" />}
                title="Loading tickets..."
              />
            ) : listQuery.isError ? (
              <Centered
                icon={<AlertCircle className="h-8 w-8 text-rose-500" />}
                title="Could not load tickets"
                action={
                  <button
                    onClick={() => listQuery.refetch()}
                    className="text-xs font-bold text-[#059669]"
                  >
                    Try again
                  </button>
                }
              />
            ) : tickets.length === 0 ? (
              <Centered
                icon={<Inbox className="h-10 w-10 text-[#cbd5e1]" />}
                title="No tickets"
                description={
                  search || status
                    ? "Change filters to see other tickets."
                    : "Create a ticket when you need help."
                }
              />
            ) : (
              tickets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full p-4 text-left transition cursor-pointer ${
                    selectedId === item.id
                      ? "bg-[#ecfdf5] border-l-3 border-l-[#059669]"
                      : "hover:bg-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#0f172a]">{item.subject}</p>
                      <p className="mt-0.5 font-mono text-[10px] font-bold text-[#64748b]">
                        {item.ticketNumber} · {item.category}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#94a3b8]">
                    <span
                      className={`rounded px-1.5 py-0.5 font-bold uppercase ${
                        PRIORITY_COLORS[item.priority] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span>
                      {item.updatedAt
                        ? formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })
                        : formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket thread (right) */}
        <div className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 flex-col bg-[#f8fafc]`}>
          {!selectedId ? (
            <Centered
              icon={<MessageSquare className="h-12 w-12 text-[#cbd5e1]" />}
              title="Select a ticket"
              description="Choose a ticket conversation from the list to view replies and send messages."
            />
          ) : detailQuery.isLoading ? (
            <Centered
              icon={<Loader2 className="h-8 w-8 animate-spin text-[#059669]" />}
              title="Loading conversation..."
            />
          ) : !ticket ? (
            <Centered
              icon={<AlertCircle className="h-8 w-8 text-rose-500" />}
              title="Ticket not found"
            />
          ) : (
            <>
              {/* Detail header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] bg-white p-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#059669]">
                        {ticket.ticketNumber}
                      </span>
                      <h2 className="truncate text-sm font-extrabold text-[#0f172a]">
                        {ticket.subject}
                      </h2>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#64748b]">
                      Created {format(new Date(ticket.createdAt), "PPP")} · Category:{" "}
                      {ticket.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ticket.status} />
                </div>
              </div>

              {/* Message scroll area */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <Message
                  author="You"
                  content={ticket.description}
                  date={ticket.createdAt}
                  isTenant
                  attachments={ticket.attachments}
                />
                {(ticket.replies ?? []).map((r: any) => (
                  <Message
                    key={r.id}
                    author={
                      r.author?.role === "admin" ? r.author.name || "WebMintra Support" : "You"
                    }
                    content={r.content}
                    date={r.createdAt}
                    isTenant={r.author?.role !== "admin"}
                    attachments={r.attachments}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              <div className="border-t border-[#e2e8f0] bg-white p-4">
                {ticket.status === "closed" ? (
                  <p className="py-2 text-center text-xs font-semibold text-[#64748b]">
                    This ticket has been marked as resolved and closed.
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reply.trim() && attachments.length === 0) return;
                      replyMutation.mutate();
                    }}
                  >
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your message here..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-semibold text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#059669] focus:bg-white transition"
                    />
                    {attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((file, i) => (
                          <div
                            key={i}
                            className="group relative rounded-lg border border-[#e2e8f0] bg-white p-1"
                          >
                            <img
                              src={file.url}
                              alt={file.filename}
                              className="h-10 w-10 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-600 p-0.5 text-white shadow-xs transition"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
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
                          className="flex items-center gap-1.5 text-xs font-bold text-[#64748b] hover:text-[#059669] disabled:opacity-50 cursor-pointer"
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#059669]" />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5" />
                          )}
                          {uploading ? "Uploading..." : "Attach File"}
                        </button>
                        <span className="text-[10px] text-[#94a3b8]">{reply.length}/5000</span>
                      </div>
                      <button
                        type="submit"
                        disabled={
                          (!reply.trim() && attachments.length === 0) ||
                          replyMutation.isPending ||
                          uploading
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-40 cursor-pointer"
                      >
                        {replyMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>{replyMutation.isPending ? "Sending..." : "Send Reply"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Create ticket modal */}
      {showCreate && (
        <CreateTicketModal
          form={form}
          setForm={setForm}
          pending={createMutation.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={() => createMutation.mutate(form)}
        />
      )}
    </div>
  );
}

// ── Summary Card ──────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
}) {
  return (
    <div className="flex items-center gap-3.5 bg-white p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#059669] shadow-2xs">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-[#0f172a]">{value}</p>
        <p className="text-[11px] font-bold text-[#64748b]">{label}</p>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const styles =
    status === "open"
      ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
      : status === "in_progress" || status === "waiting_reply"
        ? "bg-[#f0f9ff] text-[#0284c7] border border-[#bae6fd]"
        : "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${styles}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Message({
  author,
  content,
  date,
  isTenant,
  attachments,
}: {
  author: string;
  content: string;
  date: string;
  isTenant: boolean;
  attachments?: { url: string; filename: string; size: number }[];
}) {
  return (
    <div className={`flex flex-col ${isTenant ? "items-end" : "items-start"}`}>
      <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold text-[#64748b]">
        <span className="text-[#0f172a] font-extrabold">{author}</span>
        <span>{format(new Date(date), "MMM d, h:mm a")}</span>
      </div>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium shadow-2xs ${
          isTenant
            ? "bg-[#059669] text-white rounded-br-xs"
            : "border border-[#e2e8f0] bg-white text-[#0f172a] rounded-bl-xs"
        }`}
      >
        {content}
      </div>
      {attachments && attachments.length > 0 && (
        <div
          className={`mt-2 flex flex-wrap gap-2 max-w-[85%] ${isTenant ? "justify-end" : "justify-start"}`}
        >
          {attachments.map((file, i) => (
            <a
              key={i}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-1 shadow-2xs"
            >
              <img
                src={file.url}
                alt={file.filename}
                className="h-20 w-auto object-cover rounded-lg"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Centered State ────────────────────────────────────────────
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
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center p-8 text-center">
      {icon}
      <h3 className="mt-3 text-sm font-extrabold text-[#0f172a]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#64748b]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── Create Ticket Modal ───────────────────────────────────────
function CreateTicketModal({
  form,
  setForm,
  pending,
  onClose,
  onSubmit,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 p-4 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-xl rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-4 bg-[#f8fafc]">
          <div>
            <h2 className="font-extrabold text-base text-[#0f172a]">Create Support Ticket</h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Include enough detail for our technical engineers to assist quickly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#0f172a] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs font-bold text-[#0f172a]">
            Subject *
            <input
              required
              minLength={3}
              maxLength={200}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Need assistance with custom domain verification"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669]"
            />
          </label>

          <label className="text-xs font-bold text-[#0f172a]">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
            >
              <option>Technical</option>
              <option>Billing</option>
              <option>Domain</option>
              <option>Website editor</option>
              <option>Account</option>
              <option>Other</option>
            </select>
          </label>

          <label className="text-xs font-bold text-[#0f172a]">
            Priority
            <select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as SupportTicket["priority"] })
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label className="sm:col-span-2 text-xs font-bold text-[#0f172a]">
            Description *
            <textarea
              required
              minLength={10}
              maxLength={5000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what happened, error codes or logs, and what you expected."
              className="mt-1.5 h-36 w-full resize-none rounded-xl border border-[#e2e8f0] bg-white p-3 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669]"
            />
            <span className="mt-1 block text-right text-[10px] text-[#94a3b8]">
              {form.description.length}/5000
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#f1f5f9] bg-[#f8fafc] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-white hover:text-[#0f172a] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create ticket
          </button>
        </div>
      </form>
    </div>
  );
}
