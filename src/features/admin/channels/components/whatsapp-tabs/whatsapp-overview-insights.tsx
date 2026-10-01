"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Layers,
  Megaphone,
  PieChart as PieIcon,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type {
  WhatsAppOverviewAnalytics,
  WhatsAppTemplate,
  WhatsAppMessage,
  WhatsAppAnalyticsQuery,
} from "../../live/whatsapp-api";
import { useWhatsAppOverviewAnalytics } from "../../live/whatsapp-hooks";
import type { ProviderOverview } from "@/features/admin/integrations/live/integrations-api";

interface OverviewInsightsProps {
  overviewAnalytics: WhatsAppOverviewAnalytics | null;
  status: ProviderOverview | null;
  templates: WhatsAppTemplate[];
  messages: WhatsAppMessage[];
  loading: boolean;
  onTabChange: (tab: string) => void;
  companyId?: string;
  clientId?: string;
}

const FAILURE_COLORS = ["#EF4444", "#F59E0B", "#8B5CF6", "#3B82F6", "#EC4899", "#64748B", "#10B981"];
const AUDIENCE_PIE_COLORS = ["#10B981", "#EF4444"];
const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10B981",
  COMPLETED: "#3B82F6",
  SCHEDULED: "#8B5CF6",
  DRAFT: "#94A3B8",
  FAILED: "#EF4444",
};

type RangeOption = "7d" | "15d" | "30d" | "today" | "90d" | "this_month" | "last_month" | "custom";

