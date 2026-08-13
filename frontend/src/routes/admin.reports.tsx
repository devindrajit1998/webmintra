import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getReport } from "@/lib/admin-api";
import { BarChart3, TrendingUp, Users, DollarSign, Download } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

type ReportData = {
  overview?: {
    tenants?: {
      total?: number;
      active?: number;
      newThisMonth?: number;
      growthRate?: string | null;
    };
    revenue?: { total?: number; thisMonth?: number; growthRate?: string | null };
    subscriptions?: { active?: number };
  };
  monthly?: Array<{ label: string; revenue?: number; count?: number }>;
  byStatus?: Array<{ _id: string; count: number }>;
  churnedThisMonth?: number;
  newThisMonth?: number;
};

type ReportSummary = {
  revenue: number;
  activeTenants: number;
  newSignups: number;
  churnRate: string;
  revenueGrowth: string | null;
  tenantGrowth: string | null;
};

function normalizeReport(data: ReportData | undefined, reportType: string) {
  const overview = data?.overview;
  const monthly = data?.monthly ?? [];
  const chartData = monthly.map((item) => ({
    date: item.label,
    value: reportType === "revenue" ? (item.revenue ?? 0) : (item.count ?? 0),
  }));
  const totalSubscriptions = data?.byStatus?.reduce((total, item) => total + item.count, 0) ?? 0;

  return {
    summary: {
      revenue:
        overview?.revenue?.thisMonth ??
        monthly.reduce((total, item) => total + (item.revenue ?? 0), 0),
      activeTenants: overview?.tenants?.active ?? 0,
      newSignups: overview?.tenants?.newThisMonth ?? data?.newThisMonth ?? 0,
      churnRate:
        totalSubscriptions > 0
          ? `${(((data?.churnedThisMonth ?? 0) / totalSubscriptions) * 100).toFixed(1)}`
          : "0.0",
      revenueGrowth: overview?.revenue?.growthRate ?? null,
      tenantGrowth: overview?.tenants?.growthRate ?? null,
    } satisfies ReportSummary,
    chartData,
    hasChartData: chartData.length > 0,
  };
}

function flattenReport(value: unknown, path = "report"): Array<{ metric: string; value: string }> {
  if (value === null || value === undefined) {
    return [{ metric: path, value: "" }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenReport(item, `${path}.${index + 1}`));
  }

  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => flattenReport(item, `${path}.${key}`));
  }

  return [{ metric: path, value: String(value) }];
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

const REPORT_ENDPOINTS: Record<string, string> = {
  overview: "overview",
  revenue: "revenue",
  users: "tenants",
  retention: "subscriptions",
};

function ReportsPage() {
  const [timeframe, setTimeframe] = useState("30d");
  const [reportType, setReportType] = useState("overview");

  const { data, isLoading, isError, error } = useQuery<ReportData>({
    queryKey: ["adminReport", reportType, timeframe],
    queryFn: () => getReport(REPORT_ENDPOINTS[reportType] ?? "overview", { timeframe }),
  });
  const report = useMemo(() => normalizeReport(data, reportType), [data, reportType]);
  const canExport = Boolean(data && Object.keys(data).length > 0 && !isLoading && !isError);

  function exportReport() {
    if (!data || !canExport) return;

    const rows = flattenReport(data);
    const csv = [
      ["Report", reportType],
      ["Timeframe", timeframe],
      ["Exported at", new Date().toISOString()],
      [],
      ["Metric", "Value"],
      ...rows.map((row) => [row.metric, row.value]),
    ]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `webmintra-${reportType}-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="mt-1 text-xs text-slate-500">
            In-depth platform metrics and growth tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm focus:border-cyan-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            type="button"
            onClick={exportReport}
            disabled={!canExport}
            title={canExport ? "Download this report as CSV" : "No report data available to export"}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:text-slate-300"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "overview", icon: BarChart3, label: "Overview" },
          { id: "revenue", icon: DollarSign, label: "Revenue" },
          { id: "users", icon: Users, label: "Users" },
          { id: "retention", icon: TrendingUp, label: "Retention" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              reportType === tab.id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-[#0b1826]">
          <div className="text-slate-500">Generating report...</div>
        </div>
      ) : isError ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-rose-900/50 bg-[#0b1826] p-6 text-center text-rose-300">
          {error instanceof Error ? error.message : "Unable to load this report."}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Revenue this month"
              value={`₹${report.summary.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              trend={report.summary.revenueGrowth}
            />
            <SummaryCard
              label="Active tenants"
              value={report.summary.activeTenants.toLocaleString()}
              trend={report.summary.tenantGrowth}
            />
            <SummaryCard label="New signups" value={report.summary.newSignups.toLocaleString()} />
            <SummaryCard label="Churn rate" value={`${report.summary.churnRate}%`} />
          </div>

          {/* Main Chart */}
          <div className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-200 capitalize">{reportType} Trends</h2>
            </div>
            {report.hasChartData ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={report.chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (reportType === "revenue" ? `₹${val}` : val)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No trend data is available for this report and timeframe.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b1826] p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-slate-200">{value}</p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          {trend === null ? "No comparison period" : `${trend}% from previous period`}
        </div>
      )}
    </div>
  );
}
