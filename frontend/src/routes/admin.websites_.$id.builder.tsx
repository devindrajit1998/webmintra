import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getAdminWebsiteEditor, saveAdminWebsiteDraft, publishAdminWebsite } from "@/lib/admin-api";
import { uploadWebsiteImage } from "@/lib/auth-api";
import { Editor } from "@/components/engine/Editor";
import { analyzeTemplate } from "@/lib/template-engine/parser";
import { TemplateAnalysis, EditorState } from "@/lib/template-engine/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/websites_/$id/builder")({
  component: AdminWebsiteBuilderPage,
});

function AdminWebsiteBuilderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["adminWebsiteEditor", id],
    queryFn: () => getAdminWebsiteEditor(id),
  });

  useEffect(() => {
    if (data?.htmlContent || data?.pages) {
      const pages = [];
      if (data.htmlContent) pages.push({ name: "index.html", content: data.htmlContent });
      if (data.pages?.length) {
        pages.push(...data.pages.map((p: any) => ({ name: p.name, content: p.htmlContent })));
      }
      setAnalysis(analyzeTemplate(pages));
    }
  }, [data?.htmlContent, data?.pages]);

  const saveMutation = useMutation({
    mutationFn: (state: EditorState) => saveAdminWebsiteDraft(id, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWebsiteEditor", id] });
      queryClient.invalidateQueries({ queryKey: ["adminWebsites"] });
      toast.success("Draft saved (Admin mode)");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save draft"),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishAdminWebsite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWebsiteEditor", id] });
      queryClient.invalidateQueries({ queryKey: ["adminWebsites"] });
      toast.success("Website published successfully! (Admin mode)");
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish website"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050B14]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050B14] text-slate-400">
        Parsing template...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Editor
        analysis={analysis}
        initialState={data.website.draftState}
        entitlements={data.seoEntitlements?.seoFeatures}
        onExit={() => navigate({ to: "/admin/websites" })}
        onSaveDraft={(state) => saveMutation.mutate(state)}
        onPublish={(state) => {
          saveMutation.mutateAsync(state).then(() => publishMutation.mutate());
        }}
        onUploadImage={async (file) => {
          const res = await uploadWebsiteImage(id, file);
          return res.url;
        }}
      />
    </div>
  );
}
