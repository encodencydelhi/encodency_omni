"use client";

import { useState } from "react";
import { TrendAreaChart, ChartLegend } from "@/components/shared/charts/trend-area-chart";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsDashboardData } from "../data/analytics-data";
import {
  TrendingUp,
  Share2, Video, Hash, MessageCircle, Landmark, Globe2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const channelKeys = ["meta", "youtube", "x", "whatsapp", "gmb", "website"] as const;
const channelLabels: Record<string, string> = {
  meta: "Meta & Instagram",
  youtube: "YouTube",
  x: "X / Twitter",
  whatsapp: "WhatsApp",
  gmb: "Google Business",
  website: "Website",
};

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  meta: Share2,
  youtube: Video,
  x: Hash,
  whatsapp: MessageCircle,
  gmb: Landmark,
  website: Globe2,
};

const ICON_COLORS: Record<string, string> = {
  meta: "from-[#0866FF] to-[#60A5FA]",
  youtube: "from-[#FF0000] to-[#FCA5A5]",
  x: "from-[#0F1419] to-[#64748B]",
  whatsapp: "from-[#25D366] to-[#6EE7B7]",
  gmb: "from-[#4285F4] to-[#93C5FD]",
  website: "from-[#2563EB] to-[#93C5FD]",
};

function KpiCard({ kpi, channelKey }: { kpi: AnalyticsDashboardData["channels"][keyof AnalyticsDashboardData["channels"]]["kpis"][number]; channelKey: string }) {
  const Icon = CHANNEL_ICONS[channelKey] ?? Share2;
  const colorClass = ICON_COLORS[channelKey] ?? ICON_COLORS.meta;
  const isUp = (kpi.delta?.changePercent ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-1 rounded-sm border border-[#DDE4ED] bg-white p-2 shadow-xs transition-all hover:shadow-md hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium uppercase tracking-wider text-[#354568] truncate">{kpi.label}</p>
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br", colorClass)}>
          <Icon className="size-2.5 text-white" />
        </span>
      </div>
      <p className="text-[16px] font-bold leading-none tracking-tight tabular text-[#101A3D]">{kpi.value}</p>
      <div className="flex items-center gap-1">
        <span className={cn(
          "inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-[12px] font-semibold",
          isUp ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#FFE8EA] text-[#D91521]"
        )}>
          <TrendingUp className={cn("size-2.5", !isUp && "rotate-180")} />
          {kpi.delta ? `${kpi.delta.changePercent > 0 ? "+" : ""}${kpi.delta.changePercent}%` : "—"}
        </span>
      </div>
      {kpi.hint && <p className="text-[12px] text-[#354568] truncate">{kpi.hint}</p>}
    </div>
  );
}

export function ChannelsTab({ data }: { data: AnalyticsDashboardData["channels"] }) {
  const [active, setActive] = useState<string>("meta");
  const channel = data[active as keyof typeof data];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-sm border border-[#DDE4ED] bg-white p-1 shadow-xs">
        {channelKeys.map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "flex items-center gap-2 rounded-sm px-3 py-2 text-[12px] font-semibold transition-colors cursor-pointer",
              active === key
                ? "bg-[#FFF0F1] text-[#EB0711]"
                : "text-[#354568] hover:bg-slate-50"
            )}
          >
            <ChannelLogo channel={channelLabels[key]} className="size-4" />
            {channelLabels[key]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {channel.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} channelKey={active} />
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.4fr_.6fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Performance Trend
          </h2>
          <div className="p-3">
            <TrendAreaChart series={channel.trend} height={220} />
            <div className="mt-2">
              <ChartLegend series={channel.trend} />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Top Content
          </h2>
          <div className="divide-y divide-[#E8EDF3]">
            {channel.topContent.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                <ChannelLogo channel={channelLabels[active]} className="size-5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#354568] truncate">{item.title}</p>
                  <p className="text-[12px] text-[#354568]">{item.metric}</p>
                </div>
                <span className="shrink-0 text-[12px] font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
