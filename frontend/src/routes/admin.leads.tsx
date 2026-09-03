import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminLeads,
  getAdminLeadStats,
  createAdminLead,
  updateAdminLead,
  deleteAdminLead,
  importAdminLeadsBulk,
  addAdminLeadNote,
  convertAdminLeadToTenant,
  updateAdminLeadsBulkStatus,
  deleteAdminLeadsBulk,
} from "@/lib/admin-api";
import {
  UserCheck,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Pencil,
  Trash2,
  ChevronRight,
  CheckCircle2,
  X,
  Loader2,
  Upload,
  AlertCircle,
  FileText,
  Tag,
  UserPlus,
  Globe,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/admin/leads")({
  component: AdminLeadsPage,
  head: () => ({ meta: [{ title: "Leads CRM | WebMintra Admin" }] }),
});

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  new: {
    label: "New Prospect",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  contacted: {
    label: "Contacted",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  demo_scheduled: {
    label: "Demo Scheduled",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  proposal_sent: {
    label: "Proposal Sent",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  negotiation: {
    label: "Negotiation",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  won: {
    label: "Won / Converted",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "Lost / Closed",
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-slate-500 bg-slate-100" },
  medium: { label: "Medium", color: "text-blue-700 bg-blue-50 border border-blue-200" },
  high: { label: "High", color: "text-orange-700 bg-orange-50 border border-orange-200" },
  urgent: {
    label: "Urgent 🔥",
    color: "text-rose-700 bg-rose-50 border border-rose-200 font-black",
  },
};

const CATEGORIES = [
  "Retail & Shop",
  "Healthcare & Clinic",
  "Gym & Fitness",
  "Restaurant & Cafe",
  "Salon & Spa",
  "Financial & CA",
  "Real Estate",
  "Agency / Services",
  "Education & Coaching",
  "General",
];

const SOURCES = [
  { value: "manual", label: "Manual Entry" },
  { value: "excel_import", label: "Excel / CSV Import" },
  { value: "landing_page", label: "Landing Page Form" },
  { value: "whatsapp", label: "WhatsApp Direct" },
  { value: "referral", label: "Referral" },
  { value: "cold_outreach", label: "Cold Outreach / Calling" },
  { value: "google_ads", label: "Google Ads" },
  { value: "meta_ads", label: "Meta / Instagram Ads" },
  { value: "other", label: "Other" },
];

interface LeadFormState {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address: string;
  website: string;
  mapUrl: string;
  category: string;
  status: string;
  priority: string;
  source: string;
  estimatedValue: number;
  followUpDate: string;
  tags: string;
  initialNote: string;
}

const EMPTY_LEAD_FORM: LeadFormState = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  address: "",
  website: "",
  mapUrl: "",
  category: "General",
  status: "new",
  priority: "medium",
  source: "manual",
  estimatedValue: 0,
  followUpDate: "",
  tags: "",
  initialNote: "",
};

function AdminLeadsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Bulk Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<string>("contacted");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLeadForNotes, setSelectedLeadForNotes] = useState<any | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "emerald" | "rose" | "indigo";
    onConfirm: () => void;
  } | null>(null);

  // Form State
  const [form, setForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);

  // Import State
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Queries
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["adminLeadStats"],
    queryFn: getAdminLeadStats,
  });

  const { data: leadsData, isLoading: isLeadsLoading } = useQuery({
    queryKey: [
      "adminLeads",
      { page, search, status: statusFilter, priority: priorityFilter, category: categoryFilter },
    ],
    queryFn: () =>
      getAdminLeads({
        page,
        limit: 20,
        search,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAdminLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });
      toast.success("Lead added successfully!");
      setIsCreateModalOpen(false);
      setForm(EMPTY_LEAD_FORM);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create lead."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAdminLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });
      toast.success("Lead updated successfully!");
      setIsCreateModalOpen(false);
      setEditingLeadId(null);
      setForm(EMPTY_LEAD_FORM);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update lead."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });
      setSelectedLeadIds((prev) => prev.filter((id) => id !== editingLeadId));
      toast.success("Lead removed successfully.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete lead."),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      updateAdminLeadsBulkStatus(ids, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });
      toast.success(res.message || "Status updated for selected leads!");
      setSelectedLeadIds([]);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update status for leads."),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteAdminLeadsBulk(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });
      toast.success(res.message || "Selected leads deleted.");
      setSelectedLeadIds([]);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete leads."),
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => addAdminLeadNote(id, note),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      toast.success("Note recorded!");
      if (selectedLeadForNotes) {
        setSelectedLeadForNotes((prev: any) => ({ ...prev, notes: res.notes }));
      }
      setNewNoteText("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add note."),
  });

  const convertMutation = useMutation({
    mutationFn: convertAdminLeadToTenant,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });
      toast.success(res.message || "Lead converted to Tenant Invitation!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to convert lead."),
  });

  const leads = leadsData?.leads || [];
  const pagination = leadsData?.pagination || { total: 0, totalPages: 1 };

  // Bulk Selection Helpers
  const allCurrentPageSelected =
    leads.length > 0 && leads.every((l: any) => selectedLeadIds.includes(l._id));

  function toggleSelectAll() {
    if (allCurrentPageSelected) {
      const currentIds = leads.map((l: any) => l._id);
      setSelectedLeadIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      const currentIds = leads.map((l: any) => l._id);
      setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    }
  }

  function toggleSelectLead(id: string) {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  // Handlers
  function openCreate() {
    setEditingLeadId(null);
    setForm(EMPTY_LEAD_FORM);
    setIsCreateModalOpen(true);
  }

  function openEdit(lead: any) {
    setEditingLeadId(lead._id);
    setForm({
      name: lead.name || "",
      businessName: lead.businessName || "",
      phone: lead.phone || "",
      email: lead.email || "",
      city: lead.city || "",
      state: lead.state || "",
      address: lead.address || "",
      website: lead.website || "",
      mapUrl: lead.mapUrl || "",
      category: lead.category || "General",
      status: lead.status || "new",
      priority: lead.priority || "medium",
      source: lead.source || "manual",
      estimatedValue: lead.estimatedValue || 0,
      followUpDate: lead.followUpDate ? lead.followUpDate.split("T")[0] : "",
      tags: lead.tags?.join(", ") || "",
      initialNote: "",
    });
    setIsCreateModalOpen(true);
  }

  function handleSubmitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Lead name is required.");
      return;
    }

    const payload = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (editingLeadId) {
      updateMutation.mutate({ id: editingLeadId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Quick Status Change
  function handleQuickStatusChange(leadId: string, newStatus: string) {
    updateMutation.mutate({ id: leadId, data: { status: newStatus } });
  }

  // Excel (.xlsx, .xls) and CSV File Parser via SheetJS / xlsx
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) return;

        // Parse with SheetJS
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          toast.error("Spreadsheet does not contain any sheets.");
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          toast.error("Spreadsheet is empty.");
          return;
        }

        const parsed: any[] = [];

        rawJson.forEach((row) => {
          // Normalize row keys to lowercase
          const normalized: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            normalized[key.trim().toLowerCase()] = row[key];
          });

          // Helper to find value from possible key matches
          const findVal = (keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(normalized).find((nk) => nk.includes(k));
              if (
                matchedKey &&
                normalized[matchedKey] !== undefined &&
                normalized[matchedKey] !== ""
              ) {
                return String(normalized[matchedKey]).trim();
              }
            }
            return "";
          };

          const nameVal = findVal([
            "title",
            "name",
            "lead name",
            "business name",
            "store name",
            "company",
            "shop name",
            "contact name",
            "full name",
          ]);
          if (!nameVal) return; // skip rows with no title / name

          const phoneVal = findVal([
            "phone number",
            "phone",
            "mobile number",
            "mobile",
            "whatsapp number",
            "whatsapp",
            "contact number",
            "tel",
            "cell",
          ]);
          const emailVal = findVal(["email", "mail", "email address"]).toLowerCase();
          const businessVal = findVal(["business", "company", "store", "shop", "org", "firm"]);

          // Look for website & website address
          const websiteAddressVal = findVal([
            "websiteaddress",
            "website address",
            "website",
            "site",
            "web url",
            "url",
            "domain",
          ]);

          // Look for physical address
          const addressVal = findVal([
            "address",
            "location address",
            "street address",
            "full address",
          ]);

          // Look for Google Maps URL
          const mapUrlVal = findVal([
            "google map url",
            "google maps url",
            "google map",
            "google maps",
            "map url",
            "maps url",
            "map link",
            "gmb url",
            "gmb link",
            "location url",
            "maps",
          ]);

          const cityVal = findVal(["city", "location", "town", "district"]);

          // Look for type / category
          const categoryVal =
            findVal(["type", "category", "business type", "industry", "sector", "niche"]) ||
            "General";

          const dealValueStr = findVal(["value", "deal", "amount", "price", "budget", "estimated"]);
          const noteVal = findVal([
            "note",
            "comment",
            "remark",
            "detail",
            "message",
            "description",
          ]);

          const hasWebsite = Boolean(websiteAddressVal?.includes("."));
          const websiteClean = hasWebsite ? websiteAddressVal : "";
          // If no website present, don't add Google Map link so cold prospects without websites can be prioritized for calls
          const finalMapUrl = hasWebsite ? mapUrlVal : "";

          parsed.push({
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            businessName: businessVal && businessVal !== nameVal ? businessVal : "",
            city: cityVal,
            address:
              addressVal ||
              (!websiteAddressVal?.startsWith("http") && !websiteAddressVal?.includes(".")
                ? websiteAddressVal
                : ""),
            website: websiteClean,
            mapUrl: finalMapUrl,
            category: categoryVal,
            estimatedValue: Number(dealValueStr) || 0,
            note: noteVal,
          });
        });

        if (parsed.length === 0) {
          toast.error("Could not find valid lead names in spreadsheet columns.");
          return;
        }

        setParsedImportRows(parsed);
        toast.success(`Successfully parsed ${parsed.length} leads from "${file.name}".`);
      } catch (err: any) {
        toast.error("Failed to parse Excel file: " + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function handleExecuteImport() {
    if (parsedImportRows.length === 0) {
      toast.error("No valid lead rows to import.");
      return;
    }

    try {
      setIsImporting(true);
      const res = await importAdminLeadsBulk({
        leads: parsedImportRows,
        skipDuplicates,
      });

      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeadStats"] });

      toast.success(res.message || "Bulk import completed!");
      setIsImportModalOpen(false);
      setParsedImportRows([]);
      setImportFileName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete bulk import.");
    } finally {
      setIsImporting(false);
    }
  }

  // Export to native .xlsx Excel file
  function handleExportExcel() {
    if (leads.length === 0) {
      toast.error("No leads available to export.");
      return;
    }

    const exportRows = leads.map((l: any) => ({
      "Lead Name": l.name || "",
      "Business Name": l.businessName || "",
      "Phone / WhatsApp": l.phone || "",
      "Email Address": l.email || "",
      City: l.city || "",
      State: l.state || "",
      "Industry Category": l.category || "General",
      "Pipeline Stage": STATUS_CONFIG[l.status]?.label || l.status,
      Priority: l.priority || "medium",
      "Lead Source": l.source || "manual",
      "Follow-up Date": l.followUpDate ? new Date(l.followUpDate).toLocaleDateString("en-IN") : "",
      "Created Date": new Date(l.createdAt).toLocaleDateString("en-IN"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    // Auto column widths
    const columnWidths = [
      { wch: 22 }, // Lead Name
      { wch: 24 }, // Business Name
      { wch: 18 }, // Phone
      { wch: 25 }, // Email
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 20 }, // Category
      { wch: 18 }, // Pipeline Stage
      { wch: 12 }, // Priority
      { wch: 15 }, // Source
      { wch: 15 }, // Follow-up
      { wch: 15 }, // Created Date
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Pipeline");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `WebMintra_Leads_Export_${dateStr}.xlsx`);

    toast.success("Leads exported to Excel (.xlsx) successfully.");
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6 lg:p-8 space-y-6">
      {/* ── 1. Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e8f0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#059669]">
            <Sparkles className="h-4 w-4 text-[#ea580c]" /> SaaS Growth &amp; Pipeline Management
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-1 flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-[#059669]" /> Lead Management &amp; CRM
          </h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Track prospective tenants, record sales touchpoints, import client spreadsheets, and
            convert deals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-4 text-xs font-bold text-[#334155] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#0f172a] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#64748b]" /> Export Excel (.xlsx)
          </button>
          <button
            onClick={() => {
              setParsedImportRows([]);
              setImportFileName("");
              setIsImportModalOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-4 text-xs font-bold text-[#c2410c] shadow-2xs transition hover:bg-[#ffedd5] cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#ea580c]" /> Import Excel (.xlsx / .csv)
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#047857] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Single Lead
          </button>
        </div>
      </div>

      {/* ── 2. Metric Cards ────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
              Total Leads in CRM
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-[#0f172a]">{statsData?.totalLeads ?? 0}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#059669] font-bold">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{statsData?.newLeads ?? 0} new uncontacted</span>
          </div>
        </div>

        <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
              Won / Conversion Rate
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-[#0f172a]">
            {statsData?.conversionRate ?? "0.0"}%
          </p>
          <p className="mt-2 text-xs text-[#2563eb] font-bold">
            {statsData?.wonLeads ?? 0} deals converted
          </p>
        </div>

        <div className="tiranga-border-top rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
              Follow-ups Due Today
            </span>
            <div className="h-8 w-8 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#e11d48] flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-[#0f172a]">{statsData?.followUpsDue ?? 0}</p>
          <p className="mt-2 text-xs text-[#e11d48] font-bold">Action required today</p>
        </div>
      </section>

      {/* ── 3. Filters & Search Bar ────────────────────────────────── */}
      <section className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search leads by name, business, phone, email, city..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#cbd5e1] text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
          >
            <option value="all">All Stages</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent 🔥</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
          >
            <option value="all">All Industries</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ── 3.1 Bulk Action Toolbar (when items selected) ──────────── */}
      {selectedLeadIds.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 px-5 rounded-2xl shadow-sm border border-[#cbd5e1] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#059669] text-xs font-black text-white shadow-xs">
              {selectedLeadIds.length}
            </span>
            <span className="text-xs font-extrabold text-[#0f172a]">
              {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedLeadIds([])}
              className="text-[11px] font-bold text-[#64748b] hover:text-[#0f172a] hover:underline cursor-pointer ml-1"
            >
              Clear selection
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Bulk Status Change */}
            <div className="flex items-center gap-2 bg-[#f8fafc] rounded-xl p-1.5 border border-[#e2e8f0]">
              <span className="text-xs font-bold text-[#475569] pl-1.5">Set Stage:</span>
              <select
                value={bulkStatusTarget}
                onChange={(e) => setBulkStatusTarget(e.target.value)}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#0f172a] border border-[#cbd5e1] outline-none cursor-pointer focus:border-[#059669]"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button
                disabled={bulkStatusMutation.isPending}
                onClick={() =>
                  bulkStatusMutation.mutate({
                    ids: selectedLeadIds,
                    status: bulkStatusTarget,
                  })
                }
                className="rounded-lg bg-[#059669] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#047857] disabled:opacity-50 transition shadow-2xs cursor-pointer"
              >
                {bulkStatusMutation.isPending ? "Updating..." : "Apply Status"}
              </button>
            </div>

            {/* Bulk Delete */}
            <button
              disabled={bulkDeleteMutation.isPending}
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: `Delete ${selectedLeadIds.length} Selected Leads?`,
                  description: `Are you sure you want to permanently delete ${selectedLeadIds.length} lead(s)? All notes and CRM history will be removed. This cannot be undone.`,
                  confirmText: `Delete ${selectedLeadIds.length} Leads`,
                  variant: "rose",
                  onConfirm: () => {
                    bulkDeleteMutation.mutate(selectedLeadIds);
                    setConfirmModal(null);
                  },
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 transition shadow-2xs cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete (${selectedLeadIds.length})`}
            </button>
          </div>
        </section>
      )}

      {/* ── 4. Leads Table / List ──────────────────────────────────── */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xs overflow-hidden">
        {isLeadsLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#059669]" />
            <p className="mt-3 text-xs font-bold text-[#64748b]">Loading leads database...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#059669] mb-4">
              <UserCheck className="h-8 w-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#0f172a]">No leads found</h3>
            <p className="mt-1 text-xs text-[#64748b] max-w-md">
              Start building your pipeline by adding prospects manually or importing contacts from
              an Excel/CSV spreadsheet.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] px-4 py-2 text-xs font-bold text-[#0f172a] hover:bg-[#f8fafc] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#ea580c]" /> Import Spreadsheet
              </button>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#047857] cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Lead
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-extrabold uppercase tracking-wider text-[#64748b]">
                <tr>
                  <th className="py-3.5 pl-5 pr-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-[#cbd5e1] text-[#059669] focus:ring-[#059669] cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="py-3.5 px-4">Lead / Contact</th>
                  <th className="py-3.5 px-4">Business &amp; Category</th>
                  <th className="py-3.5 px-4">Contact Channels</th>
                  <th className="py-3.5 px-4">Stage / Status</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {leads.map((lead: any) => {
                  const statusInfo = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  const priorityInfo = PRIORITY_CONFIG[lead.priority] || PRIORITY_CONFIG.medium;
                  const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
                  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const isSelected = selectedLeadIds.includes(lead._id);

                  return (
                    <tr
                      key={lead._id}
                      className={`transition-colors ${isSelected ? "bg-emerald-50/50" : "hover:bg-[#fafcfb]"}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pl-5 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLead(lead._id)}
                          className="rounded border-[#cbd5e1] text-[#059669] focus:ring-[#059669] cursor-pointer"
                        />
                      </td>

                      {/* Name & Location */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-sm text-[#0f172a] flex items-center gap-1.5">
                          {lead.name}
                        </div>
                        {lead.address ? (
                          <div
                            className="flex items-center gap-1 text-[11px] text-[#64748b] mt-0.5 font-medium line-clamp-1 max-w-[220px]"
                            title={lead.address}
                          >
                            <MapPin className="h-3 w-3 text-[#94a3b8] shrink-0" /> {lead.address}
                          </div>
                        ) : lead.city ? (
                          <div className="flex items-center gap-1 text-[11px] text-[#64748b] mt-0.5 font-medium">
                            <MapPin className="h-3 w-3 text-[#94a3b8] shrink-0" /> {lead.city}
                            {lead.state ? `, ${lead.state}` : ""}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#94a3b8]">No location specified</span>
                        )}

                        {/* Google Maps link if available */}
                        {lead.mapUrl && (
                          <a
                            href={lead.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ea580c] hover:underline mt-1"
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> View on Google Maps
                          </a>
                        )}
                      </td>

                      {/* Business & Category */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-[#0f172a] text-xs">
                          {lead.businessName || lead.name || "—"}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
                            {lead.category || "General"}
                          </span>
                          {lead.website ? (
                            <a
                              href={
                                lead.website.startsWith("http")
                                  ? lead.website
                                  : `https://${lead.website}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition"
                              title={lead.website}
                            >
                              <Globe className="h-2.5 w-2.5" /> Website
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-black text-amber-700"
                              title="High Priority Prospect: No active website detected"
                            >
                              🔥 No Website
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone & Email */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-[#334155]">
                                {lead.phone}
                              </span>
                              <a
                                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${lead.name}, regarding your website requirement on WebMintra...`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-[#25d366]/10 px-1.5 py-0.5 text-[10px] font-black text-[#128c7e] hover:bg-[#25d366]/20 transition"
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" /> WhatsApp
                              </a>
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#64748b]">
                              <Mail className="h-3 w-3 text-[#94a3b8]" />
                              <span className="truncate max-w-[150px]">{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead._id, e.target.value)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold border ${statusInfo.border} ${statusInfo.bg} ${statusInfo.text} outline-none cursor-pointer`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${priorityInfo.color}`}
                        >
                          {priorityInfo.label}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Notes view/add */}
                          <button
                            onClick={() => setSelectedLeadForNotes(lead)}
                            className="relative p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition cursor-pointer"
                            title="Notes & History"
                          >
                            <FileText className="h-4 w-4" />
                            {lead.notes?.length > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#059669] text-[9px] font-bold text-white">
                                {lead.notes.length}
                              </span>
                            )}
                          </button>

                          {/* Convert to Tenant button */}
                          {lead.status !== "won" && lead.email && (
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: `Convert "${lead.name}" to Tenant Invitation?`,
                                  description: `This will generate an official tenant onboarding invitation for ${lead.email} and automatically update this lead's status to Won in your CRM pipeline.`,
                                  confirmText: "Convert & Invite",
                                  variant: "emerald",
                                  onConfirm: () => {
                                    convertMutation.mutate(lead._id);
                                    setConfirmModal(null);
                                  },
                                });
                              }}
                              className="p-1.5 rounded-lg text-[#059669] hover:bg-[#ecfdf5] transition cursor-pointer"
                              title="Convert to Tenant Invitation"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition cursor-pointer"
                            title="Edit Lead"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: `Delete Lead "${lead.name}"?`,
                                description: `Are you sure you want to permanently delete "${lead.name}"? All associated CRM notes and history will be removed.`,
                                confirmText: "Delete Lead",
                                variant: "rose",
                                onConfirm: () => {
                                  deleteMutation.mutate(lead._id);
                                  setConfirmModal(null);
                                },
                              });
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e2e8f0] px-5 py-3 bg-[#f8fafc]">
            <p className="text-xs text-[#64748b]">
              Showing page <strong>{pagination.page}</strong> of{" "}
              <strong>{pagination.totalPages}</strong> ({pagination.total} total leads)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f1f5f9] disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-[#f1f5f9] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── MODAL: Create / Edit Single Lead ───────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-5">
              <h2 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ea580c]" />
                {editingLeadId ? "Edit Lead Details" : "Add New Lead / Prospect"}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Contact / Lead Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Business / Store Name
                  </label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="e.g. Chandra Garments"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. ramesh@example.com"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Existing Website Address (if any)
                  </label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="e.g. www.chandragarments.com"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Google Maps / GMB URL
                  </label>
                  <input
                    type="url"
                    value={form.mapUrl}
                    onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
                    placeholder="e.g. https://maps.app.goo.gl/..."
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0f172a] block mb-1">
                  Full Location / Physical Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Shop 12, MG Road, Near City Center"
                  className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Kolkata, Mumbai"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Type / Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] outline-none focus:border-[#059669] cursor-pointer"
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!editingLeadId && (
                <div>
                  <label className="text-xs font-bold text-[#0f172a] block mb-1">
                    Initial Call Note / Remark
                  </label>
                  <textarea
                    rows={2}
                    value={form.initialNote}
                    onChange={(e) => setForm({ ...form, initialNote: e.target.value })}
                    placeholder="e.g. Interested in Starter plan with custom .in domain. Follow up on Monday."
                    className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-[#cbd5e1] px-4 py-2.5 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-xl bg-[#059669] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#047857] transition shadow-xs cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingLeadId
                      ? "Update Lead"
                      : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Bulk Excel / CSV Import ─────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-5">
              <h2 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#ea580c]" />
                Bulk Import Leads from Excel / CSV
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center hover:border-[#059669] hover:bg-[#ecfdf5]/30 transition cursor-pointer"
              >
                <Upload className="h-8 w-8 text-[#059669] mb-2" />
                <p className="text-xs font-extrabold text-[#0f172a]">
                  {importFileName
                    ? importFileName
                    : "Click to choose Excel (.xlsx, .xls) or CSV file"}
                </p>
                <p className="text-[11px] text-[#64748b] mt-1">
                  Supports <strong>.xlsx, .xls, .csv</strong> spreadsheets with columns:{" "}
                  <strong>Name, Phone, Email, Business, City, Category, Value, Note</strong>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Duplicate settings */}
              <label className="flex items-center gap-2.5 text-xs font-bold text-[#0f172a] cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-[#cbd5e1] text-[#059669] focus:ring-[#059669]"
                />
                Skip duplicate leads matching existing phone numbers or emails
              </label>

              {/* Preview parsed rows */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0f172a]">
                    <span>Parsed Preview ({parsedImportRows.length} Leads found)</span>
                    <span className="text-[#059669]">✓ Ready to Import</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] font-extrabold">
                        <tr>
                          <th className="py-2 px-3">Title / Name</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Phone Number</th>
                          <th className="py-2 px-3">Website Address</th>
                          <th className="py-2 px-3">Maps / Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {parsedImportRows.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-3 font-bold text-[#0f172a]">{row.name}</td>
                            <td className="py-1.5 px-3 text-[#475569]">
                              {row.category || "General"}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-[#475569]">
                              {row.phone || "—"}
                            </td>
                            <td className="py-1.5 px-3 text-blue-600 truncate max-w-[120px]">
                              {row.website || "—"}
                            </td>
                            <td className="py-1.5 px-3 text-[#475569] truncate max-w-[140px]">
                              {row.mapUrl ? "✓ Map URL" : row.address || row.city || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedImportRows.length > 10 && (
                    <p className="text-[10px] text-[#64748b] italic">
                      + {parsedImportRows.length - 10} more rows will be imported...
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl border border-[#cbd5e1] px-4 py-2.5 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parsedImportRows.length === 0 || isImporting}
                  onClick={handleExecuteImport}
                  className="rounded-xl bg-[#059669] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#047857] disabled:opacity-40 transition shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isImporting ? "Importing Leads..." : `Import ${parsedImportRows.length} Leads`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Lead Notes & Call Logs ──────────────────────────── */}
      {selectedLeadForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0] mb-4 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-[#0f172a]">
                  {selectedLeadForNotes.name} &bull; Activity Notes
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-[#64748b]">
                    {selectedLeadForNotes.businessName || "Direct Prospect"} (
                    {selectedLeadForNotes.phone || "No phone"})
                  </span>
                  {selectedLeadForNotes.website && (
                    <a
                      href={
                        selectedLeadForNotes.website.startsWith("http")
                          ? selectedLeadForNotes.website
                          : `https://${selectedLeadForNotes.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                  {selectedLeadForNotes.mapUrl && (
                    <a
                      href={selectedLeadForNotes.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#ea580c] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Google Maps
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForNotes(null)}
                className="p-1 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Note input */}
            <div className="space-y-2 mb-4 shrink-0">
              <textarea
                rows={2}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log a call, demo update, or follow-up note..."
                className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#0f172a] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!newNoteText.trim() || addNoteMutation.isPending}
                  onClick={() =>
                    addNoteMutation.mutate({
                      id: selectedLeadForNotes._id,
                      note: newNoteText,
                    })
                  }
                  className="rounded-xl bg-[#059669] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#047857] disabled:opacity-40 transition shadow-xs cursor-pointer"
                >
                  {addNoteMutation.isPending ? "Adding..." : "Add Note"}
                </button>
              </div>
            </div>

            {/* Note list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {!selectedLeadForNotes.notes || selectedLeadForNotes.notes.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#94a3b8] italic">
                  No notes recorded yet for this lead.
                </div>
              ) : (
                selectedLeadForNotes.notes.map((note: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs"
                  >
                    <p className="text-[#334155] font-medium leading-relaxed">{note.note}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#94a3b8] font-semibold border-t border-[#f1f5f9] pt-1.5">
                      <span>By: {note.authorName || "Admin"}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION ACTION MODAL ──────────────────────── */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  confirmModal.variant === "emerald"
                    ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                    : confirmModal.variant === "rose"
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                }`}
              >
                {confirmModal.variant === "emerald" ? (
                  <UserPlus className="h-5 w-5" />
                ) : confirmModal.variant === "rose" ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-[#0f172a]">{confirmModal.title}</h3>
                <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#475569] hover:bg-slate-50 hover:text-[#0f172a] transition shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm()}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer ${
                  confirmModal.variant === "emerald"
                    ? "bg-[#059669] hover:bg-[#047857]"
                    : confirmModal.variant === "rose"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
