import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getTemplates, importTemplate, updateTemplate, deleteTemplate } from "@/lib/admin-api";
import { TemplateAnalysis, EditorState } from "@/lib/template-engine/types";
import { analyzeTemplate } from "@/lib/template-engine/parser";
import { renderPage } from "@/lib/template-engine/render";
import { Editor as InlineVisualEditor } from "@/components/engine/Editor";
import { ImportWizard } from "@/components/engine/ImportWizard";
import { LayoutTemplate, Upload, Trash2, CheckCircle2, Eye, X, Monitor, Tablet, Smartphone, Pencil, Loader2, Save, Settings, FileCode2, Plus, Sparkles } from "lucide-react";
import MonacoEditor from "@monaco-editor/react";
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

export const Route = createFileRoute("/admin/templates")({
  component: AdminTemplatesPage,
  errorComponent: ({ error, reset }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <h2 className="text-xl font-bold text-rose-400 mb-2">Error in Templates</h2>
      <p className="text-sm text-slate-400 mb-4 max-w-md font-mono bg-slate-900 p-3 rounded-lg border border-slate-800">
        {error?.message || String(error)}
      </p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
      >
        Retry
      </button>
    </div>
  ),
});

function AdminTemplatesPage() {
  const queryClient = useQueryClient();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

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
  const [editData, setEditData] = useState({ title: "", description: "", category: "", thumbnailUrl: "", htmlContent: "", pages: [] as any[] });
  const [activePage, setActivePage] = useState<string>("index.html");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editorPreviewMode, setEditorPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      setEditTemplate(null);
      toast.success("Template updated successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const [inlineVisualTemplate, setInlineVisualTemplate] = useState<any>(null);
  const [templateAnalysis, setTemplateAnalysis] = useState<TemplateAnalysis | null>(null);

  const openVisualEdit = (template: any) => {
    try {
      const pages = [];
      const html = template.htmlContent || "<!DOCTYPE html><html><head><title>Template</title></head><body><main><h1>Welcome</h1></main></body></html>";
      pages.push({ name: "index.html", content: html });
      if (Array.isArray(template.pages)) {
        template.pages.forEach((p: any) => {
          if (p?.name && p?.htmlContent) {
            pages.push({ name: p.name, content: p.htmlContent });
          }
        });
      }
      const analysis = analyzeTemplate(pages, [], template.title || "Template");
      setTemplateAnalysis(analysis);
      setInlineVisualTemplate(template);
    } catch (err: any) {
      toast.error("Failed to parse template: " + (err?.message || "Unknown error"));
    }
  };

  const handleVisualSave = (state: EditorState) => {
    if (!inlineVisualTemplate || !templateAnalysis) return;

    // Render updated HTML for each page
    const homePage = templateAnalysis.pages.find((p) => p.name === "index.html") || templateAnalysis.pages[0];
    const newHomeHtml = homePage ? renderPage(templateAnalysis, homePage, state) : inlineVisualTemplate.htmlContent;

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
      pages: template.pages || []
    });
    setActivePage("index.html");
    setEditorPreviewMode("desktop");
    setIsSettingsOpen(false);
    setIsPreviewModalOpen(false);
  }

  const currentEditorValue = activePage === "index.html" 
    ? editData.htmlContent 
    : editData.pages.find(p => p.name === activePage)?.htmlContent || "";

  const handleEditorChange = (val: string | undefined) => {
    if (activePage === "index.html") {
      setEditData({ ...editData, htmlContent: val || "" });
    } else {
      setEditData({
        ...editData,
        pages: editData.pages.map(p => p.name === activePage ? { ...p, htmlContent: val || "" } : p)
      });
    }
  };

  const [addPagePrompt, setAddPagePrompt] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [deletePagePrompt, setDeletePagePrompt] = useState<string | null>(null);

  const handleAddPage = () => {
    setNewPageName("");
    setAddPagePrompt(true);
  };

  const submitAddPage = () => {
    if (!newPageName) return;
    let name = newPageName.trim();
    if (!name.endsWith(".html")) name += ".html";

    if (name === "index.html" || editData.pages.find(p => p.name === name)) {
      return toast.error("Page name already exists");
    }
    setEditData({
      ...editData,
      pages: [...editData.pages, { name, htmlContent: "<!-- New Page -->" }]
    });
    setActivePage(name);
    setAddPagePrompt(false);
  };

  const handleDeletePage = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletePagePrompt(name);
  };

  const confirmDeletePage = () => {
    if (!deletePagePrompt) return;
    setEditData({
      ...editData,
      pages: editData.pages.filter(p => p.name !== deletePagePrompt)
    });
    if (activePage === deletePagePrompt) setActivePage("index.html");
    setDeletePagePrompt(null);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      setDeleteTemplateId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  function confirmDelete() {
    if (deleteTemplateId) {
      deleteMutation.mutate(deleteTemplateId);
    }
  }

  function handleWizardComplete(analysis: TemplateAnalysis) {
    if (!analysis.pages.length) return toast.error("No pages found in analysis");

    const formData = new FormData();
    formData.append("title", analysis.name || "Imported Template");
    formData.append("category", "Imported");
    formData.append("description", `Contains ${analysis.pages.length} pages.`);
    
    // We send the first page's HTML as the main template content for now
    formData.append("htmlContent", analysis.pages[0].html);
    
    formData.append("stats", JSON.stringify(analysis.stats));
    const errors = analysis.issues.filter(i => i.severity === "error").length;
    formData.append("issuesCount", String(errors));

    importMutation.mutate(formData);
  }



  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Template Catalog</h1>
          <p className="mt-1 text-xs text-slate-500">Import and manage templates for your tenants.</p>
        </div>
        <button 
          onClick={() => setIsImportOpen(!isImportOpen)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-400"
        >
          {isImportOpen ? "Close" : <><Upload className="h-4 w-4" /> Import Template</>}
        </button>
      </div>

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-[#0b1826]/90 backdrop-blur">
            <div>
              <h2 className="text-white font-display font-bold text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-cyan-400" /> Import Template Wizard</h2>
              <p className="text-slate-400 text-xs mt-0.5">Upload HTML files and assets. WebMintra's engine will automatically extract editable fields.</p>
            </div>
            <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition p-2 rounded-full"><X className="h-5 w-5"/></button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0b1826] to-slate-950">
            <ImportWizard onComplete={handleWizardComplete} />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-10 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-3 py-8"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /><p className="text-sm text-slate-500">Loading templates...</p></div></div>
        ) : data?.templates?.length ? (
          data.templates.map((template: any) => (
            <div key={template._id} className="group flex flex-col rounded-xl border border-slate-800 bg-[#0b1826] overflow-hidden transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:-translate-y-1">
              <div className="aspect-[16/9] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-b border-slate-800 relative overflow-hidden">
                {template.thumbnailUrl ? (
                  <img src={template.thumbnailUrl} alt={template.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none bg-white transition-transform duration-700 group-hover:scale-[0.26]">
                    <iframe srcDoc={template.htmlContent} className="w-full h-full border-0 bg-white" tabIndex={-1} aria-hidden="true" loading="lazy" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1826]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteTemplateId(template._id); }} 
                    className="bg-rose-500/90 text-white p-2 rounded-lg hover:bg-rose-600 transition shadow-lg backdrop-blur"
                    title="Delete Template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold text-slate-200 line-clamp-1">{template.title}</h3>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-cyan-400 shrink-0">{template.category}</span>
                </div>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[32px]">{template.description || "No description provided."}</p>
                
                {template.stats && (
                  <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400">
                    <span className="bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">{template.stats["Editable fields"] || 0} fields</span>
                    <span className="bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">{template.stats["Forms"] || 0} forms</span>
                    {template.issuesCount > 0 && <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded border border-rose-500/20">{template.issuesCount} errors</span>}
                  </div>
                )}
                
                <div className="mt-auto flex flex-col gap-2">
                  <button
                    onClick={() => openVisualEdit(template)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 py-2 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-teal-400"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Edit Inline (Visual)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openEdit(template)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                      title="Edit HTML Source Code"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Code
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500 hover:text-cyan-950"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-500 rounded-xl border border-dashed border-slate-700">
            <LayoutTemplate className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No templates imported yet.</p>
          </div>
        )}
      </div>

      {inlineVisualTemplate && templateAnalysis && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in duration-200">
          <InlineVisualEditor
            analysis={templateAnalysis}
            isAdmin={true}
            onExit={() => {
              setInlineVisualTemplate(null);
              setTemplateAnalysis(null);
            }}
            onSaveDraft={(state) => handleVisualSave(state)}
            onPublish={(state) => handleVisualSave(state)}
          />
        </div>
      )}
      
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-white font-bold text-xl">{previewTemplate.title}</h2>
              <p className="text-slate-400 text-sm">Live Preview</p>
            </div>
            
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

            <button onClick={() => { setPreviewTemplate(null); setPreviewMode("desktop"); }} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition p-2 rounded-full"><X className="h-5 w-5"/></button>
          </div>
          <div className="flex-1 flex justify-center w-full">
            <div className={`h-full rounded-xl overflow-hidden bg-white border border-slate-700 shadow-2xl transition-all duration-300 ${previewMode === "desktop" ? "w-full" : previewMode === "tablet" ? "w-[768px]" : "w-[375px]"}`}>
              <iframe srcDoc={previewTemplate.htmlContent} className="w-full h-full border-0 bg-white" title="Template Preview" />
            </div>
          </div>
        </div>
      )}

      {editTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 animate-in fade-in duration-200">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-[#0b1826]">
            <div className="flex items-center gap-3">
              <button onClick={() => setEditTemplate(null)} className="text-slate-400 hover:text-white transition bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded-md"><X className="h-5 w-5"/></button>
              <div>
                <h2 className="text-white font-bold text-sm flex items-center gap-2"><Pencil className="h-3.5 w-3.5 text-cyan-400"/> Editing: {editData.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500 hover:text-cyan-950"
              >
                <Eye className="h-4 w-4"/> Preview
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <Settings className="h-4 w-4"/> Metadata
              </button>
              <button 
                onClick={() => updateMutation.mutate({ id: editTemplate._id, data: editData })} 
                disabled={updateMutation.isPending}
                className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-500 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-400 disabled:opacity-50 min-w-[120px]"
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Save className="h-4 w-4" /> Save Changes</>}
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex overflow-hidden">
            {/* File Sidebar */}
            <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
              <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pages</span>
                <button onClick={handleAddPage} className="text-slate-400 hover:text-cyan-400 transition" title="Add Page"><Plus className="h-4 w-4"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div 
                  onClick={() => setActivePage("index.html")}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition ${activePage === "index.html" ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
                >
                  <FileCode2 className="h-4 w-4"/> index.html
                </div>
                {editData.pages.map(page => (
                  <div 
                    key={page.name}
                    onClick={() => setActivePage(page.name)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition group ${activePage === page.name ? "bg-cyan-500/10 text-cyan-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileCode2 className="h-4 w-4 shrink-0"/> 
                      <span className="truncate">{page.name}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDeletePage(page.name, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-[#1e1e1e] flex flex-col">
              <div className="px-4 py-2 bg-[#1e1e1e] border-b border-slate-800 text-xs font-mono text-slate-400 flex justify-between">
                <span>{activePage}</span>
                <span className="text-cyan-500">Monaco Editor</span>
              </div>
              <div className="flex-1">
                <MonacoEditor
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
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-white font-bold text-xl">{editData.title}</h2>
                  <p className="text-slate-400 text-sm">Live Preview</p>
                </div>
                
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

                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition p-2 rounded-full"><X className="h-5 w-5"/></button>
              </div>
              <div className="flex-1 flex justify-center w-full overflow-hidden">
                <div className={`h-full rounded-xl overflow-hidden bg-white border border-slate-700 shadow-2xl transition-all duration-300 ${editorPreviewMode === "desktop" ? "w-full" : editorPreviewMode === "tablet" ? "w-[768px]" : "w-[375px]"}`}>
                  <iframe srcDoc={currentEditorValue} className="w-full h-full border-0 bg-white" title="Editor Live Preview" />
                </div>
              </div>
            </div>
          )}

          {isSettingsOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0b1826] p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="h-5 w-5 text-cyan-400"/> Template Metadata</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white transition"><X className="h-5 w-5"/></button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Title</label>
                    <input 
                      value={editData.title} 
                      onChange={e => setEditData({...editData, title: e.target.value})} 
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" 
                      placeholder="Template Title" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Category</label>
                    <input 
                      value={editData.category} 
                      onChange={e => setEditData({...editData, category: e.target.value})} 
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" 
                      placeholder="e.g. Agency, Portfolio" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Thumbnail URL (optional)</label>
                    <ImageUpload 
                      value={editData.thumbnailUrl} 
                      onChange={(url) => setEditData({...editData, thumbnailUrl: url})} 
                      placeholder="Upload thumbnail"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">Description</label>
                    <textarea 
                      value={editData.description} 
                      onChange={e => setEditData({...editData, description: e.target.value})} 
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none min-h-[80px] resize-none" 
                      placeholder="Short description..." 
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition bg-slate-800">Done</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent className="border-slate-800 bg-[#0b1826] text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
