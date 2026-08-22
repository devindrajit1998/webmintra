import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenantContext } from "@/components/TenantDashboard";
import { deleteWebsiteForm, getWebsiteForms, type FormSubmission } from "@/lib/auth-api";
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

  const activeWebsiteId = selectedWebsiteId || websites[0]?.id || "";
  const queryKey = ["website-forms", activeWebsiteId];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => getWebsiteForms(activeWebsiteId),
    enabled: Boolean(activeWebsiteId),
  });

  const forms = useMemo(() => data?.forms ?? [], [data?.forms]);
  const columns = useMemo(
    () => Array.from(new Set(forms.flatMap((submission) => Object.keys(submission.data ?? {})))),
    [forms],
  );

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
                        {formatValue(submission.data[column])}
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
                onClick={() => setViewSubmission(null)}
                aria-label="Close submission details"
                className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-5 grid gap-3">
              {Object.entries(viewSubmission.data).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">
                    {key.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-xs font-bold text-[#0f172a]">
                    {displayValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
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
