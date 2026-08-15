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
    <div className="max-w-[1600px] space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Form Submissions
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            View, export, copy, and delete submissions from your websites.
          </p>
        </div>

        {websites.length > 0 && (
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-slate-400" />
            <select
              value={activeWebsiteId}
              onChange={(event) => setSelectedWebsiteId(event.target.value)}
              className="rounded-lg border border-slate-800 bg-[#0b1826] px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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

      {websites.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-12 w-12 text-slate-700" />}
          title="No Websites Found"
          description="Create a website first to start receiving form submissions."
        />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      ) : isError ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 text-center">
          <p className="text-sm text-rose-200">Unable to load form submissions.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
          >
            Retry
          </button>
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-slate-700" />}
          title="No Submissions Yet"
          description="When visitors submit forms on your website, they will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1826] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0d1c2d] text-xs uppercase text-slate-400">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4 font-semibold">Date & Time</th>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-6 py-4 font-semibold">
                      {column.replaceAll("_", " ")}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">
                    Submission ID
                  </th>
                  <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {forms.map((submission) => (
                  <tr key={submission._id} className="transition-colors hover:bg-[#0d1c2d]/50">
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-400">
                      {format(new Date(submission.createdAt), "MMM d, yyyy h:mm a")}
                    </td>
                    {columns.map((column) => (
                      <td key={column} className="max-w-xs truncate px-6 py-4 text-slate-200">
                        {formatValue(submission.data[column])}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-6 py-4 text-right text-xs">
                      <span className="font-mono text-slate-500">#{submission._id.slice(-8)}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for submission ${submission._id}`}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="border-slate-700 bg-slate-900 text-slate-200"
                        >
                          <DropdownMenuItem onSelect={() => setViewSubmission(submission)}>
                            <Eye className="mr-2 h-4 w-4" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => copySubmission(submission)}>
                            <Copy className="mr-2 h-4 w-4" /> Copy JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => downloadSubmission(submission)}>
                            <Download className="mr-2 h-4 w-4" /> Download JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setDeleteSubmission(submission)}
                            className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1826] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Submission details</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{viewSubmission._id}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewSubmission(null)}
                aria-label="Close submission details"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-6 grid gap-3">
              {Object.entries(viewSubmission.data).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {key.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
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
    <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0b1826]/50 text-center">
      {icon}
      <h3 className="mt-4 font-display text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "")
    return <span className="text-slate-600">-</span>;
  return displayValue(value);
}

function displayValue(value: unknown) {
  return typeof value === "object" && value !== null
    ? JSON.stringify(value, null, 2)
    : String(value);
}
