import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenantContext } from "@/components/TenantDashboard";
import {
  deleteWebsiteForm,
  getWebsiteForms,
  sendTenantWhatsAppMessage,
  type FormSubmission,
} from "@/lib/auth-api";
import { format } from "date-fns";
import {
  Copy,
  Download,
  Eye,
  FileText,
  Globe2,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Trash2,
  X,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/tenant/forms")({
  component: FormsPage,
  head: () => ({ meta: [{ title: "Forms | WebMintra" }] }),
});

function FormsPage() {
  const { websites } = useTenantContext();
  const queryClient = useQueryClient();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [viewSubmission, setViewSubmission] = useState<FormSubmission | null>(null);
  const [deleteSubmission, setDeleteSubmission] = useState<FormSubmission | null>(null);
  const [whatsappLead, setWhatsappLead] = useState<FormSubmission | null>(null);
  const [followupMessage, setFollowupMessage] = useState("");

  const activeWebsiteId = selectedWebsiteId || websites[0]?.id || "";
  const queryKey = ["website-forms", activeWebsiteId];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => getWebsiteForms(activeWebsiteId),
    enabled: Boolean(activeWebsiteId),
  });

  const forms = useMemo(() => data?.forms ?? [], [data?.forms]);
  const columns = useMemo(() => {
    const keys = new Set<string>();
    forms.forEach((submission) => {
      // 1. Keys from the submission.data object
      if (submission.data && typeof submission.data === "object") {
        Object.keys(submission.data).forEach((k) => keys.add(k));
      }
      // 2. Fallbacks if data object is empty but top-level fields exist
      if (submission.contactName) keys.add("name");
      if (submission.contactPhone) keys.add("phone");
      if (submission.contactEmail) keys.add("email");
    });
    const arr = Array.from(keys);
    // If no keys could be found, provide standard fallback columns
    if (arr.length === 0 && forms.length > 0) {
      return ["name", "phone", "email"];
    }
    return arr;
  }, [forms]);

  function getFieldValue(submission: FormSubmission, col: string) {
    if (
      submission.data &&
      typeof submission.data === "object" &&
      submission.data[col] !== undefined
    ) {
      return submission.data[col];
    }
    const lk = col.toLowerCase();
    if (lk === "name" || lk === "fullname" || lk === "contactname")
      return submission.contactName || "-";
    if (lk === "phone" || lk === "mobile" || lk === "whatsapp" || lk === "contactphone") {
      return submission.contactPhone ? `+${submission.contactPhone}` : "-";
    }
    if (lk === "email" || lk === "contactemail") return submission.contactEmail || "-";
    return null;
  }

  const deleteMutation = useMutation({
    mutationFn: (submissionId: string) => deleteWebsiteForm(activeWebsiteId, submissionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteSubmission(null);
      toast.success(result.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function copySubmission(submission: FormSubmission) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(submission.data, null, 2));
      toast.success("Submission copied to clipboard.");
    } catch {
      toast.error("Clipboard access is unavailable.");
    }
  }

  function downloadSubmission(submission: FormSubmission) {
    const content = JSON.stringify(
      {
        id: submission._id,
        submittedAt: submission.createdAt,
        source: submission.source,
        data: submission.data,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `form-submission-${submission._id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
              <FileText className="h-3.5 w-3.5" /> Customer Inquiries
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
              Form Submissions
            </h1>
            <p className="mt-1 text-sm text-[#64748b]">
              View, copy, export, and manage leads and contact forms submitted across your website.
            </p>
          </div>

          {websites.length > 0 && (
            <div className="flex items-center gap-2.5">
              <Globe2 className="h-4 w-4 text-[#059669]" />
              <select
                value={activeWebsiteId}
                onChange={(event) => setSelectedWebsiteId(event.target.value)}
                className="h-10 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs font-bold text-[#0f172a] outline-none transition focus:border-[#059669] cursor-pointer"
              >
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>
                    {website.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {websites.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-12 w-12 text-[#cbd5e1]" />}
          title="No Websites Found"
          description="Create a website first to start receiving form submissions."
        />
      ) : isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
        </div>
      ) : isError ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-[#fecdd3] bg-[#fff1f2] p-6 text-center">
          <p className="text-xs font-bold text-[#e11d48]">Unable to load form submissions.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-[#059669] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-[#cbd5e1]" />}
          title="No Submissions Yet"
          description="When visitors submit contact forms or lead capture widgets on your website, they will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0f172a]">
              <thead className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#64748b]">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4">Date & Time</th>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-6 py-4">
                      {column.replaceAll("_", " ")}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-6 py-4 text-right">Submission ID</th>
                  <th className="whitespace-nowrap px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {forms.map((submission) => (
                  <tr key={submission._id} className="transition-colors hover:bg-[#f8fafc]">
                    <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold text-[#64748b]">
                      {format(new Date(submission.createdAt), "MMM d, yyyy h:mm a")}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column}
                        className="max-w-xs truncate px-6 py-4 text-xs font-bold text-[#0f172a]"
                      >
                        {formatValue(getFieldValue(submission, column))}
                      </td>
                    ))}

                    <td className="whitespace-nowrap px-6 py-4 text-right text-xs">
                      <span className="font-mono font-bold text-[#64748b]">
                        #{submission._id.slice(-8)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for submission ${submission._id}`}
                            className="rounded-lg p-2 text-[#64748b] transition-colors hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="border-[#e2e8f0] bg-white text-[#0f172a] shadow-xl"
                        >
                          <DropdownMenuItem
                            onSelect={() => {
                              setWhatsappLead(submission);
                              const name = submission.contactName || "there";
                              setFollowupMessage(
                                `Hi ${name}, this is regarding your recent enquiry on our website. How can we assist you today?`,
                              );
                            }}
                            className="text-[#059669] focus:bg-[#ecfdf5] focus:text-[#047857] cursor-pointer font-bold"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" /> Follow up on WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setViewSubmission(submission)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4 text-[#059669]" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => copySubmission(submission)}
                            className="cursor-pointer"
                          >
                            <Copy className="mr-2 h-4 w-4 text-[#0284c7]" /> Copy JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => downloadSubmission(submission)}
                            className="cursor-pointer"
                          >
                            <Download className="mr-2 h-4 w-4 text-[#ea580c]" /> Download JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setDeleteSubmission(submission)}
                            className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WhatsApp Follow-up Modal */}
      {whatsappLead && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/60 p-4 backdrop-blur-xs">
          <section className="w-full max-w-lg rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-[#f1f5f9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#0f172a]">
                    WhatsApp Lead Follow-up
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Send a direct message to this customer from your linked WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappLead(null)}
                className="rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const phone =
                  whatsappLead.contactPhone ||
                  (Object.values(whatsappLead.data || {}).find(
                    (v) => typeof v === "string" && /\d{10}/.test(v),
                  ) as string);

                if (!phone) {
                  toast.error("No valid phone number found in this lead submission.");
                  return;
                }

                try {
                  await sendTenantWhatsAppMessage({
                    leadId: whatsappLead._id,
                    recipient: phone,
                    message: followupMessage.trim(),
                  });
                  toast.success(`Message queued for delivery to +${phone}!`);
                  setWhatsappLead(null);
                } catch (err: any) {
                  toast.error(err.message || "Failed to send follow-up message.");
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1">
                  Recipient Contact
                </label>
                <div className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-xs font-mono font-bold text-[#0f172a]">
                  {whatsappLead.contactPhone ||
                    whatsappLead.contactName ||
                    `Lead #${whatsappLead._id.slice(-8)}`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f172a] mb-1">Message Text</label>
                <textarea
                  rows={4}
                  required
                  value={followupMessage}
                  onChange={(e) => setFollowupMessage(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] p-3 text-xs text-[#0f172a] outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappLead(null)}
                  className="rounded-xl border border-[#cbd5e1] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!followupMessage.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> Send Message
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {viewSubmission && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/60 p-4 backdrop-blur-xs">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-[#f1f5f9] pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0f172a]">Submission Details</h2>
                <p className="mt-0.5 font-mono text-xs font-bold text-[#64748b]">
                  {viewSubmission._id}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setViewSubmission(null)}
                className="rounded-lg p-2 text-[#64748b] transition-colors hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="font-bold text-[#64748b]">Submitted:</span>{" "}
                  <span className="font-semibold text-[#0f172a]">
                    {format(new Date(viewSubmission.createdAt), "PPP p")}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#64748b]">Source:</span>{" "}
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono font-bold text-[#059669] border border-[#e2e8f0]">
                    {viewSubmission.source || "public_site"}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748b]">
                  Form Fields
                </h3>
                <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
                  <table className="min-w-full divide-y divide-[#f1f5f9] text-left text-xs">
                    <tbody className="divide-y divide-[#f1f5f9] bg-white">
                      {viewSubmission.contactName && (
                        <tr>
                          <td className="w-1/3 bg-[#f8fafc] px-4 py-2.5 font-bold text-[#475569]">
                            Contact Name
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[#0f172a]">
                            {viewSubmission.contactName}
                          </td>
                        </tr>
                      )}
                      {viewSubmission.contactPhone && (
                        <tr>
                          <td className="w-1/3 bg-[#f8fafc] px-4 py-2.5 font-bold text-[#475569]">
                            WhatsApp Phone
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-[#059669]">
                            +{viewSubmission.contactPhone}
                          </td>
                        </tr>
                      )}
                      {viewSubmission.contactEmail && (
                        <tr>
                          <td className="w-1/3 bg-[#f8fafc] px-4 py-2.5 font-bold text-[#475569]">
                            Contact Email
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[#0f172a]">
                            {viewSubmission.contactEmail}
                          </td>
                        </tr>
                      )}
                      {Object.entries(viewSubmission.data ?? {}).map(([key, val]) => (
                        <tr key={key}>
                          <td className="w-1/3 bg-[#f8fafc] px-4 py-2.5 font-bold text-[#475569]">
                            {key.replaceAll("_", " ")}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[#0f172a]">
                            {displayValue(val)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteSubmission)}
        onOpenChange={(open) => !open && setDeleteSubmission(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete form submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes submission #{deleteSubmission?._id.slice(-8)}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteSubmission && deleteMutation.mutate(deleteSubmission._id)}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete submission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-8 text-center shadow-xs">
      {icon}
      <h3 className="mt-4 font-display text-base font-extrabold text-[#0f172a]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#64748b]">{description}</p>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "")
    return <span className="text-[#94a3b8]">-</span>;
  return displayValue(value);
}

function displayValue(value: unknown) {
  return typeof value === "object" && value !== null
    ? JSON.stringify(value, null, 2)
    : String(value);
}
