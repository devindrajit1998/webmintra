import React, { useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code as CodeIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Minus,
  Eye,
  Edit3,
  FileCode,
} from "lucide-react";

interface RichCKEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichCKEditor({
  value,
  onChange,
  placeholder = "Start writing your article...",
  minHeight = "320px",
}: RichCKEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "code" | "preview">("visual");

  // Sync internal visual editor HTML content when value changes or mode switches to visual
  useEffect(() => {
    if (viewMode === "visual" && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, viewMode]);

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt("Enter link URL (e.g. https://...):");
    if (url) {
      execCmd("createLink", url);
    }
  };

  const insertImage = () => {
    const url = prompt("Enter image URL (e.g. https://...):");
    if (url) {
      execCmd("insertImage", url);
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left;">Header 1</th>
            <th style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left;">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Row 1 Col 1</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">Row 1 Col 2</td>
          </tr>
        </tbody>
      </table>
    `;
    execCmd("insertHTML", tableHtml);
  };

  return (
    <div
      className={`flex flex-col rounded-xl border border-[#cbd5e1] bg-white shadow-2xs transition focus-within:border-[#ea580c] focus-within:ring-2 focus-within:ring-[#ea580c]/10 ${
        isFullscreen
          ? "fixed inset-4 z-50 shadow-2xl bg-white flex flex-col"
          : "relative w-full"
      }`}
    >
      {/* CKEditor Classic Toolbar & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#e2e8f0] bg-[#f8fafc] p-2 rounded-t-xl select-none">
        {/* Left Toolbar Items (Active only in visual mode) */}
        {viewMode === "visual" ? (
          <div className="flex flex-wrap items-center gap-1">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 border-r border-[#cbd5e1] pr-1.5 mr-1">
              <button
                type="button"
                onClick={() => execCmd("undo")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Undo"
              >
                <Undo className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("redo")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Redo"
              >
                <Redo className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Headings */}
            <div className="flex items-center gap-0.5 border-r border-[#cbd5e1] pr-1.5 mr-1">
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "<h1>")}
                className="rounded px-2 py-1 text-[11px] font-extrabold text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "<h2>")}
                className="rounded px-2 py-1 text-[11px] font-bold text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "<h3>")}
                className="rounded px-2 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Heading 3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "<p>")}
                className="rounded px-1.5 py-1 text-[11px] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Paragraph Text"
              >
                Normal
              </button>
            </div>

            {/* Basic Formatting */}
            <div className="flex items-center gap-0.5 border-r border-[#cbd5e1] pr-1.5 mr-1">
              <button
                type="button"
                onClick={() => execCmd("bold")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Bold (Ctrl+B)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("italic")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Italic (Ctrl+I)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("underline")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Underline (Ctrl+U)"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Lists & Quotes */}
            <div className="flex items-center gap-0.5 border-r border-[#cbd5e1] pr-1.5 mr-1">
              <button
                type="button"
                onClick={() => execCmd("insertUnorderedList")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Bulleted List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("insertOrderedList")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Numbered List"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "<blockquote>")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Blockquote"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("insertHorizontalRule")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Divider Line"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Text Alignment */}
            <div className="flex items-center gap-0.5 border-r border-[#cbd5e1] pr-1.5 mr-1">
              <button
                type="button"
                onClick={() => execCmd("justifyLeft")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Align Left"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("justifyCenter")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Align Center"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd("justifyRight")}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Align Right"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Media & Links */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={insertLink}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Insert Link"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={insertImage}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Insert Image by URL"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={insertTable}
                className="rounded p-1.5 text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
                title="Insert Table"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#64748b]">
            {viewMode === "code" ? (
              <span className="flex items-center gap-1.5 text-[#ea580c]">
                <FileCode className="h-4 w-4" /> HTML Source Code Mode
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#059669]">
                <Eye className="h-4 w-4" /> Live Rendered Preview
              </span>
            )}
          </div>
        )}

        {/* Right Section: Mode Toggles & Fullscreen */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Mode Switcher Group */}
          <div className="flex items-center rounded-lg border border-[#cbd5e1] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                viewMode === "visual"
                  ? "bg-[#0b192c] text-white shadow-xs"
                  : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b192c]"
              }`}
              title="Visual Editor (WYSIWYG)"
            >
              <Edit3 className="h-3 w-3" /> Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                viewMode === "code"
                  ? "bg-[#ea580c] text-white shadow-xs"
                  : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b192c]"
              }`}
              title="Edit HTML Source Code"
            >
              <FileCode className="h-3 w-3" /> HTML Code
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                viewMode === "preview"
                  ? "bg-[#059669] text-white shadow-xs"
                  : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b192c]"
              }`}
              title="Live Preview Output"
            >
              <Eye className="h-3 w-3" /> Preview
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg border border-[#cbd5e1] bg-white p-1.5 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b192c] transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Body Area depending on viewMode */}
      {viewMode === "visual" && (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
          className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-[#1e293b] outline-none font-sans focus:outline-none prose prose-slate max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#94a3b8]"
          data-placeholder={placeholder}
        />
      )}

      {viewMode === "code" && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
          placeholder="Paste or write HTML code here..."
          className="w-full flex-1 resize-none bg-[#0b192c] p-4 font-mono text-xs leading-relaxed text-[#f8fafc] outline-none selection:bg-[#ea580c] selection:text-white"
          spellCheck={false}
        />
      )}

      {viewMode === "preview" && (
        <div
          style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
          className="flex-1 overflow-y-auto bg-[#fafafa] p-6 text-sm leading-relaxed text-[#1e293b] prose prose-slate max-w-none"
        >
          {value ? (
            <div dangerouslySetInnerHTML={{ __html: value }} />
          ) : (
            <p className="italic text-[#94a3b8]">No content to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
