import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getWebsite, saveDraft, publishWebsite, uploadWebsiteImage } from "@/lib/auth-api";
import { Editor } from "@/components/engine/Editor";
import { analyzeTemplate } from "@/lib/template-engine/parser";
import { TemplateAnalysis, EditorState } from "@/lib/template-engine/types";
import { Loader2 } from "lucide-react";

import { toast } from "sonner";
export const Route = createFileRoute("/tenant_/builder/$id")({
  component: BuilderPage,
});

function BuilderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [analysis, setAnalysis] = useState<TemplateAnalysis | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website", id],
    queryFn: () => getWebsite(id),
  });

  useEffect(() => {
    if (data?.htmlContent || data?.pages) {
      // Analyze the raw HTML strings into the structure the Editor needs
      const pages = [];
      if (data.htmlContent) pages.push({ name: "index.html", content: data.htmlContent });
      if (data.pages?.length) {
        pages.push(...data.pages.map((p) => ({ name: p.name, content: p.htmlContent })));
      }
      setAnalysis(analyzeTemplate(pages));
    }
  }, [data?.htmlContent, data?.pages]);

  const saveMutation = useMutation({
    mutationFn: (state: EditorState) => saveDraft(id, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website", id] });
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      console.log("Draft saved successfully.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishWebsite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website", id] });
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast.success("Website published successfully!");
    },
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
        entitlements={data.seoEntitlements.seoFeatures}
        onExit={() => navigate({ to: "/tenant" })}
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
