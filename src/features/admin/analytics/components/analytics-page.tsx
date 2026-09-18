"use client";

import { useState } from "react";
import { BarChart3, Radio, Megaphone, Search, Target, Bot } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { analyticsData } from "../data/analytics-data";
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

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

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
        {activeTab === "overview" && <OverviewTab data={analyticsData.overview} />}
        {activeTab === "channels" && <ChannelsTab data={analyticsData.channels} />}
        {activeTab === "campaigns" && <CampaignsTab data={analyticsData.campaigns} />}
        {activeTab === "seo" && <SeoTab data={analyticsData.seo} />}
        {activeTab === "crm" && <CrmTab data={analyticsData.crm} />}
        {activeTab === "automation" && <AutomationTab data={analyticsData.automation} />}
      </div>
    </div>
  );
}
