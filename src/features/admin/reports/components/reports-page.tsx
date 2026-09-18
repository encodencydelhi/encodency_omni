"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Globe2,
  Megaphone,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Users,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { useReportsDashboard } from "../hooks/use-reports";
import { cn } from "@/lib/utils/cn";
import type { ReportKpi } from "@/types/domain/reports";

const CHANNEL_COLORS: Record<string, string> = {
  meta: "#F20C20",
  linkedin: "#805AD5",
  youtube: "#EDA000",
  whatsapp: "#42BE5B",
  x: "#1DA1F2",
  google_business: "#3186F3",
  website: "#0E9C92",
};

const statTint: Record<string, string> = {
  blue: "bg-[#EAF2FF] text-[#3186F3]",
  purple: "bg-[#F2EAFF] text-[#805AD5]",
  green: "bg-[#EAF5EF] text-[#0FA968]",
  orange: "bg-[#FFF0DC] text-[#F28C28]",
  red: "bg-[#FFEAEC] text-[#EA111B]",
  teal: "bg-[#E2F6F5] text-[#0E9C92]",
};

const chartTooltip = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #DDE4ED",
    padding: "4px 8px",
  },
};

type Tab = "overview" | "channels" | "campaigns" | "leads" | "reports";

const tabs: { id: Tab; label: string; icon: typeof TrendingUp }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "channels", label: "Channels", icon: Globe2 },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "leads", label: "Leads", icon: Users },
  { id: "reports", label: "Reports", icon: FileText },
];

