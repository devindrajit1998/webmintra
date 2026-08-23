import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
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

  const templates = useMemo(() => templatesData?.templates || [], [templatesData?.templates]);
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

  // Auto-select first template if none selected and not creating
  useEffect(() => {
    if (!activeTemplateId && !isCreating && templates.length > 0) {
      handleSelectTemplate(templates[0]);
    }
  }, [templates, activeTemplateId, isCreating]);

  return (
    <div className="mx-auto flex h-[calc(100vh-6.5rem)] w-full max-w-[1600px] flex-col">
      {/* Top Header */}
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#0b192c]">
            Email Templates
          </h1>
          <p className="mt-1 text-xs font-medium text-[#64748b]">
            Design and manage system notification & transactional emails.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#ea580c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c2410c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ea580c] focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[330px_1fr]">
        {/* Left Sidebar - Template List */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="h-7 w-7 animate-spin text-[#ea580c]" />
                <p className="text-xs font-medium text-[#64748b]">Loading templates...</p>
              </div>
            </div>
          ) : (
            <>
              {templates.map((t: any) => {
                const isSelected = activeTemplateId === (t.id || t._id);
                return (
                  <button
                    key={t.id || t._id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`group flex flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-[#fed7aa] bg-[#fff7ed] shadow-xs ring-1 ring-[#fed7aa]"
                        : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc] shadow-xs"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                            isSelected
                              ? "border-[#fed7aa] bg-white text-[#ea580c]"
                              : "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] group-hover:text-[#0b192c]"
                          }`}
                        >
                          <Mail className="h-4 w-4" />
                        </div>
                        <p className="truncate text-xs font-bold text-[#0b192c]">{t.name}</p>
                      </div>
                      {t.isDefault && (
                        <span title="Default template">
                          <CheckCircle className="h-4 w-4 shrink-0 text-[#059669]" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c2410c]">
                        {t.type}
                      </span>
                      <span className="rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                        {t.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Editor & Preview Workspace */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
          {activeTemplate ? (
            <form onSubmit={handleSave} className="flex h-full flex-col">
              {/* Toolbar Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-3.5">
                <div className="flex flex-1 items-center gap-4 min-w-[280px]">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full max-w-sm rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold text-[#0b192c] transition focus:border-[#cbd5e1] focus:bg-white focus:outline-none"
                    placeholder="Template Name"
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
                      Type:
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c]"
                      >
                        {types.map((t: string) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
                      Category:
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-semibold text-[#0b192c] outline-none shadow-2xs focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c]"
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

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  {activeTemplateId !== "new" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(activeTemplateId)}
                        disabled={form.isDefault || setDefaultMutation.isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#475569] shadow-2xs transition hover:border-[#a7f3d0] hover:bg-[#ecfdf5] hover:text-[#047857] disabled:opacity-50"
                      >
                        {form.isDefault ? "Default Template" : "Set as Default"}
                      </button>
                      <button
                        type="button"
                        title="Delete Template"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this template?"))
                            deleteMutation.mutate(activeTemplateId);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] shadow-2xs transition hover:bg-[#ffedd5]"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || createMutation.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#059669] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>

              {/* Main Body Columns */}
              <div className="flex flex-1 min-h-0">
                {/* Center Content Column */}
                <div className="flex flex-1 flex-col overflow-y-auto border-r border-[#e2e8f0]">
                  {/* Subject & Preview Inputs */}
                  <div className="grid gap-3 border-b border-[#e2e8f0] p-4 sm:grid-cols-2 bg-white">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Subject Line
                      </label>
                      <input
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="mt-1.5 h-9 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        placeholder="e.g. Welcome to {{appName}}"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Preview Text{" "}
                        <span className="font-normal lowercase text-[#94a3b8]">(optional)</span>
                      </label>
                      <input
                        value={form.previewText}
                        onChange={(e) => setForm({ ...form, previewText: e.target.value })}
                        className="mt-1.5 h-9 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                        placeholder="Displays in inbox snippet..."
                      />
                    </div>
                  </div>

                  {/* Editor / Preview Mode Container */}
                  <div className="flex flex-1 flex-col min-h-0">
                    {/* View Switcher Sub-bar */}
                    <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2">
                      <div className="flex gap-1 rounded-lg border border-[#e2e8f0] bg-white p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setViewMode("code")}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                            viewMode === "code"
                              ? "bg-[#fff7ed] text-[#c2410c] shadow-2xs"
                              : "text-[#64748b] hover:text-[#0b192c]"
                          }`}
                        >
                          <Code className="h-3.5 w-3.5" /> HTML Source
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("preview")}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                            viewMode === "preview"
                              ? "bg-[#ecfdf5] text-[#047857] shadow-2xs"
                              : "text-[#64748b] hover:text-[#0b192c]"
                          }`}
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-semibold text-[#ea580c] shadow-2xs transition hover:bg-[#fff7ed] hover:border-[#fed7aa] disabled:opacity-50"
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

                    {/* Editor Frame */}
                    <div className="flex-1 min-h-[350px] relative bg-white">
                      {viewMode === "code" ? (
                        <Editor
                          height="100%"
                          defaultLanguage="html"
                          theme="vs-light"
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
                        <div className="h-full w-full bg-[#f1f5f9] p-4 overflow-y-auto flex items-start justify-center">
                          <div className="w-full max-w-[650px] rounded-lg shadow-sm border border-[#e2e8f0] bg-white overflow-hidden">
                            <iframe
                              className="w-full min-h-[500px] border-none block"
                              srcDoc={getPreviewHtml()}
                              title="Email Preview"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Tool Sidebar */}
                <div className="flex w-[290px] shrink-0 flex-col overflow-y-auto bg-[#f8fafc]">
                  {/* Variables Palette */}
                  <div className="border-b border-[#e2e8f0] p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Variables
                      </h3>
                      <span className="text-[10px] font-semibold text-[#94a3b8]">
                        Click to insert
                      </span>
                    </div>

                    {activeTemplateId === "new" ? (
                      <p className="text-xs text-[#64748b]">
                        Save template to load its available variables.
                      </p>
                    ) : variablesData?.variables?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {variablesData.variables.map((v: string) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInsertVariable(v)}
                            className="rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-[#0b192c] shadow-2xs transition hover:border-[#ea580c] hover:bg-[#fff7ed] hover:text-[#c2410c]"
                            title={`Insert {{${v}}}`}
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#64748b]">No variables specified.</p>
                    )}
                  </div>

                  {/* Test Email Section */}
                  <div className="p-4">
                    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                      Test Send
                    </h3>
                    <div className="space-y-2.5">
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#0b192c] outline-none shadow-2xs transition focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/15"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!testEmail) return toast.error("Enter an email address");
                          if (activeTemplateId === "new") return toast.error("Save template first");
                          sendTestMutation.mutate({ id: activeTemplateId, to: testEmail });
                        }}
                        disabled={sendTestMutation.isPending || activeTemplateId === "new"}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0b192c] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1e293b] disabled:opacity-50"
                      >
                        {sendTestMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Send Test Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center bg-[#f8fafc] text-[#64748b]">
              <div className="mb-4 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-6 text-[#ea580c] shadow-2xs">
                <Mail className="h-10 w-10 opacity-80" />
              </div>
              <p className="text-sm font-semibold text-[#0b192c]">No Template Selected</p>
              <p className="mt-1 text-xs text-[#64748b]">
                Select an existing template or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