export function WhatsAppOverviewInsights({
  overviewAnalytics: initialOverviewAnalytics,
  status,
  templates,
  messages,
  loading: parentLoading,
  onTabChange,
  companyId,
  clientId,
}: OverviewInsightsProps) {
  // Global Date Filter State
  const [selectedRange, setSelectedRange] = useState<RangeOption>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ start?: string; end?: string }>({});

  // Metric Switcher States
  const [campaignMetric, setCampaignMetric] = useState<"sent" | "delivered" | "read" | "failed">("sent");
  const [templateMetric, setTemplateMetric] = useState<"sent" | "delivered" | "read" | "failed">("sent");

  // Query backend with selected date range
  const queryParam: WhatsAppAnalyticsQuery = useMemo(() => {
    if (selectedRange === "custom" && appliedCustomDates.start && appliedCustomDates.end) {
      return {
        range: "custom",
        startDate: appliedCustomDates.start,
        endDate: appliedCustomDates.end,
      };
    }
    return { range: selectedRange };
  }, [selectedRange, appliedCustomDates]);

  const { data: dynamicOverview, isLoading: queryLoading, isFetching } = useWhatsAppOverviewAnalytics(
    companyId ?? "",
    clientId ?? "",
    queryParam,
    Boolean(companyId && clientId),
  );

  const overview = dynamicOverview ?? initialOverviewAnalytics;
  const isLoading = parentLoading || queryLoading;

  // Safe KPI Aggregations (Strictly from real data)
  const total = overview?.total ?? messages.length;
  const sent = overview?.sent ?? messages.filter((m) => m.sentAt !== null || ["SENT", "DELIVERED", "READ"].includes(m.status)).length;
  const delivered = overview?.delivered ?? messages.filter((m) => m.deliveredAt !== null || ["DELIVERED", "READ"].includes(m.status)).length;
  const read = overview?.read ?? messages.filter((m) => m.readAt !== null || m.status === "READ").length;
  const failed = overview?.failed ?? messages.filter((m) => m.failedAt !== null || ["FAILED", "REJECTED", "OUTCOME_UNKNOWN"].includes(m.status)).length;

  const deliveryRate = overview?.deliveryRate ?? (sent > 0 ? (delivered / sent) * 100 : 0);
  const readRate = overview?.readRate ?? (delivered > 0 ? (read / delivered) * 100 : 0);
  const failureRate = overview?.failureRate ?? (sent > 0 ? (failed / sent) * 100 : 0);
  const activeContacts = overview?.activeContacts ?? 0;

  // Real Datasets (Strictly backed by real records, empty if no historical data)
  const timeline = overview?.timeline ?? [];
  const funnel = overview?.deliveryFunnel ?? {
    sent,
    delivered,
    read,
    failed,
    deliveryConversion: deliveryRate,
    readConversion: readRate,
    failureConversion: failureRate,
  };
  const failureReasons = overview?.failureReasons ?? [];
  const campaignPerformance = overview?.campaignPerformance ?? [];
  const campaignStatusDistribution = overview?.campaignStatusDistribution ?? [];
  const templatePerformance = overview?.templatePerformance ?? [];
  const optInStats = overview?.optInStats ?? {
    optedIn: activeContacts,
    optedOut: 0,
    optedInPercentage: activeContacts > 0 ? 100 : 0,
    optedOutPercentage: 0,
    total: activeContacts,
  };
  const audienceGrowth = overview?.audienceGrowth ?? [];

  const handleApplyCustomDate = () => {
    if (customStartDate && customEndDate) {
      setAppliedCustomDates({ start: customStartDate, end: customEndDate });
    }
  };

  // Top KPI Cards
  const kpis = [
    {
      id: "total_messages",
      label: "Total Messages",
      value: total.toLocaleString(),
      note: "Total outbound attempts",
      icon: Send,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-200",
    },
    {
      id: "delivered",
      label: "Delivered",
      value: delivered.toLocaleString(),
      note: "Reaching subscriber device",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-200",
    },
    {
      id: "read",
      label: "Read",
      value: read.toLocaleString(),
      note: "Recipients opened message",
      icon: Eye,
      color: "text-indigo-600",
      bg: "bg-indigo-50/60 border-indigo-200",
    },
    {
      id: "failed",
      label: "Failed",
      value: failed.toLocaleString(),
      note: "Rejections / provider errors",
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50/60 border-rose-200",
    },
    {
      id: "delivery_rate",
      label: "Delivery Rate",
      value: `${deliveryRate.toFixed(1)}%`,
      note: "Delivered / Sent",
      icon: Zap,
      color: "text-emerald-700",
      bg: "bg-emerald-50/60 border-emerald-200",
    },
    {
      id: "read_rate",
      label: "Read Rate",
      value: `${readRate.toFixed(1)}%`,
      note: "Read / Delivered",
      icon: TrendingUp,
      color: "text-indigo-700",
      bg: "bg-indigo-50/60 border-indigo-200",
    },
    {
      id: "active_contacts",
      label: "Active Contacts",
      value: activeContacts.toLocaleString(),
      note: "Opted-in verified audience",
      icon: Users,
      color: "text-teal-700",
      bg: "bg-teal-50/60 border-teal-200",
    },
  ];

  return (
    <div className="space-y-6 pt-1">
      {/* =================================================================== */}
      {/* 12. GLOBAL DATE FILTER BAR                                          */}
      {/* =================================================================== */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Analytics Period:</span>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <RefreshCw className="size-3 animate-spin text-emerald-600" /> Refreshing...
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "7d", label: "7 Days" },
              { key: "15d", label: "15 Days" },
              { key: "30d", label: "30 Days" },
              { key: "custom", label: "Custom Range" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedRange(item.key)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-xs font-medium transition-all",
                selectedRange === item.key
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Inputs (Visible when Custom is selected) */}
      {selectedRange === "custom" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApplyCustomDate}
            disabled={!customStartDate || !customEndDate}
            className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 font-semibold"
          >
            Apply Filter
          </Button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 11. TOP 8 KPI CARDS                                                 */}
      {/* =================================================================== */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className={cn("rounded-lg border p-3.5 bg-white shadow-2xs transition-all hover:shadow-xs", kpi.bg)}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">{kpi.label}</span>
                <Icon className={cn("size-3.5", kpi.color)} />
              </div>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">
                {isLoading ? "—" : kpi.value}
              </p>
              <p className="mt-1 text-[10px] text-slate-500 line-clamp-1">{kpi.note}</p>
            </div>
          );
        })}
      </section>

      {/* =================================================================== */}
      {/* ROW 1: Message Performance Trend                                     */}
      {/* =================================================================== */}
      <div className="grid gap-5">
        {/* Message Performance Graph (Full Width) */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Messaging Performance & Volume Trend</h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Daily trajectory of outbound Sent, Delivered, Read, and Failed message events over time.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5 text-xs">
                {(
                  [
                    { key: "7d", label: "7 Days" },
                    { key: "15d", label: "15 Days" },
                    { key: "30d", label: "30 Days" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRange(r.key)}
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                      selectedRange === r.key
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="hidden xl:flex items-center gap-2.5 text-xs text-slate-500 pl-2 border-l border-slate-200">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-blue-500" /> Sent
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" /> Delivered
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-indigo-500" /> Read
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-500" /> Failed
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 h-72 w-full">
            {timeline.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <BarChart3 className="size-6" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-slate-700">No historical data available</h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  No WhatsApp messages have been logged for the selected date range. Dispatch a template or broadcast campaign to see performance trends.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderRadius: "8px",
                      border: "none",
                      color: "#F8FAFC",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                    }}
                    labelStyle={{ fontWeight: 700, color: "#94A3B8", marginBottom: "4px" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: "12px", fontSize: "11px" }}
                  />
                  <Line type="monotone" dataKey="sent" name="Sent" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="read" name="Read" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="failed" name="Failed" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* =================================================================== */}
      {/* ROW 2: Delivery Funnel & Campaign Performance                       */}
      {/* =================================================================== */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Delivery Funnel */}
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Delivery Performance Funnel</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Conversion Flow</span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              End-to-end transmission pipeline from initial dispatch to confirmed read status.
            </p>

            <div className="mt-5 space-y-4">
              {/* Funnel Step 1: Sent */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="flex size-5 items-center justify-center rounded-full bg-blue-100 text-[10px] text-blue-700 font-extrabold">
                      1
                    </span>
                    Sent
                  </div>
                  <span className="text-sm font-extrabold text-slate-900">{funnel.sent.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: "100%" }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                  <span>Outbound transmission</span>
                  <span className="font-semibold text-slate-700">100% Volume</span>
                </div>
              </div>

              {/* Conversion Step 1 -> 2 */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                <ArrowDown className="size-3.5" />
                <span>{funnel.deliveryConversion.toFixed(1)}% Delivery Rate</span>
              </div>

              {/* Funnel Step 2: Delivered */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-950">
                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700 font-extrabold">
                      2
                    </span>
                    Delivered
                  </div>
                  <span className="text-sm font-extrabold text-emerald-950">{funnel.delivered.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, funnel.deliveryConversion)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-emerald-800">
                  <span>Received on handset</span>
                  <span className="font-semibold">{funnel.deliveryConversion.toFixed(1)}% of sent</span>
                </div>
              </div>

              {/* Conversion Step 2 -> 3 */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-700">
                <ArrowDown className="size-3.5" />
                <span>{funnel.readConversion.toFixed(1)}% Read Rate</span>
              </div>

              {/* Funnel Step 3: Read */}
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-950">
                    <span className="flex size-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] text-indigo-700 font-extrabold">
                      3
                    </span>
                    Read
                  </div>
                  <span className="text-sm font-extrabold text-indigo-950">{funnel.read.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, funnel.sent > 0 ? (funnel.read / funnel.sent) * 100 : 0)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-indigo-800">
                  <span>Verified open receipts</span>
                  <span className="font-semibold">{funnel.readConversion.toFixed(1)}% of delivered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Failure Summary footer */}
          <div className="mt-4 flex items-center justify-between rounded border border-rose-100 bg-rose-50/60 p-2.5 text-xs text-rose-800">
            <span className="font-medium">Total Failed Messages:</span>
            <span className="font-bold">
              {(funnel.failed ?? failed).toLocaleString()} ({failureRate.toFixed(1)}% Failure Rate)
            </span>
          </div>
        </section>

        {/* Campaign Performance Graph */}
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Megaphone className="size-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">Campaign Performance</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Cross-campaign volume and conversion rate comparison.</p>
              </div>

              {/* Metric Switcher */}
              <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5 text-xs">
                {(["sent", "delivered", "read", "failed"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCampaignMetric(m)}
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                      campaignMetric === m
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 h-64 w-full">
              {campaignPerformance.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Megaphone className="size-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-700">No campaign performance data available</h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    No campaigns have recorded messages in this date range. Create a broadcast campaign in the Campaigns tab.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={campaignPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderRadius: "8px",
                        border: "none",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} (${campaignMetric})`,
                        `Del: ${item.payload.deliveryRate.toFixed(1)}% | Read: ${item.payload.readRate.toFixed(1)}% | Fail: ${item.payload.failureRate.toFixed(1)}%`,
                      ]}
                    />
                    <Bar
                      dataKey={campaignMetric}
                      fill={
                        campaignMetric === "sent"
                          ? "#3B82F6"
                          : campaignMetric === "delivered"
                            ? "#10B981"
                            : campaignMetric === "read"
                              ? "#8B5CF6"
                              : "#EF4444"
                      }
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Campaign Summary List */}
            {campaignPerformance.length > 0 && (
              <div className="mt-3 max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs">
                {campaignPerformance.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2">
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{c.name}</span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-700 font-medium">Del: {c.deliveryRate.toFixed(1)}%</span>
                      <span className="text-indigo-700 font-medium">Read: {c.readRate.toFixed(1)}%</span>
                      <span className="text-rose-600 font-medium">Fail: {c.failureRate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onTabChange("Campaigns")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Manage Campaigns →
            </button>
          </div>
        </section>
      </div>

      {/* =================================================================== */}
      {/* ROW 3: Template Performance & Audience Growth                       */}
      {/* =================================================================== */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Template Performance (Horizontal Bar Chart + Details) */}
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Template Performance</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Effectiveness by approved message template format.</p>
              </div>

              {/* Metric Switcher */}
              <div className="flex items-center gap-1 rounded bg-slate-100 p-0.5 text-xs">
                {(["sent", "delivered", "read", "failed"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTemplateMetric(m)}
                    className={cn(
                      "rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                      templateMetric === m
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 h-56 w-full">
              {templatePerformance.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <FileText className="size-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-700">No template performance data available</h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    No approved templates have been dispatched in this time window.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={templatePerformance}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11, fill: "#334155" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderRadius: "8px",
                        border: "none",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} ${templateMetric}`,
                        `Category: ${item.payload.category} | Lang: ${item.payload.language} | Del: ${item.payload.deliveryRate.toFixed(1)}% | Read: ${item.payload.readRate.toFixed(1)}%`,
                      ]}
                    />
                    <Bar
                      dataKey={templateMetric}
                      fill={
                        templateMetric === "sent"
                          ? "#3B82F6"
                          : templateMetric === "delivered"
                            ? "#10B981"
                            : templateMetric === "read"
                              ? "#8B5CF6"
                              : "#EF4444"
                      }
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Template Metrics Table */}
            {templatePerformance.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                {templatePerformance.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-semibold text-slate-800">{t.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {t.category} · {t.language} · {t.usageCount ?? t.total} uses
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-700 font-medium">Del: {t.deliveryRate.toFixed(1)}%</span>
                      <span className="text-indigo-700 font-medium">Read: {t.readRate.toFixed(1)}%</span>
                      <span className="text-rose-600 font-medium">Fail: {(t.failureRate ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onTabChange("Templates")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View Templates Registry →
            </button>
          </div>
        </section>

        {/* WhatsApp Audience Growth Trend */}
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">WhatsApp Audience Growth</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Subscribers over time</span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Trajectory of Total, Opted-in, Opted-out, and Active contacts.
            </p>

            <div className="mt-4 h-64 w-full">
              {audienceGrowth.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Users className="size-6" />
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-700">No historical data available</h4>
                  <p className="mt-1 max-w-sm text-xs text-slate-500">
                    No contacts were added during this time range. Add contacts in the Contacts tab to track audience trends.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={audienceGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOptIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderRadius: "8px",
                        border: "none",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalContacts"
                      name="Total Contacts"
                      stroke="#0D9488"
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="optedIn"
                      name="Opted-in"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorOptIn)"
                      strokeWidth={2}
                    />
                    <Line type="monotone" dataKey="optedOut" name="Opted-out" stroke="#EF4444" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onTabChange("Contacts")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              View Contacts Directory →
            </button>
          </div>
        </section>
      </div>

      {/* =================================================================== */}
      {/* ROW 4: Failure Diagnostics & Opt-in / Opt-out Analytics             */}
      {/* =================================================================== */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Message Failure Analysis */}
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Message Failure Analysis</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Database / Provider Codes</span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Categorization based strictly on actual provider error codes stored in the database.
            </p>

            {failureReasons.length === 0 ? (
              <div className="my-12 flex flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <ShieldCheck className="size-6" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-slate-800">100% Clean Transmission</h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  No delivery failures or provider rejections have occurred for this Client. Transmission health is optimal.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={failureReasons}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        tick={{ fontSize: 11, fill: "#334155" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "8px",
                          border: "none",
                          color: "#F8FAFC",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]}>
                        {failureReasons.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={FAILURE_COLORS[index % FAILURE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 divide-y divide-slate-100 text-xs">
                  {failureReasons.map((item, idx) => (
                    <div key={item.code} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: FAILURE_COLORS[idx % FAILURE_COLORS.length] }}
                        />
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <code className="text-[10px] text-slate-400">({item.code})</code>
                      </div>
                      <span className="font-bold text-slate-900">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onTabChange("Messages")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Inspect & Retry Failed Messages →
            </button>
          </div>
        </section>

        {/* Opt-in / Opt-out Analytics */}
        <section className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PieIcon className="size-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Opt-in / Opt-out Analytics</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Compliance & Retention</span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Proportion of audience consenting to receive promotional and transactional WhatsApp broadcasts.
            </p>

            {optInStats.total === 0 ? (
              <div className="my-12 flex flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Users className="size-6" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-slate-700">No contact records available</h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Add subscriber contacts to see opt-in vs opt-out distribution.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Opted In", value: optInStats.optedIn },
                          { name: "Opted Out", value: optInStats.optedOut },
                        ]}
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderRadius: "8px",
                          border: "none",
                          color: "#F8FAFC",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-emerald-950">
                        <UserCheck className="size-3.5 text-emerald-600" /> Opted In
                      </span>
                      <span className="font-extrabold text-emerald-950">{optInStats.optedIn.toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-800 font-semibold">
                      {optInStats.optedInPercentage.toFixed(1)}% of total contacts
                    </p>
                  </div>

                  <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-rose-950">
                        <UserMinus className="size-3.5 text-rose-600" /> Opted Out
                      </span>
                      <span className="font-extrabold text-rose-950">{optInStats.optedOut.toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-rose-800 font-semibold">
                      {optInStats.optedOutPercentage.toFixed(1)}% of total contacts
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Campaign Status Analytics Breakdown (Section 9) */}
          <div className="mt-5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Campaign Status Breakdown:</span>
              <div className="flex flex-wrap items-center gap-2">
                {campaignStatusDistribution.map((item) => (
                  <span
                    key={item.status}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: CAMPAIGN_STATUS_COLORS[item.status] ?? "#64748B" }}
                    />
                    {item.status}: {item.count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
