"use client";

import { useState } from "react";
import { BarChart3, Radio, Megaphone, Search, Target, Bot } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsDashboardData } from "../data/analytics-data";
import { useAnalyticsDashboard } from "../hooks/use-analytics";
import { OverviewTab } from "./overview-tab";
import { ChannelsTab } from "./channels-tab";
import { CampaignsTab } from "./campaigns-tab";
import { SeoTab } from "./seo-tab";
import { CrmTab } from "./crm-tab";
import { AutomationTab } from "./automation-tab";

const tabs = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "channels", label: "Channels", icon: Radio },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "seo", label: "SEO", icon: Search },
  { key: "crm", label: "CRM", icon: Target },
  { key: "automation", label: "Automation", icon: Bot },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const emptyAnalyticsData: AnalyticsDashboardData = {
  overview: {
    kpis: [],
    trend: [],
    channels: [],
    topCampaigns: [],
    activity: [],
  },
  channels: {
    meta: { kpis: [], trend: [], topContent: [] },
    youtube: { kpis: [], trend: [], topContent: [] },
    x: { kpis: [], trend: [], topContent: [] },
    whatsapp: { kpis: [], trend: [], topContent: [] },
    gmb: { kpis: [], trend: [], topContent: [] },
    website: { kpis: [], trend: [], topContent: [] },
  },
  campaigns: {
    summary: [],
    list: [],
    spendTrend: [],
    channelRoi: [],
    funnel: [],
  },
  seo: {
    kpis: [],
    keywords: [],
    trend: [],
    technical: { issues: [], score: 0 },
    topPages: [],
  },
  crm: {
    pipeline: [],
    sources: [],
    leadsTrend: [],
    recentLeads: [],
    team: [],
  },
  automation: {
    kpis: [],
    successTrend: [],
    workflows: [],
    runs: [],
    queues: [],
  },
};

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { data: liveData, isLoading, error, refetch } = useAnalyticsDashboard();

  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  if (isLoading || !liveData) {
    return (
      <div className="grid h-80 place-items-center text-[12px] text-[#5E6D89]">
        Loading live analytics...
      </div>
    );
  }

  const overviewData: AnalyticsDashboardData["overview"] = {
    kpis: liveData.overview?.kpis || [],
    trend: (liveData.overview?.trend || liveData.overview?.performanceTrend?.series)?.length
      ? ((liveData.overview.trend || liveData.overview.performanceTrend?.series) as any[]).map((s) => ({
          key: s.key || s.id || s.name?.toLowerCase() || "trend",
          label: s.label || s.name || "Trend",
          color: s.color || "#EB0711",
          data: Array.isArray(s.data)
            ? s.data.map((d: any, idx: number) =>
                typeof d === "object" && d !== null
                  ? { date: String(d.date ?? `Day ${idx + 1}`), value: Number(d.value ?? 0) }
                  : { date: liveData.overview?.performanceTrend?.dates?.[idx] || `Day ${idx + 1}`, value: Number(d ?? 0) }
              )
            : [],
        }))
      : [],
    channels: (liveData.overview?.channels || liveData.overview?.channelContribution)?.length
      ? ((liveData.overview.channels || liveData.overview.channelContribution) as any[]).map((c) => ({
          key: c.key || c.name?.toLowerCase().replace(/\s+/g, "_") || "ch",
          label: c.label || c.name || "Channel",
          value: c.value,
          color: c.color,
        }))
      : [],
    topCampaigns: Array.isArray(liveData.overview?.topCampaigns)
      ? (liveData.overview.topCampaigns as any[]).map((c) => ({
          name: c.name,
          leads: c.leads ?? 0,
          conversions: c.conversions ?? 0,
          score: c.score ?? 0,
        }))
      : [],
    activity: (liveData.overview?.activity || liveData.overview?.liveActivity)?.length
      ? ((liveData.overview.activity || liveData.overview.liveActivity) as any[]).map((a) => ({
          id: a.id,
          title: a.title,
          meta: a.meta || a.description || "",
          occurredAt: a.occurredAt || a.timestamp || "",
          kind: (a.kind || a.type || "lead") as any,
        }))
      : [],
  };

  return (
    <div className="space-y-2">
      <nav className="flex flex-wrap gap-1 rounded-sm border border-[#DDE4ED] bg-white p-1 shadow-xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 rounded-sm px-3 py-2 text-[12px] font-semibold transition-colors cursor-pointer",
              activeTab === tab.key
                ? "bg-[#FFF0F1] text-[#EB0711]"
                : "text-[#5E6D89] hover:bg-slate-50"
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
        {activeTab === "overview" && <OverviewTab data={overviewData} />}
        {activeTab === "channels" && <ChannelsTab data={liveData.channels ?? emptyAnalyticsData.channels} />}
        {activeTab === "campaigns" && <CampaignsTab data={liveData.campaigns ?? emptyAnalyticsData.campaigns} />}
        {activeTab === "seo" && <SeoTab data={liveData.seo ?? emptyAnalyticsData.seo} />}
        {activeTab === "crm" && <CrmTab data={liveData.crm ?? emptyAnalyticsData.crm} />}
        {activeTab === "automation" && <AutomationTab data={liveData.automation ?? emptyAnalyticsData.automation} />}
      </div>
    </div>
  );
}
