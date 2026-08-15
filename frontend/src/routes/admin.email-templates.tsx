import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import {
  getEmailTemplates,
  getEmailTemplateVariables,
  updateEmailTemplate,
  createEmailTemplate,
  deleteEmailTemplate,
  setDefaultEmailTemplate,
  sendTestEmail,
  uploadEmailTemplateImage,
} from "@/lib/admin-api";
import {
  Loader2,
  Mail,
  Edit,
  Info,
  Save,
  Trash,
  Image as ImageIcon,
  Eye,
  Code,
  Play,
  CheckCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";

export const Route = createFileRoute("/admin/email-templates")({
  component: EmailTemplatesPage,
});

function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "custom",
    category: "General",
    subject: "",
    htmlBody: "",
    textBody: "",
    previewText: "",
    isDefault: false,
    isActive: true,
  });
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [testEmail, setTestEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["adminEmailTemplates"],
    queryFn: () => getEmailTemplates(),
  });

  const { data: variablesData } = useQuery({
    queryKey: ["adminEmailTemplateVariables", activeTemplateId],
    queryFn: () =>
      activeTemplateId && activeTemplateId !== "new"
        ? getEmailTemplateVariables(activeTemplateId)
        : { variables: [] },
    enabled: !!activeTemplateId && activeTemplateId !== "new",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEmailTemplates"] });
      toast.success("Template updated successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update template"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createEmailTemplate(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminEmailTemplates"] });
      toast.success("Template created successfully");
      setIsCreating(false);
      setActiveTemplateId(res.template._id);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEmailTemplates"] });
      toast.success("Template deleted");
      setActiveTemplateId(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEmailTemplates"] });
      toast.success("Set as default template");
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => sendTestEmail(id, to),
    onSuccess: () => toast.success("Test email sent"),
    onError: (err: any) => toast.error(err.message || "Failed to send test email"),
  });

  const templates = templatesData?.templates || [];
  const types = templatesData?.types || [];
  const activeTemplate =
    activeTemplateId === "new"
      ? form
      : templates.find((t: any) => t._id === activeTemplateId || t.id === activeTemplateId);

  function handleSelectTemplate(t: any) {
    setIsCreating(false);
    setActiveTemplateId(t._id || t.id);
    setForm({
      name: t.name,
      type: t.type,
      category: t.category || "General",
      subject: t.subject,
      htmlBody: t.htmlBody || "",
      textBody: t.textBody || "",
      previewText: t.previewText || "",
      isDefault: t.isDefault,
      isActive: t.isActive,
    });
    setViewMode("code");
  }

  function handleCreateNew() {
    setIsCreating(true);
    setActiveTemplateId("new");
    setForm({
      name: "New Template",
      type: "custom",
      category: "General",
      subject: "",
      htmlBody: "<h1>Hello {{name}}</h1>",
      textBody: "",
      previewText: "",
      isDefault: false,
      isActive: true,
    });
    setViewMode("code");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTemplateId) return;
    if (activeTemplateId === "new") {
      createMutation.mutate(form);
    } else {
      updateMutation.mutate({ id: activeTemplateId, data: form });
    }
  }

  function handleInsertVariable(variable: string) {
    if (editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition();
      editor.executeEdits("", [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          text: `{{${variable}}}`,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
    } else {
      setForm({ ...form, htmlBody: form.htmlBody + `{{${variable}}}` });
    }
    toast.success(`Inserted {{${variable}}}`);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadEmailTemplateImage(file);
      if (editorRef.current) {
        const editor = editorRef.current;
        const position = editor.getPosition();
        editor.executeEdits("", [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
            text: `<img src="${res.url}" alt="Email Image" style="max-width: 100%; height: auto;" />`,
            forceMoveMarkers: true,
          },
        ]);
      }
      toast.success("Image uploaded and inserted");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function getPreviewHtml() {
    // Basic interpolation for preview
    let html = form.htmlBody;
    const testVars = variablesData?.variables || [];
    testVars.forEach((v: string) => {
      html = html.replace(new RegExp(`{{${v}}}`, "g"), `[${v}]`);
    });
    return html;
  }

  return (
    <div className="w-full h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Email Templates</h1>
          <p className="mt-1 text-xs text-slate-500">Design and manage system emails.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] flex-1 min-h-0">
        {/* Sidebar */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="p-4 text-slate-500">
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <p className="text-sm text-slate-500">Loading templates...</p>
              </div>
            </div>
          ) : (
            <>
              {templates.map((t: any) => (
                <button
                  key={t.id || t._id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition ${
                    activeTemplateId === (t.id || t._id)
                      ? "border-cyan-500/50 bg-[#0c1c2e]"
                      : "border-slate-800 bg-[#0b1826] hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-400">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <p className="truncate text-sm font-medium text-slate-200">{t.name}</p>
                    </div>
                    {t.isDefault && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      {t.type}
                    </span>
                    <span className="rounded bg-slate-800/50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                      {t.category}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Editor Panel */}
        <div className="rounded-xl border border-slate-800 bg-[#0b1826] flex flex-col min-h-0 overflow-hidden">
          {activeTemplate ? (
            <form onSubmit={handleSave} className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 p-4 bg-slate-900/50">
                <div className="flex-1 mr-4">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-lg font-bold text-slate-200 bg-transparent border-none outline-none w-full mb-1 placeholder-slate-600"
                    placeholder="Template Name"
                  />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      Type:
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="bg-slate-800 rounded px-2 py-1 text-slate-300 border border-slate-700 outline-none"
                      >
                        {types.map((t: string) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-400">
                      Category:
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="bg-slate-800 rounded px-2 py-1 text-slate-300 border border-slate-700 outline-none"
                      >
                        {[
                          "User",
                          "Auth",
                          "Business",
                          "Invitation",
                          "Subscription",
                          "Invoice",
                          "Offer",
                          "Global",
                          "General",
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeTemplateId !== "new" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(activeTemplateId)}
                        disabled={form.isDefault || setDefaultMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                      >
                        Set Default
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure?")) deleteMutation.mutate(activeTemplateId);
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-red-900/30 bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || createMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" /> Save
                  </button>
                </div>
              </div>

              <div className="flex flex-1 min-h-0">
                {/* Main Content Area */}
                <div className="flex flex-col flex-1 border-r border-slate-800 overflow-y-auto">
                  <div className="p-4 space-y-4 border-b border-slate-800">
                    <div>
                      <label className="text-xs font-medium text-slate-400">Subject Line</label>
                      <input
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
                        placeholder="e.g. Welcome to {{appName}}"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400">
                        Preview Text (Optional)
                      </label>
                      <input
                        value={form.previewText}
                        onChange={(e) => setForm({ ...form, previewText: e.target.value })}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-200 outline-none focus:border-cyan-500"
                        placeholder="Displays in email client snippet..."
                      />
                    </div>
                  </div>

                  {/* Editor / Preview */}
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/30 px-4 py-2">
                      <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setViewMode("code")}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${viewMode === "code" ? "bg-slate-700 text-slate-200" : "text-slate-400 hover:text-slate-300"}`}
                        >
                          <Code className="h-3.5 w-3.5" /> HTML Source
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("preview")}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium ${viewMode === "preview" ? "bg-slate-700 text-slate-200" : "text-slate-400 hover:text-slate-300"}`}
                        >
                          <Eye className="h-3.5 w-3.5" /> Visual Preview
                        </button>
                      </div>

                      {viewMode === "code" && (
                        <div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5" />
                            )}
                            Upload Image
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-h-[300px] relative bg-white">
                      {viewMode === "code" ? (
                        <Editor
                          height="100%"
                          defaultLanguage="html"
                          theme="vs-dark"
                          value={form.htmlBody}
                          onChange={(val) => setForm({ ...form, htmlBody: val || "" })}
                          onMount={(editor) => (editorRef.current = editor)}
                          options={{
                            minimap: { enabled: false },
                            wordWrap: "on",
                            fontSize: 13,
                            padding: { top: 16 },
                          }}
                        />
                      ) : (
                        <iframe
                          className="w-full h-full border-none"
                          srcDoc={getPreviewHtml()}
                          title="Email Preview"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Sidebar - Tools */}
                <div className="w-[280px] flex flex-col bg-slate-900/30 overflow-y-auto">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Variables
                    </h3>
                    {activeTemplateId === "new" ? (
                      <p className="text-xs text-slate-500">
                        Save template to see available variables.
                      </p>
                    ) : variablesData?.variables?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {variablesData.variables.map((v: string) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInsertVariable(v)}
                            className="rounded bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-300 border border-slate-700 hover:border-cyan-500 hover:text-cyan-400 transition-colors text-left break-all"
                            title={`Insert {{${v}}}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No variables found.</p>
                    )}
                    <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                      Click a variable to insert it into the editor at your cursor position.
                    </p>
                  </div>

                  <div className="p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Test Send
                    </h3>
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="Recipient Email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!testEmail) return toast.error("Enter an email");
                          if (activeTemplateId === "new") return toast.error("Save template first");
                          sendTestMutation.mutate({ id: activeTemplateId, to: testEmail });
                        }}
                        disabled={sendTestMutation.isPending || activeTemplateId === "new"}
                        className="w-full inline-flex items-center justify-center gap-2 rounded bg-slate-700 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition"
                      >
                        <Play className="h-3 w-3" /> Send Test
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-slate-500 bg-slate-900/20">
              <div className="rounded-full bg-slate-800/50 p-6 mb-4">
                <Mail className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-sm font-medium">Select a template or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
