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
  const [attachments, setAttachments] = useState<{ url: string; filename: string; size: number }[]>([]);
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
  }, [ticket?.replies?.length, selectedId]);

  return (
    <div className="mx-auto flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-emerald-400">
            <LifeBuoy className="h-4 w-4" /> Customer support
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Support tickets</h1>
          <p className="mt-2 text-sm text-slate-400">Contact the WebMintra team and track every response.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </header>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-4">
        <SummaryCard label="Total" value={pagination.total} icon={Inbox} />
        <SummaryCard label="Open" value={summary.open ?? 0} icon={AlertCircle} />
        <SummaryCard label="In Progress" value={(summary.in_progress ?? 0) + (summary.waiting_reply ?? 0)} icon={Clock3} />
        <SummaryCard label="Resolved" value={(summary.resolved ?? 0) + (summary.closed ?? 0)} icon={CheckCircle2} />
      </div>

      {/* Main split panel */}
      <section className="grid min-h-[640px] overflow-hidden border-y border-slate-800 bg-[#0b1826] lg:grid-cols-[minmax(300px,400px)_1fr] lg:rounded-xl lg:border">
        {/* Ticket list (left) */}
        <div className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-slate-800 lg:border-r`}>
          {/* Filters */}
          <div className="space-y-3 border-b border-slate-800 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by number or subject"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
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
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${status === tab.value ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List body */}
          <div className="flex-1 overflow-y-auto">
            {listQuery.isLoading ? (
              <Centered icon={<Loader2 className="h-7 w-7 animate-spin text-emerald-400" />} title="Loading tickets" />
            ) : listQuery.isError ? (
              <Centered
                icon={<AlertCircle className="h-7 w-7 text-rose-400" />}
                title="Could not load tickets"
                action={<button onClick={() => listQuery.refetch()} className="text-sm text-emerald-400">Try again</button>}
              />
            ) : tickets.length === 0 ? (
              <Centered
                icon={<Inbox className="h-8 w-8 text-slate-600" />}
                title="No tickets"
                description={search || status ? "Change filters to see other tickets." : "Create a ticket when you need help."}
              />
            ) : (
              tickets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full border-b border-slate-800/70 p-4 text-left transition ${selectedId === item.id ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : "hover:bg-slate-900/50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-200">{item.subject}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{item.ticketNumber}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_COLORS[item.priority] ?? ""}`}>
                      {item.priority}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation panel (right) */}
        <div className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}>
          {!selectedId ? (
            <Centered
              icon={<MessageSquare className="h-10 w-10 text-slate-700" />}
              title="Select a ticket"
              description="Choose a conversation to read messages and reply."
            />
          ) : detailQuery.isLoading ? (
            <Centered icon={<Loader2 className="h-7 w-7 animate-spin text-emerald-400" />} title="Loading conversation" />
          ) : !ticket ? (
            <Centered
              icon={<AlertCircle className="h-7 w-7 text-rose-400" />}
              title="Could not load ticket"
              action={<button onClick={() => detailQuery.refetch()} className="text-sm text-emerald-400">Try again</button>}
            />
          ) : (
            <>
              {/* Conversation header */}
              <div className="shrink-0 border-b border-slate-800 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-white">{ticket.subject}</h2>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                      <span>{ticket.ticketNumber}</span>
                      {ticket.category && <span className="capitalize">{ticket.category}</span>}
                      <span className={`rounded border px-1.5 py-0.5 font-semibold uppercase ${PRIORITY_COLORS[ticket.priority] ?? ""}`}>
                        {ticket.priority}
                      </span>
                      <span>Opened {format(new Date(ticket.createdAt), "PPp")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                {/* Original description */}
                <Message
                  author="You"
                  content={ticket.description}
                  date={ticket.createdAt}
                  isTenant
                  attachments={ticket.attachments}
                />

                {/* Replies */}
                {(ticket.replies ?? []).map((r: any) => (
                  <Message
                    key={r.id}
                    author={r.author?.role === "admin" ? (r.author.name || "WebMintra Support") : "You"}
                    content={r.content}
                    date={r.createdAt}
                    isTenant={r.author?.role !== "admin"}
                    attachments={r.attachments}
                  />
                ))}

                {ticket.replies?.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                    No replies yet. Our team will respond shortly.
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Reply form */}
              <div className="shrink-0 border-t border-slate-800 bg-slate-950/30 p-4">
                {ticket.status === "closed" ? (
                  <p className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-center text-sm text-slate-400">
                    This ticket is closed and cannot receive new replies.
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (reply.trim()) replyMutation.mutate();
                    }}
                  >
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      maxLength={5000}
                      placeholder="Write a reply to the support team..."
                      className="h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none transition focus:border-emerald-500"
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
                          className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-emerald-400 disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                          {uploading ? "Uploading..." : "Attach"}
                        </button>
                        <span className="text-[11px] text-slate-600">{reply.length}/5000</span>
                      </div>
                      <button
                        type="submit"
                        disabled={(!reply.trim() && attachments.length === 0) || replyMutation.isPending || uploading}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
                      >
                        {replyMutation.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Send className="h-4 w-4" />}
                        {replyMutation.isPending ? "Sending..." : "Send reply"}
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
    <div className="flex items-center gap-3 bg-[#0b1826] p-4">
      <Icon className="h-5 w-5 text-slate-500 shrink-0" />
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const styles =
    status === "open"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "in_progress" || status === "waiting_reply"
        ? "bg-cyan-500/10 text-cyan-400"
        : "bg-slate-700/60 text-slate-400";
  return (
    <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold uppercase ${styles}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Message({
  author, content, date, isTenant, attachments,
}: {
  author: string;
  content: string;
  date: string;
  isTenant: boolean;
  attachments?: { url: string; filename: string; size: number }[];
}) {
  return (
    <div className={`flex flex-col ${isTenant ? "items-end" : "items-start"}`}>
      <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-300">{author}</span>
        <span>{format(new Date(date), "MMM d, h:mm a")}</span>
      </div>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-6 ${isTenant
            ? "bg-emerald-500/12 text-emerald-50 border border-emerald-500/20"
            : "border border-slate-700/50 bg-slate-800 text-slate-200"
          }`}
      >
        {content}
      </div>
      {attachments && attachments.length > 0 && (
        <div className={`mt-2 flex flex-wrap gap-2 max-w-[88%] ${isTenant ? "justify-end" : "justify-start"}`}>
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

// ── Centered State ────────────────────────────────────────────
function Centered({
  icon, title, description, action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center p-8 text-center">
      {icon}
      <h3 className="mt-3 text-sm font-semibold text-slate-300">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── Create Ticket Modal ───────────────────────────────────────
function CreateTicketModal({
  form, setForm, pending, onClose, onSubmit,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0b1826] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">Create support ticket</h2>
            <p className="mt-1 text-xs text-slate-500">Include enough detail for the team to investigate quickly.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs font-medium text-slate-300">
            Subject *
            <input
              required
              minLength={3}
              maxLength={200}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Cannot publish my website"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
            />
          </label>

          <label className="text-xs font-medium text-slate-300">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option>Technical</option>
              <option>Billing</option>
              <option>Domain</option>
              <option>Website editor</option>
              <option>Account</option>
              <option>Other</option>
            </select>
          </label>

          <label className="text-xs font-medium text-slate-300">
            Priority
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as SupportTicket["priority"] })}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label className="sm:col-span-2 text-xs font-medium text-slate-300">
            Description *
            <textarea
              required
              minLength={10}
              maxLength={5000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the issue: what happened, what you expected, and any error messages."
              className="mt-1.5 h-40 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500"
            />
            <span className="mt-1 block text-right text-[10px] text-slate-600">{form.description.length}/5000</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-sm text-slate-400 hover:text-white"
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
