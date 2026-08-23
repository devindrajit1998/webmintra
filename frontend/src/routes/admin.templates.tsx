import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getTemplates,
  importTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateStatus,
  getTemplateCategories,
} from "@/lib/admin-api";
import { TemplateAnalysis, EditorState } from "@/lib/template-engine/types";
import { ImportWizard } from "@/components/engine/ImportWizard";
import { Editor as InlineVisualEditor } from "@/components/engine/Editor";
import { analyzeTemplate } from "@/lib/template-engine/parser";
import { renderPage } from "@/lib/template-engine/render";
import { TemplateCategoriesManager } from "@/components/engine/TemplateCategoriesManager";
import {
  LayoutTemplate,
  Upload,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Archive,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Pencil,
  Loader2,
  Save,
  Settings,
  FileCode2,
  Plus,
  Sparkles,
  FileText,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { ImageUpload } from "@/components/ui/image-upload";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/templates")({
  component: AdminTemplatesPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-xl py-20 text-center">
      <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-8 shadow-xs">
        <h2 className="text-lg font-bold text-[#0b192c]">
          Something went wrong loading this template
        </h2>
        <p className="mt-2 text-xs font-medium text-[#64748b]">
          {error?.message || "An error occurred while parsing or rendering the template."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-[#059669] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#047857]"
          >
            Try again
          </button>
          <a
            href="/admin/templates"
            className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition hover:bg-[#f8fafc]"
          >
            Back to Templates
          </a>
        </div>
      </div>
    </div>
  ),
});

function AdminTemplatesPage() {
  const queryClient = useQueryClient();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewActivePage, setPreviewActivePage] = useState<string>("index.html");
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isCategoriesManagerOpen, setIsCategoriesManagerOpen] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ["templateCategories"],
    queryFn: () => getTemplateCategories(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["adminTemplates"],
    queryFn: () => getTemplates(),
  });

  const importMutation = useMutation({
    mutationFn: importTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      setIsImportOpen(false);
      toast.success("Template imported successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    category: "",
    thumbnailUrl: "",
    htmlContent: "",
    pages: [] as any[],
  });
  const [activePage, setActivePage] = useState<string>("index.html");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editorPreviewMode, setEditorPreviewMode] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      setEditTemplate(null);
      toast.success("Template updated successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => toggleTemplateStatus(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      toast.success(data?.message || "Template status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update template status"),
  });

  const [inlineVisualTemplate, setInlineVisualTemplate] = useState<any>(null);
  const [templateAnalysis, setTemplateAnalysis] = useState<TemplateAnalysis | null>(null);

  const openVisualEdit = (template: any) => {
    const pages = [];
    if (template.htmlContent) pages.push({ name: "index.html", content: template.htmlContent });
    if (template.pages?.length) {
      pages.push(...template.pages.map((p: any) => ({ name: p.name, content: p.htmlContent })));
    }
    const analysis = analyzeTemplate(pages);
    setTemplateAnalysis(analysis);
    setInlineVisualTemplate(template);
  };

  const handleVisualSave = (state: EditorState) => {
    if (!inlineVisualTemplate || !templateAnalysis) return;

    // Render updated HTML for each page
    const homePage =
      templateAnalysis.pages.find((p) => p.name === "index.html") || templateAnalysis.pages[0];
    const newHomeHtml = homePage
      ? renderPage(templateAnalysis, homePage, state)
      : inlineVisualTemplate.htmlContent;

    const newPages = templateAnalysis.pages
      .filter((p) => p !== homePage)
      .map((p) => ({
        name: p.name,
        htmlContent: renderPage(templateAnalysis, p, state),
      }));

    updateMutation.mutate({
      id: inlineVisualTemplate._id,
      data: {
        title: inlineVisualTemplate.title,
        description: inlineVisualTemplate.description,
        category: inlineVisualTemplate.category,
        thumbnailUrl: inlineVisualTemplate.thumbnailUrl,
        htmlContent: newHomeHtml,
        pages: newPages,
      },
    });
  };

  function openEdit(template: any) {
    setEditTemplate(template);
    setEditData({
      title: template.title,
      description: template.description || "",
      category: template.category,
      thumbnailUrl: template.thumbnailUrl || "",
      htmlContent: template.htmlContent || "",
      pages: template.pages || [],
    });
    setActivePage("index.html");
    setEditorPreviewMode("desktop");
    setIsSettingsOpen(false);
    setIsPreviewModalOpen(false);
  }

  const currentEditorValue =
    activePage === "index.html"
      ? editData.htmlContent
      : editData.pages.find((p) => p.name === activePage)?.htmlContent || "";

  const handleEditorChange = (val: string | undefined) => {
    if (activePage === "index.html") {
      setEditData({ ...editData, htmlContent: val || "" });
    } else {
      setEditData({
        ...editData,
        pages: editData.pages.map((p) =>
          p.name === activePage ? { ...p, htmlContent: val || "" } : p,
        ),
      });
    }
  };

  const [addPagePrompt, setAddPagePrompt] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [deletePagePrompt, setDeletePagePrompt] = useState<string | null>(null);
  const [renamePagePrompt, setRenamePagePrompt] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleAddPage = () => {
    setNewPageName("");
    setAddPagePrompt(true);
  };

  const submitAddPage = () => {
    if (!newPageName) return;
    let name = newPageName.trim();
    if (!name.endsWith(".html")) name += ".html";

    if (name === "index.html" || editData.pages.find((p) => p.name === name)) {
      return toast.error("Page name already exists");
    }
    setEditData({
      ...editData,
      pages: [...editData.pages, { name, htmlContent: "<!-- New Page -->" }],
    });
    setActivePage(name);
    setAddPagePrompt(false);
  };

  const handleRenameClick = (pageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamePagePrompt(pageName);
    setRenameValue(pageName);
  };

  const submitRenamePage = () => {
    if (!renamePagePrompt || !renameValue.trim()) return;
    let newName = renameValue.trim();
    if (!newName.endsWith(".html")) newName += ".html";

    if (newName === renamePagePrompt) {
      setRenamePagePrompt(null);
      return;
    }

    if (newName === "index.html" || editData.pages.some((p) => p.name === newName)) {
      return toast.error("Page name already exists");
    }

    setEditData({
      ...editData,
      pages: editData.pages.map((p) => (p.name === renamePagePrompt ? { ...p, name: newName } : p)),
    });

    if (activePage === renamePagePrompt) {
      setActivePage(newName);
    }
    toast.success(`Renamed to "${newName}"`);
    setRenamePagePrompt(null);
  };

  const handleDeletePage = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletePagePrompt(name);
  };

  const confirmDeletePage = () => {
    if (!deletePagePrompt) return;
    setEditData({
      ...editData,
      pages: editData.pages.filter((p) => p.name !== deletePagePrompt),
    });
    if (activePage === deletePagePrompt) setActivePage("index.html");
    setDeletePagePrompt(null);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      setDeleteTemplateId(null);
      toast.success(data?.message || "Template deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete template");
      setDeleteTemplateId(null);
    },
  });

  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  function confirmDelete() {
    if (deleteTemplateId) {
      deleteMutation.mutate(deleteTemplateId);
    }
  }

  function handleWizardComplete(analysis: TemplateAnalysis, meta?: any) {
    if (!analysis?.pages?.length) return toast.error("No pages found in analysis");

    try {
      const categoriesList =
        categoriesData?.categories || (Array.isArray(categoriesData) ? categoriesData : []);
      const [homePage, ...additionalPages] = analysis.pages;
      const formData = new FormData();
      formData.append("title", meta?.title || analysis.name || "Imported Template");
      formData.append("category", meta?.category || categoriesList?.[0]?.name || "Landing Page");
      formData.append(
        "description",
        meta?.description || `Contains ${analysis.pages.length} page(s).`,
      );
      if (meta?.thumbnailUrl) {
        formData.append("thumbnailUrl", meta.thumbnailUrl);
      }
      formData.append("htmlContent", homePage.html || "");
      formData.append(
        "pages",
        JSON.stringify(
          additionalPages.map((page) => ({
            name: page.name,
            htmlContent: page.html,
          })),
        ),
      );
      formData.append("pageCount", String(analysis.pages.length));
      formData.append("stats", JSON.stringify(analysis.stats || {}));
      const errors = (analysis.issues || []).filter((i) => i.severity === "error").length;
      formData.append("issuesCount", String(errors));

      importMutation.mutate(formData);
    } catch (err: any) {
      toast.error(err.message || "Failed to process template for import");
    }
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">Template Catalog</h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Import and manage templates for your tenants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoriesManagerOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-xs font-bold text-[#334155] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#059669] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] active:scale-95"
          >
            {isImportOpen ? (
              "Close"
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import Template
              </>
            )}
          </button>
        </div>
      </div>

      {isCategoriesManagerOpen && (
        <TemplateCategoriesManager onClose={() => setIsCategoriesManagerOpen(false)} />
      )}

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="border-b border-[#e2e8f0] bg-white shadow-xs">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4 sm:px-10">
              <div>
                <h2 className="text-[#0b192c] font-display font-bold text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#ea580c]" /> Import Template Wizard
                </h2>
                <p className="text-[#64748b] text-xs mt-0.5">
                  Upload HTML files and assets. WebMintra's engine will automatically extract
                  editable fields.
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-[#64748b] hover:text-[#0b192c] bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] transition p-2 rounded-lg shadow-2xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
            <ImportWizard
              categories={
                categoriesData?.categories || (Array.isArray(categoriesData) ? categoriesData : [])
              }
              onComplete={handleWizardComplete}
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-[#64748b]">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
              <p className="text-sm font-medium text-[#64748b]">Loading templates...</p>
            </div>
          </div>
        ) : data?.templates?.length ? (
          data.templates.map((template: any) => (
            <div
              key={template._id}
              className="group flex flex-col rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-xs transition-all duration-300 hover:shadow-md hover:border-[#cbd5e1] hover:-translate-y-1"
            >
              <div className="aspect-[16/9] bg-[#f8fafc] flex items-center justify-center border-b border-[#e2e8f0] relative overflow-hidden">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none bg-white transition-transform duration-700 group-hover:scale-[0.26]">
                    <iframe
                      srcDoc={template.htmlContent}
                      className="w-full h-full border-0 bg-white"
                      tabIndex={-1}
                      aria-hidden="true"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="absolute top-3 left-3 z-10">
                  {template.isActive === false ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 backdrop-blur-md shadow-xs">
                      <EyeOff className="h-3 w-3" /> Archived
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 backdrop-blur-md shadow-xs">
                      <CheckCircle2 className="h-3 w-3" /> Live (Onboarding)
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-base text-[#0f172a] line-clamp-1 group-hover:text-[#059669] transition-colors">
                    {template.title}
                  </h3>
                  <span className="rounded-full border border-emerald-200 bg-[#ecfdf5] px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[#047857] shrink-0">
                    {template.category}
                  </span>
                </div>
                <p className="text-xs font-medium text-[#64748b] mb-4 line-clamp-2 min-h-[32px]">
                  {template.description || "No description provided."}
                </p>

                {template.stats && (
                  <div className="mb-4 flex flex-wrap gap-2 text-[11px] font-medium text-[#475569]">
                    <span className="bg-[#f8fafc] text-[#334155] border border-[#e2e8f0] px-2.5 py-1 rounded-md text-[11px] font-bold">
                      {template.stats["Editable fields"] || 0} fields
                    </span>
                    <span className="bg-[#f8fafc] text-[#334155] border border-[#e2e8f0] px-2.5 py-1 rounded-md text-[11px] font-bold">
                      {template.stats["Forms"] || 0} forms
                    </span>
                    {template.issuesCount > 0 && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md text-[11px] font-bold">
                        {template.issuesCount} errors
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-2.5 pt-3 border-t border-[#e2e8f0]">
                  <button
                    onClick={() => openVisualEdit(template)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#059669] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857] active:scale-98"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Edit Inline (Visual)
                  </button>

                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => openEdit(template)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-[#cbd5e1] bg-white py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] shadow-2xs transition"
                      title="Edit HTML Source Code"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Code
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-[#cbd5e1] bg-white py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] shadow-2xs transition"
                      title="Preview Template"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatusMutation.mutate(template._id);
                      }}
                      disabled={toggleStatusMutation.isPending}
                      className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-bold transition ${
                        template.isActive === false
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }`}
                      title={
                        template.isActive === false
                          ? "Restore to Onboarding"
                          : "Archive (Hide from Onboarding)"
                      }
                    >
                      {template.isActive === false ? (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Restore
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTemplateId(template._id);
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                      title="Delete Template"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-[#64748b] rounded-2xl border border-dashed border-[#cbd5e1] bg-white">
            <LayoutTemplate className="mx-auto h-8 w-8 mb-2 text-[#94a3b8]" />
            <p className="font-medium text-sm">No templates imported yet.</p>
          </div>
        )}
      </div>

      {inlineVisualTemplate && templateAnalysis && (
        <div className="admin-template-editor fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in duration-200">
          <InlineVisualEditor
            analysis={templateAnalysis}
            onExit={() => {
              setInlineVisualTemplate(null);
              setTemplateAnalysis(null);
            }}
            onSaveDraft={(state) => handleVisualSave(state)}
            onPublish={(state) => handleVisualSave(state)}
          />
        </div>
      )}

      {previewTemplate &&
        (() => {
          const pagesList = [
            { name: "index.html", content: previewTemplate.htmlContent || "" },
            ...(previewTemplate.pages || []).map((p: any) => ({
              name: p.name,
              content: p.htmlContent || "",
            })),
          ];
          const activePageObj = pagesList.find((p) => p.name === previewActivePage) || pagesList[0];

          // Inject router bridge script into HTML so internal clicks navigate inside preview
          const injectedScript = `
        <script>
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
          if (href.startsWith('http://') || href.startsWith('https://')) return;
          
          e.preventDefault();
          var targetName = href.replace(/^\\//, '').replace(/\\.html$/, '') + '.html';
          if (href === '/' || href === '/index.html' || href === 'index.html') targetName = 'index.html';
          window.parent.postMessage({ type: 'preview-navigate', targetName: targetName }, '*');
        }, true);
        </script>
        `;
          const previewHtml = activePageObj?.content ? activePageObj.content + injectedScript : "";

          return (
            <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">{previewTemplate.title}</h2>
                    <p className="text-slate-400 text-xs">Live Multi-Page Preview</p>
                  </div>

                  {pagesList.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 shadow-inner">
                      {pagesList.map((p) => {
                        const isActive = previewActivePage === p.name;
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setPreviewActivePage(p.name)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                              isActive
                                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                                : "text-slate-200 hover:text-white hover:bg-slate-800"
                            }`}
                            style={{ color: isActive ? "#020617" : "#cbd5e1" }}
                          >
                            <FileText className="h-3.5 w-3.5 opacity-80" />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button
                      onClick={() => setPreviewMode("desktop")}
                      className={`p-1.5 rounded-md transition-all ${previewMode === "desktop" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Desktop View"
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode("tablet")}
                      className={`p-1.5 rounded-md transition-all ${previewMode === "tablet" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Tablet View"
                    >
                      <Tablet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode("mobile")}
                      className={`p-1.5 rounded-md transition-all ${previewMode === "mobile" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Mobile View"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setPreviewTemplate(null);
                      setPreviewActivePage("index.html");
                      setPreviewMode("desktop");
                    }}
                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition p-2 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex justify-center w-full min-h-0">
                <div
                  className={`h-full rounded-xl overflow-hidden bg-white border border-slate-700 shadow-2xl transition-all duration-300 ${previewMode === "desktop" ? "w-full" : previewMode === "tablet" ? "w-[768px]" : "w-[375px]"}`}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0 bg-white"
                    title="Template Preview"
                    onLoad={(e) => {
                      const iframe = e.currentTarget;
                      const handleMessage = (event: MessageEvent) => {
                        if (event.data?.type === "preview-navigate" && event.data.targetName) {
                          const exists = pagesList.some((p) => p.name === event.data.targetName);
                          if (exists) {
                            setPreviewActivePage(event.data.targetName);
                          } else {
                            toast.error(
                              `Page "${event.data.targetName}" does not exist in this template yet.`,
                            );
                          }
                        }
                      };
                      window.addEventListener("message", handleMessage);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

      {editTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f172a] text-[#0f172a] animate-in fade-in duration-200">
          {/* Indian Tricolor Accent Strip */}
          <div className="flex h-1.5 w-full shrink-0 shadow-sm" aria-hidden="true">
            <span className="flex-1 bg-[#ea580c]" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-[#059669]" />
          </div>

          {/* Top Studio Bar */}
          <div className="flex justify-between items-center px-6 py-3.5 border-b border-[#e2e8f0] bg-white shadow-xs">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setEditTemplate(null)}
                className="text-[#64748b] hover:text-[#0f172a] transition bg-[#f8fafc] hover:bg-[#f1f5f9] p-2 rounded-xl border border-[#e2e8f0] cursor-pointer"
                title="Close Editor"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] shadow-2xs">
                  <FileCode2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[#0f172a] font-display font-extrabold text-sm tracking-tight">
                      {editData.title}
                    </h2>
                    <span className="rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-0.5 text-[9px] font-extrabold text-[#065f46]">
                      {editData.category || "Template"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" />
                    <span>HTML Template Code Studio</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-xs font-extrabold text-[#c2410c] transition hover:bg-[#ea580c] hover:text-white cursor-pointer shadow-2xs"
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-xs font-extrabold text-[#334155] transition hover:bg-[#f1f5f9] hover:text-[#0f172a] cursor-pointer shadow-2xs"
              >
                <Settings className="h-3.5 w-3.5 text-[#64748b]" /> Metadata
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate({ id: editTemplate._id, data: editData })}
                disabled={updateMutation.isPending}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#059669] text-xs font-extrabold text-white shadow-xs transition hover:bg-[#047857] disabled:opacity-50 min-w-[130px] cursor-pointer"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* File Sidebar */}
            <div className="w-64 bg-[#f8fafc] border-r border-[#e2e8f0] flex flex-col">
              <div className="p-3.5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
                <span className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider">
                  Pages & Files
                </span>
                <div className="flex items-center gap-1.5">
                  <label
                    className="cursor-pointer text-[#64748b] hover:text-[#059669] p-1.5 rounded-lg hover:bg-[#f1f5f9] transition"
                    title="Import HTML File"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept=".html,.htm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = (event.target?.result as string) || "";
                          let name = file.name;
                          if (!name.endsWith(".html")) name += ".html";
                          if (name === "index.html") {
                            setEditData({ ...editData, htmlContent: content });
                            setActivePage("index.html");
                            toast.success("Imported into index.html");
                          } else {
                            const existing = editData.pages.find((p) => p.name === name);
                            if (existing) {
                              setEditData({
                                ...editData,
                                pages: editData.pages.map((p) =>
                                  p.name === name ? { ...p, htmlContent: content } : p,
                                ),
                              });
                            } else {
                              setEditData({
                                ...editData,
                                pages: [...editData.pages, { name, htmlContent: content }],
                              });
                            }
                            setActivePage(name);
                            toast.success(`Imported page "${name}"`);
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPage}
                    className="text-[#64748b] hover:text-[#059669] p-1.5 rounded-lg hover:bg-[#f1f5f9] transition cursor-pointer"
                    title="Add Blank Page"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <div
                  onClick={() => setActivePage("index.html")}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                    activePage === "index.html"
                      ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] shadow-2xs"
                      : "text-[#64748b] hover:bg-white hover:text-[#0f172a] border border-transparent"
                  }`}
                >
                  <FileCode2 className="h-4 w-4 shrink-0 text-[#059669]" />
                  <span className="truncate">index.html</span>
                  <span className="ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#059669] text-white">
                    Home
                  </span>
                </div>
                {editData.pages.map((page) => (
                  <div
                    key={page.name}
                    onClick={() => setActivePage(page.name)}
                    className={`flex items-center justify-between gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                      activePage === page.name
                        ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] shadow-2xs"
                        : "text-[#64748b] hover:bg-white hover:text-[#0f172a] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
                      <FileCode2 className="h-4 w-4 shrink-0 text-[#64748b]" />
                      <span className="truncate">{page.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleRenameClick(page.name, e)}
                        className="text-[#64748b] hover:text-[#059669] p-1 rounded-md hover:bg-white transition"
                        title="Rename Page"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePage(page.name, e)}
                        className="text-[#64748b] hover:text-rose-600 p-1 rounded-md hover:bg-white transition"
                        title="Delete Page"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-[#1e1e1e] flex flex-col min-w-0">
              <div className="px-5 py-2.5 bg-[#121824] border-b border-[#1e293b] text-xs font-mono text-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ea580c] animate-pulse" />
                  <span className="font-bold text-white font-mono">{activePage}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#059669]/15 border border-[#059669]/40 text-[#10b981] text-[11px] font-sans font-extrabold shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  <span>Monaco Code Editor</span>
                </div>
              </div>

              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  theme="vs-dark"
                  value={currentEditorValue}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    formatOnPaste: true,
                  }}
                />
              </div>
            </div>
          </div>

          {isPreviewModalOpen && (
            <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">{editData.title}</h2>
                    <p className="text-slate-400 text-xs">Live Multi-Page Preview</p>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setActivePage("index.html")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                        activePage === "index.html"
                          ? "bg-cyan-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      index.html
                    </button>
                    {editData.pages.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setActivePage(p.name)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          activePage === p.name
                            ? "bg-cyan-500 text-slate-950 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                    <button
                      onClick={() => setEditorPreviewMode("desktop")}
                      className={`p-1.5 rounded-md transition-all ${editorPreviewMode === "desktop" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Desktop View"
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditorPreviewMode("tablet")}
                      className={`p-1.5 rounded-md transition-all ${editorPreviewMode === "tablet" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Tablet View"
                    >
                      <Tablet className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditorPreviewMode("mobile")}
                      className={`p-1.5 rounded-md transition-all ${editorPreviewMode === "mobile" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                      title="Mobile View"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition p-2 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex justify-center w-full overflow-hidden min-h-0">
                <div
                  className={`h-full rounded-xl overflow-hidden bg-white border border-slate-700 shadow-2xl transition-all duration-300 ${editorPreviewMode === "desktop" ? "w-full" : editorPreviewMode === "tablet" ? "w-[768px]" : "w-[375px]"}`}
                >
                  <iframe
                    srcDoc={
                      currentEditorValue +
                      `
                      <script>
                      document.addEventListener('click', function(e) {
                        var a = e.target.closest('a');
                        if (!a) return;
                        var href = a.getAttribute('href');
                        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
                        if (href.startsWith('http://') || href.startsWith('https://')) return;
                        
                        e.preventDefault();
                        var targetName = href.replace(/^\\//, '').replace(/\\.html$/, '') + '.html';
                        if (href === '/' || href === '/index.html' || href === 'index.html') targetName = 'index.html';
                        window.parent.postMessage({ type: 'editor-preview-navigate', targetName: targetName }, '*');
                      }, true);
                      </script>
                      `
                    }
                    className="w-full h-full border-0 bg-white"
                    title="Editor Live Preview"
                    onLoad={() => {
                      const handleMessage = (event: MessageEvent) => {
                        if (
                          event.data?.type === "editor-preview-navigate" &&
                          event.data.targetName
                        ) {
                          const target = event.data.targetName;
                          if (
                            target === "index.html" ||
                            editData.pages.some((p) => p.name === target)
                          ) {
                            setActivePage(target);
                          } else {
                            toast.error(`Page "${target}" does not exist in this template.`);
                          }
                        }
                      };
                      window.addEventListener("message", handleMessage);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {isSettingsOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 p-4">
              <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl animate-in zoom-in-95">
                {/* Indian Tricolor Accent Strip */}
                <div className="flex h-1.5 w-full shrink-0" aria-hidden="true">
                  <span className="flex-1 bg-[#ea580c]" />
                  <span className="flex-1 bg-white" />
                  <span className="flex-1 bg-[#059669]" />
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                        <Settings className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-display font-extrabold text-[#0f172a]">
                          Template Metadata
                        </h2>
                        <p className="text-[11px] text-[#64748b] font-medium">
                          Update title, category, and preview image
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="rounded-xl p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-extrabold text-[#0f172a] block mb-1.5">
                        Template Title
                      </label>
                      <input
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:bg-white transition"
                        placeholder="e.g. StreetCraft — Sizzling Kitchen"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-[#0f172a] block mb-1.5">
                        Category
                      </label>
                      <Select
                        value={editData.category}
                        onValueChange={(value) => setEditData({ ...editData, category: value })}
                      >
                        <SelectTrigger className="w-full rounded-xl border-[#e2e8f0] bg-[#f8fafc] text-xs font-bold text-[#0f172a] focus:ring-[#059669] h-10">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#e2e8f0] text-[#0f172a] shadow-xl">
                          {categoriesData?.categories?.map((cat: any) => (
                            <SelectItem
                              key={cat._id}
                              value={cat.name}
                              className="text-xs font-medium focus:bg-[#ecfdf5] focus:text-[#065f46]"
                            >
                              {cat.name}
                            </SelectItem>
                          ))}
                          {editData.category &&
                            !categoriesData?.categories?.some(
                              (c: any) => c.name === editData.category,
                            ) && (
                              <SelectItem
                                value={editData.category}
                                className="text-xs font-medium focus:bg-[#ecfdf5] focus:text-[#065f46]"
                              >
                                {editData.category}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-[#0f172a] block mb-1.5">
                        Thumbnail Preview
                      </label>
                      <ImageUpload
                        value={editData.thumbnailUrl}
                        onChange={(url) => setEditData({ ...editData, thumbnailUrl: url })}
                        placeholder="Upload or paste image URL"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-[#0f172a] block mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:bg-white min-h-[75px] resize-none transition"
                        placeholder="Short description..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-[#f1f5f9]">
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(false)}
                      className="px-5 py-2 rounded-xl bg-[#059669] text-xs font-extrabold text-white shadow-xs hover:bg-[#047857] transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Page Modal Dialog */}
          {addPagePrompt && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-[#0b192c] flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#ea580c]" /> Add New Page
                  </h3>
                  <button
                    onClick={() => setAddPagePrompt(false)}
                    className="text-[#64748b] hover:text-[#0b192c] transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#475569] block mb-1.5">
                      Page Name
                    </label>
                    <input
                      autoFocus
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitAddPage();
                      }}
                      placeholder="e.g. services.html"
                      className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 text-xs font-medium text-[#0b192c] placeholder:text-[#94a3b8] focus:border-[#ea580c] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]/10"
                    />
                    <p className="text-[11px] text-[#64748b] mt-1.5">
                      Will automatically append{" "}
                      <span className="font-mono font-semibold text-[#ea580c]">.html</span> if
                      omitted.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddPagePrompt(false)}
                    className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0b192c]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitAddPage}
                    className="inline-flex h-9 items-center rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857]"
                  >
                    Create Page
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Page Confirmation Dialog */}
          {deletePagePrompt && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl animate-in zoom-in-95">
                <div className="flex items-center gap-3 mb-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0b192c]">Delete Page</h3>
                    <p className="text-[11px] font-medium text-[#64748b]">Remove from template</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#475569] mb-6 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-[#0b192c] font-mono">"{deletePagePrompt}"</span>?
                  Any unsaved edits for this page will be discarded.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletePagePrompt(null)}
                    className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePage}
                    className="h-9 rounded-xl bg-[#e11d48] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#be123c]"
                  >
                    Delete Page
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rename Page Modal Dialog */}
          {renamePagePrompt && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-[#0b192c] flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-[#ea580c]" /> Rename Page
                  </h3>
                  <button
                    onClick={() => setRenamePagePrompt(null)}
                    className="text-[#64748b] hover:text-[#0b192c] transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#475569] block mb-1.5">
                      New Page Name
                    </label>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitRenamePage();
                      }}
                      placeholder="e.g. portfolio.html"
                      className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 text-xs font-medium text-[#0b192c] placeholder:text-[#94a3b8] focus:border-[#ea580c] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ea580c]/10"
                    />
                    <p className="text-[11px] text-[#64748b] mt-1.5">
                      Will automatically append{" "}
                      <span className="font-mono font-semibold text-[#ea580c]">.html</span> if
                      omitted.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRenamePagePrompt(null)}
                    className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitRenamePage}
                    className="inline-flex h-9 items-center rounded-xl bg-[#059669] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857]"
                  >
                    Save Name
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={!!deleteTemplateId}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#fecdd3] bg-[#fff1f2] text-[#e11d48]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-[#0b192c]">
                  Delete Template
                </AlertDialogTitle>
                <p className="text-[11px] font-medium text-[#64748b]">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs font-medium text-[#475569] leading-relaxed pt-2">
              Are you sure you want to delete this template from the catalog? Tenants currently
              using this template won't be disrupted, but it will no longer be available for new
              sites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <AlertDialogCancel className="h-9 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0b192c]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="inline-flex h-9 items-center rounded-xl bg-[#e11d48] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#be123c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e11d48]"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