export function ReportsPage() {
  const { data, isLoading } = useReportsDashboard();
  const [dateRange] = useState("Last 30 days");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isLoading || !data) {
    return (
      <div className="grid h-80 place-items-center text-[12px] text-[#172044]">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-wrap items-stretch justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-[#172044]">
            Workspace <ChevronDown className="size-3 -rotate-90" /> Reports
          </div>
          <h1 className="text-[22px] font-semibold text-[#172044]">Reports & Analytics</h1>
          <p className="mt-0.5 text-[12px] text-[#172044]">
            Cross-channel performance, campaigns, leads, and revenue attribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-2 rounded border border-[#DDE4ED] bg-white px-3 text-[12px] font-semibold text-[#38444D] shadow-sm hover:bg-[#FAFBFC]">
            <CalendarDays className="size-4 text-[#182A58]" />
            <span className="text-left">
              <span className="block leading-tight">{dateRange}</span>
              <span className="mt-0.5 block text-[12px] font-normal text-[#172044]">
                Aug 18, 2025 – Sep 17, 2025
              </span>
            </span>
            <ChevronDown className="size-3.5" />
          </button>
          <button className="flex h-9 items-center gap-2 rounded border border-[#DDE4ED] bg-white px-3.5 text-[12px] font-semibold text-[#172044] shadow-sm hover:bg-[#FAFBFC]">
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 rounded-sm border border-[#DDE4ED] bg-white p-2 shadow-sm">
        {["Moksha Sewa", dateRange, "All channels", "All campaigns"].map((x) => (
          <button
            key={x}
            className="h-8 rounded-sm border border-[#DDE4ED] px-3 text-[12px] font-semibold text-[#425273]"
          >
            {x}
            <ChevronDown className="ml-1 inline size-3" />
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {data.kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      {/* Tabs */}
      <div className="scrollbar-thin flex items-center gap-6 overflow-x-auto border-b border-[#DDE4ED]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 pb-2.5 pt-1 text-[12px] font-semibold transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-[#EB0711] text-[#EB0711]"
                  : "border-transparent text-[#172044] hover:text-[#38444D]",
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "channels" && <ChannelsTab data={data} />}
      {activeTab === "campaigns" && <CampaignsTab data={data} />}
      {activeTab === "leads" && <LeadsTab data={data} />}
      {activeTab === "reports" && <ReportsTab data={data} />}
    </div>
  );
}

/* ──────────────────── OVERVIEW TAB ──────────────────── */

function OverviewTab({ data }: { data: NonNullable<ReturnType<typeof useReportsDashboard>["data"]> }) {
  return (
    <>
      <div className="grid items-stretch gap-2 lg:grid-cols-[1.3fr_0.7fr]">
        <Panel title="Performance Trend" action="15 days" className="h-[320px]">
          <div className="h-full px-2 pb-2 pt-1">
            <ResponsiveContainer>
              <AreaChart data={data.performanceTrend} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#EDF1F7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#172044" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#172044" }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Area dataKey="reach" name="Reach" stroke="#3186F3" fill="#3186F310" strokeWidth={1.5} />
                <Area dataKey="engagement" name="Engagement" stroke="#805AD5" fill="transparent" strokeWidth={1.5} />
                <Area dataKey="leads" name="Leads" stroke="#10B981" fill="transparent" strokeWidth={1.5} />
                <Area dataKey="conversions" name="Conversions" stroke="#F28C28" fill="transparent" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Channel Contribution">
          <div className="divide-y divide-[#E8EDF3]">
            {data.channelPerformance.map((ch) => (
              <div key={ch.channel} className="flex items-center gap-2 px-3 py-2">
                <ChannelLogo channel={ch.channelLabel} className="size-7 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-[#172044]">{ch.channelLabel}</span>
                  <span className="block text-[12px] text-[#172044]">
                    {ch.leads} leads · ₹{(ch.spend / 1000).toFixed(0)}K spend
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-[12px] font-bold text-[#172044]">{ch.roi}x ROAS</span>
                  <span className={cn("block text-[12px] font-semibold", ch.trend >= 0 ? "text-[#00A66A]" : "text-[#EA111B]")}>
                    {ch.trend >= 0 ? "↑" : "↓"} {Math.abs(ch.trend)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid items-stretch gap-2 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Revenue Attribution" className="h-[320px]">
          <div className="h-full px-2 pb-2 pt-1">
            <ResponsiveContainer>
              <BarChart data={data.revenueAttribution} layout="vertical" margin={{ top: 6, right: 4, left: 20, bottom: 0 }}>
                <CartesianGrid stroke="#EDF1F7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#172044" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="channelLabel" tick={{ fontSize: 11, fill: "#172044" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                <Bar dataKey="spend" name="Spend" fill="#EB0711" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Pipeline Overview" className="h-[320px]">
          <div className="grid h-full grid-cols-6 items-end gap-2 px-4 pb-8 pt-4">
            {data.pipeline.map((stage, i) => {
              const colors = ["#3186F3", "#805AD5", "#10B981", "#F28C28", "#EB0711", "#0E9C92"];
              return (
                <div key={stage.stage} className="flex h-full flex-col items-center justify-end gap-1">
                  <b className="text-[12px] font-bold text-[#172044]">{stage.count}</b>
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{ height: `${stage.percentage * 3}%`, background: colors[i % colors.length] }}
                  />
                  <span className="text-center text-[10px] leading-tight font-semibold text-[#172044]">{stage.stage}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ──────────────────── CHANNELS TAB ──────────────────── */

function ChannelsTab({ data }: { data: NonNullable<ReturnType<typeof useReportsDashboard>["data"]> }) {
  return (
    <>
      <div className="grid items-stretch gap-2 lg:grid-cols-[1fr_1fr]">
        <Panel title="Channel Performance Comparison" className="h-[320px]">
          <div className="h-full px-2 pb-2 pt-1">
            <ResponsiveContainer>
              <BarChart data={data.channelPerformance} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#EDF1F7" vertical={false} />
                <XAxis dataKey="channelLabel" tick={{ fontSize: 11, fill: "#172044" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#172044" }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="engagement" name="Engagement" fill="#805AD5" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="leads" name="Leads" fill="#10B981" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Lead Sources" className="h-[320px]">
          <div className="flex h-full items-center gap-2 px-3 py-3">
            <div className="relative size-[150px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.leadSources}
                    dataKey="leads"
                    nameKey="channelLabel"
                    innerRadius={42}
                    outerRadius={62}
                    strokeWidth={0}
                  >
                    {data.leadSources.map((s) => (
                      <Cell key={s.channel} fill={CHANNEL_COLORS[s.channel] ?? "#999"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[16px] font-bold text-[#172044]">
                    {data.leadSources.reduce((a, b) => a + b.leads, 0).toLocaleString()}
                  </b>
                  <small className="text-[12px] font-semibold text-[#172044]">Total Leads</small>
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.leadSources.map((s) => (
                <div key={s.channel} className="flex items-center gap-2 text-[12px] leading-6">
                  <i
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: CHANNEL_COLORS[s.channel] }}
                  />
                  <span className="flex-1 whitespace-nowrap font-medium text-[#172044]">{s.channelLabel}</span>
                  <b className="tabular-nums text-[#172044]">{s.percentage}%</b>
                  <span className="min-w-[28px] text-right tabular-nums text-[#172044]">({s.leads})</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Top Performing Content">
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#172044]">
              <tr>
                <th className="px-3 py-2">Content</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2 text-right">Impressions</th>
                <th className="px-3 py-2 text-right">Engagement</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.topContent.map((item) => (
                <tr key={item.id} className="text-[12px] text-[#354568]">
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#172044]">{item.title}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <ChannelLogo channel={item.channelLabel} className="size-5 shrink-0" />
                      <span className="text-[12px] font-semibold text-[#354568]">{item.channelLabel}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{item.impressions.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{item.engagement.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{item.clicks.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-[#172044]">{item.postedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Channel Details">
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#172044]">
              <tr>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2 text-right">Reach</th>
                <th className="px-3 py-2 text-right">Impressions</th>
                <th className="px-3 py-2 text-right">Engagement</th>
                <th className="px-3 py-2 text-right">Eng. Rate</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.channelPerformance.map((ch) => (
                <tr key={ch.channel} className="text-[12px] text-[#354568]">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <ChannelLogo channel={ch.channelLabel} className="size-5 shrink-0" />
                      <span className="text-[12px] font-semibold text-[#354568]">{ch.channelLabel}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ch.reach.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ch.impressions.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[#172044]">{ch.engagement.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ch.engagementRate}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ch.clicks.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">₹{(ch.spend / 1000).toFixed(0)}K</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("font-bold tabular-nums", ch.roi >= 4 ? "text-[#078359]" : ch.roi >= 3 ? "text-[#B27818]" : "text-[#D91521]")}>
                      {ch.roi}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ──────────────────── CAMPAIGNS TAB ──────────────────── */

function CampaignsTab({ data }: { data: NonNullable<ReturnType<typeof useReportsDashboard>["data"]> }) {
  return (
    <>
      <Panel title="Campaign Performance">
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#172044]">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Budget</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">CPL</th>
                <th className="px-3 py-2 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.campaignReports.map((c) => (
                <tr key={c.id} className="text-[12px] text-[#354568]">
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#172044]">{c.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <ChannelLogo channel={c.channelLabel} className="size-5 shrink-0" />
                      <span className="text-[12px] font-semibold text-[#354568]">{c.channelLabel}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[12px] font-bold",
                        c.status === "active"
                          ? "bg-[#E5F7EF] text-[#078359]"
                          : c.status === "paused"
                            ? "bg-[#FFF3DC] text-[#B27818]"
                            : "bg-[#EEF1F6] text-[#172044]",
                      )}
                    >
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">₹{(c.budget / 1000).toFixed(0)}K</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">₹{(c.spend / 1000).toFixed(0)}K</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[#172044]">{c.leads}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">₹{c.cpl}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("font-bold tabular-nums", c.roas >= 4 ? "text-[#078359]" : c.roas >= 3 ? "text-[#B27818]" : "text-[#D91521]")}>
                      {c.roas}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid items-stretch gap-2 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Revenue by Channel" className="h-[300px]">
          <div className="h-full px-2 pb-2 pt-1">
            <ResponsiveContainer>
              <BarChart data={data.revenueAttribution} layout="vertical" margin={{ top: 6, right: 4, left: 20, bottom: 0 }}>
                <CartesianGrid stroke="#EDF1F7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#172044" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="channelLabel" tick={{ fontSize: 11, fill: "#172044" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                <Bar dataKey="spend" name="Spend" fill="#EB0711" radius={[0, 3, 3, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Budget Utilization">
          <div className="space-y-3 p-3">
            {data.campaignReports.slice(0, 4).map((c) => {
              const pct = Math.round((c.spend / c.budget) * 100);
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[#172044]">{c.name}</span>
                    <span className="font-bold text-[#172044]">
                      ₹{(c.spend / 1000).toFixed(0)}K <span className="font-normal text-[#172044]">/ ₹{(c.budget / 1000).toFixed(0)}K</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[#EDF1F7]">
                    <div
                      className={cn("h-full rounded-sm transition-all duration-500", pct > 90 ? "bg-[#EB0711]" : pct > 70 ? "bg-[#F28C28]" : "bg-[#10B981]")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ──────────────────── LEADS TAB ──────────────────── */

function LeadsTab({ data }: { data: NonNullable<ReturnType<typeof useReportsDashboard>["data"]> }) {
  return (
    <>
      <div className="grid items-stretch gap-2 lg:grid-cols-[1fr_1fr]">
        <Panel title="Lead Sources" className="h-[320px]">
          <div className="flex h-full items-center gap-2 px-3 py-3">
            <div className="relative size-[150px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.leadSources}
                    dataKey="leads"
                    nameKey="channelLabel"
                    innerRadius={42}
                    outerRadius={62}
                    strokeWidth={0}
                  >
                    {data.leadSources.map((s) => (
                      <Cell key={s.channel} fill={CHANNEL_COLORS[s.channel] ?? "#999"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[16px] font-bold text-[#172044]">
                    {data.leadSources.reduce((a, b) => a + b.leads, 0).toLocaleString()}
                  </b>
                  <small className="text-[12px] font-semibold text-[#172044]">Total Leads</small>
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.leadSources.map((s) => (
                <div key={s.channel} className="flex items-center gap-2 text-[12px] leading-6">
                  <i
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: CHANNEL_COLORS[s.channel] }}
                  />
                  <span className="flex-1 whitespace-nowrap font-medium text-[#172044]">{s.channelLabel}</span>
                  <b className="tabular-nums text-[#172044]">{s.percentage}%</b>
                  <span className="min-w-[28px] text-right tabular-nums text-[#172044]">({s.leads})</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Pipeline Overview">
          <div className="space-y-2 p-3">
            {data.pipeline.map((stage, i) => {
              const colors = ["#3186F3", "#805AD5", "#10B981", "#F28C28", "#EB0711", "#0E9C92"];
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-[#172044]">{stage.stage}</span>
                    <span className="font-bold text-[#172044]">
                      {stage.count} <span className="font-normal text-[#172044]">({stage.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-[#EDF1F7]">
                    <div
                      className="h-full rounded-sm transition-all duration-500"
                      style={{ width: `${stage.percentage * 3}%`, background: colors[i % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Leads by Channel">
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[600px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#172044]">
              <tr>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">Share</th>
                <th className="px-3 py-2 text-right">Conv. Rate</th>
                <th className="px-3 py-2">Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.leadSources.map((s) => (
                <tr key={s.channel} className="text-[12px] text-[#354568]">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <ChannelLogo channel={s.channelLabel} className="size-5 shrink-0" />
                      <span className="text-[12px] font-semibold text-[#354568]">{s.channelLabel}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[#172044]">{s.leads}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{s.percentage}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{s.conversionRate}%</td>
                  <td className="px-3 py-2.5">
                    <div className="h-1.5 overflow-hidden rounded-sm bg-[#EDF1F7]">
                      <div
                        className="h-full rounded-sm"
                        style={{ width: `${s.percentage}%`, background: CHANNEL_COLORS[s.channel] }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ──────────────────── REPORTS TAB ──────────────────── */

function ReportsTab({ data }: { data: NonNullable<ReturnType<typeof useReportsDashboard>["data"]> }) {
  return (
    <>
      <div className="grid items-stretch gap-2 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Report Templates"

          action={
            <button className="flex items-center gap-1 text-[12px] font-semibold text-[#EB0711]">
              <Plus className="size-3.5" />
              Create
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-2 p-2 xl:grid-cols-3">
            {data.templates.map((t) => (
              <article
                key={t.id}
                className="group rounded-sm border border-[#E4EAF2] bg-[#FBFCFE] p-2.5 transition-colors hover:border-[#C9D6E8] hover:bg-white"
              >
                <span className="grid size-8 place-items-center rounded-sm bg-[#EAF2FF] text-[#3186F3]">
                  <FileText className="size-4" />
                </span>
                <b className="mt-1.5 block truncate text-[12px] font-semibold text-[#172044]">{t.name}</b>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#172044]">{t.detail}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[12px] text-[#172044]">{t.sections.length} sections</span>
                  <button className="rounded border border-[#DDE4ED] bg-white px-2 py-0.5 text-[12px] font-semibold text-[#EB0711]">
                    Use
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <div className="space-y-2">
          <Panel title="Quick Export">
            <div className="grid grid-cols-1 gap-1 p-2">
              {[
                { label: "Full marketing report", format: "PDF" },
                { label: "Campaign performance", format: "CSV" },
                { label: "Lead attribution data", format: "CSV" },
                { label: "Revenue breakdown", format: "Excel" },
                { label: "Channel comparison", format: "PDF" },
              ].map((row) => (
                <button
                  key={row.label}
                  className="flex items-center gap-2 rounded border border-[#E4EAF2] px-2 py-1.5 text-left text-[12px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]"
                >
                  <Download className="size-3.5 shrink-0 text-[#172044]" />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  <span className="w-fit rounded bg-[#EEF1F6] px-1.5 py-0.5 text-[12px] font-semibold text-[#172044]">
                    {row.format}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Report Usage">
            <div className="space-y-2 p-3">
              {[
                { label: "Reports generated", current: "18", max: "25", percent: 72 },
                { label: "PDF exports", current: "12", max: "20", percent: 60 },
                { label: "Scheduled reports", current: "4", max: "6", percent: 67 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[12px]">
                    <span className="font-semibold text-[#172044]">{item.label}</span>
                    <span className="font-bold text-[#172044]">
                      {item.current} <span className="font-normal text-[#172044]">/ {item.max}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-[#EDF1F7]">
                    <div
                      className="h-full rounded-sm bg-[#EB0711]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid items-stretch gap-2 xl:grid-cols-[2fr_1fr]">
        <Panel
          title="Scheduled Reports"
          action={
            <div className="flex items-center gap-1.5">
              <FilterButton label="All types" />
              <FilterButton label="All statuses" />
            </div>
          }
        >
          <div className="overflow-x-auto px-2">
            <div className="sticky top-0 z-10 grid grid-cols-[1.5fr_0.7fr_1.3fr_0.66fr_0.8fr_0.5fr_0.7fr] gap-2 bg-white py-2 text-[12px] font-semibold text-[#172044]">
              <span>Report</span>
              <span>Type</span>
              <span>Frequency</span>
              <span className="text-right">Recipients</span>
              <span>Next Run</span>
              <span>Format</span>
              <span className="text-right">Status</span>
            </div>
            {data.scheduledReports.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.5fr_0.7fr_1.3fr_0.66fr_0.8fr_0.5fr_0.7fr] items-center gap-2 border-t border-[#EDF1F5] py-2 text-[12px] text-[#172044]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-3.5 shrink-0 text-[#172044]" />
                  <b className="truncate text-[12px] text-[#172044]">{row.name}</b>
                </span>
                <span className="truncate">{row.type}</span>
                <span className="truncate capitalize">{row.frequency}</span>
                <span className="text-right">
                  <b className="text-[#172044]">{row.recipients}</b>
                </span>
                <span className="whitespace-nowrap">{row.nextRun}</span>
                <span className="w-fit rounded bg-[#EEF1F6] px-1.5 py-0.5 text-[12px] font-semibold text-[#172044] uppercase">
                  {row.format}
                </span>
                <span className="flex items-center justify-end gap-2">
                  <span
                    className={cn(
                      "w-fit rounded px-1.5 py-0.5 text-[12px] font-bold",
                      row.active ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#EEF1F6] text-[#172044]",
                    )}
                  >
                    {row.active ? "Active" : "Paused"}
                  </span>
                  <Toggle on={row.active} />
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Report History"
          className="h-[400px]"
          action={
            <span className="flex h-7 w-[160px] items-center gap-1.5 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-2">
              <Search className="size-3.5 text-[#172044]" />
              <input
                className="w-full bg-transparent text-[12px] outline-none placeholder:text-[#172044]"
                placeholder="Search history..."
              />
            </span>
          }
        >
          <div className="max-h-[350px] overflow-y-auto px-2">
            <div className="sticky top-0 z-10 grid grid-cols-[1.5fr_0.9fr_1.2fr_0.56fr_0.5fr_0.6fr_0.4fr] gap-2 bg-white py-2 text-[12px] font-semibold text-[#172044]">
              <span>Report</span>
              <span>Period</span>
              <span>Generated</span>
              <span className="text-right">Size</span>
              <span>Format</span>
              <span>Status</span>
              <span className="text-right">Get</span>
            </div>
            {data.reportHistory.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1.5fr_0.9fr_1.2fr_0.56fr_0.5fr_0.6fr_0.4fr] items-center gap-2 border-t border-[#EDF1F5] py-2 text-[12px] text-[#172044]"
              >
                <b className="truncate text-[12px] text-[#172044]">{row.name}</b>
                <span className="truncate">{row.period}</span>
                <span className="truncate">{row.generatedAt}</span>
                <span className="text-right">{row.size}</span>
                <span className="w-fit rounded bg-[#EEF1F6] px-1.5 py-0.5 text-[12px] font-semibold text-[#172044] uppercase">
                  {row.format}
                </span>
                <span
                  className={cn(
                    "w-fit rounded px-1.5 py-0.5 text-[12px] font-bold",
                    row.status === "sent" ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#FFE8EA] text-[#D91521]",
                  )}
                >
                  {row.status === "sent" ? "Sent" : "Failed"}
                </span>
                <span className="flex items-center justify-end gap-1">
                  <button className="rounded p-0.5 text-[#3186F3] hover:bg-[#EAF2FF]">
                    <Download className="size-4" />
                  </button>
                  <button className="rounded p-0.5 text-[#EF4444] hover:bg-[#FFEAEC]">
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Recipients"
        action={
          <button className="flex items-center gap-1 text-[12px] font-semibold text-[#EB0711]">
            <Plus className="size-3.5" />
            Add
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
          {data.recipients.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2 border-b border-[#EDF1F5] p-3 sm:border-r lg:last:border-r-0"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#EAF2FF] text-[12px] font-bold text-[#1A6BC4]">
                {row.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[12px] font-semibold text-[#172044]">{row.name}</b>
                <small className="block truncate text-[12px] text-[#172044]">{row.email}</small>
              </span>
              <span className="shrink-0 text-right">
                <span className="w-fit rounded bg-[#EEF1F6] px-1.5 py-0.5 text-[12px] font-semibold text-[#172044]">
                  {row.role}
                </span>
                <small className="mt-0.5 block text-[12px] text-[#172044]">{row.reportCount} reports</small>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ──────────────────── SHARED COMPONENTS ──────────────────── */

function KpiCard({ kpi, index }: { kpi: ReportKpi; index: number }) {
  const icons: Array<typeof TrendingUp> = [TrendingUp, Users, Target, BarChart3, TrendingUp, Sparkles];
  const colors = ["blue", "purple", "green", "red", "blue", "teal"] as const;
  const Icon = icons[index % icons.length] ?? TrendingUp;
  const color = colors[index % colors.length] ?? "blue";

  return (
    <div className="flex min-h-[76px] items-center gap-2 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_3px_rgb(47_44_42/0.035)]">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm", statTint[color])}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-[#172044]">{kpi.label}</p>
        <div className="flex items-baseline gap-1.5">
          <b className="text-[22px] font-semibold tracking-[-0.02em] text-[#142044]">{kpi.value}</b>
          {kpi.delta && (
            <span
              className={cn(
                "whitespace-nowrap text-[12px] font-semibold",
                kpi.delta.direction === "up-is-good"
                  ? kpi.delta.changePercent >= 0
                    ? "text-[#00A66A]"
                    : "text-[#EA111B]"
                  : kpi.delta.changePercent >= 0
                    ? "text-[#EA111B]"
                    : "text-[#00A66A]",
              )}
            >
              {kpi.delta.changePercent >= 0 ? "↑" : "↓"} {Math.abs(kpi.delta.changePercent)}%
            </span>
          )}
        </div>
        <p className="truncate text-[12px] text-[#172044]">{kpi.hint}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-sm", className)}>
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[#E8EDF3] px-3">
        <h2 className="truncate text-[12px] font-semibold text-[#172044]">{title}</h2>
        {action && (
          <div className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[#172044]">
            {action}
          </div>
        )}
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <button className="flex h-7 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-2 text-[12px] font-semibold text-[#172044]">
      {label}
      <ChevronDown className="size-3" />
    </button>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative block h-4 w-7 shrink-0 rounded-sm transition-colors",
        on ? "bg-[#10B981]" : "bg-[#CBD5E1]",
      )}
    >
      <i
        className={cn(
          "absolute top-0.5 block size-3 rounded-sm bg-white shadow-sm transition-all",
          on ? "left-[14px]" : "left-0.5",
        )}
      />
    </span>
  );
}
