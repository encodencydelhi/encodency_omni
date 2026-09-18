"use client";

import { TrendAreaChart, ChartLegend } from "@/components/shared/charts/trend-area-chart";
import { DonutChart } from "@/components/shared/charts/donut-chart";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsDashboardData } from "../data/analytics-data";
import {
  Users, Eye, Radio, Megaphone, Percent, BarChart3, Star, Bot,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "Total Leads": Users,
  "Website Visits": Eye,
  "Social Reach": Radio,
  "Active Campaigns": Megaphone,
  "Conversion Rate": Percent,
  "SEO Score": BarChart3,
  "GMB Rating": Star,
  "Automation Runs": Bot,
};

const ICON_COLORS = [
  "from-[#EB0711] to-[#F6A1A7]",
  "from-[#2563EB] to-[#93C5FD]",
  "from-[#078359] to-[#6EE7B7]",
  "from-[#8B5CF6] to-[#C4B5FD]",
  "from-[#F59E0B] to-[#FCD34D]",
  "from-[#0EA5E9] to-[#7DD3FC]",
  "from-[#EC4899] to-[#F9A8D4]",
  "from-[#14B8A6] to-[#5EEAD4]",
];

function KpiCard({ kpi, index }: { kpi: AnalyticsDashboardData["overview"]["kpis"][number]; index: number }) {
  const Icon = ICONS[kpi.label];
  const colorClass = ICON_COLORS[index % ICON_COLORS.length];
  const isUp = (kpi.delta?.changePercent ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-1 rounded-sm border border-[#DDE4ED] bg-white p-2 shadow-xs transition-all hover:shadow-md hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium uppercase tracking-wider text-[#354568] truncate">{kpi.label}</p>
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br", colorClass)}>
          {Icon && <Icon className="size-2.5 text-white" />}
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

export function OverviewTab({ data }: { data: AnalyticsDashboardData["overview"] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 lg:grid-cols-8">
        {data.kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.3fr_.7fr]">
        <section className="flex flex-col h-[260px] overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Performance Trend
          </h2>
          <div className="p-3 flex-1 flex flex-col justify-between">
            <TrendAreaChart series={data.trend} height={160} />
            <div className="mt-1">
              <ChartLegend series={data.trend} />
            </div>
          </div>
        </section>

        <section className="flex flex-col h-[260px] overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Channel Contribution
          </h2>
          <div className="flex items-center gap-3 p-3 flex-1">
            <DonutChart
              segments={data.channels}
              centerValue="86.5K"
              centerLabel="Total Reach"
              size={120}
            />
            <ul className="flex-1 space-y-1">
              {data.channels.map((ch) => (
                <li key={ch.key} className="flex items-center gap-2 rounded-sm px-2 py-1">
                  <ChannelLogo channel={ch.label} className="size-4" />
                  <span className="flex-1 text-[11.5px] font-medium">{ch.label}</span>
                  <span className="text-[11.5px] font-semibold">{ch.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Top Campaigns
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
                <tr>
                  <th className="px-3 py-2">Campaign</th>
                  <th className="px-3 py-2 text-right">Leads</th>
                  <th className="px-3 py-2 text-right">Conv.</th>
                  <th className="px-3 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF3]">
                {data.topCampaigns.map((c) => (
                  <tr key={c.name}>
                    <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{c.name}</td>
                    <td className="px-3 py-2 text-right text-[12px]">{c.leads}</td>
                    <td className="px-3 py-2 text-right text-[12px]">{c.conversions}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${
                        c.score >= 80 ? "bg-[#E5F7EF] text-[#078359]"
                          : c.score >= 60 ? "bg-[#FEF3CD] text-[#92700C]"
                          : "bg-[#FFE8EA] text-[#D91521]"
                      }`}>
                        {c.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Live Activity
          </h2>
          <div className="divide-y divide-[#E8EDF3]">
            {data.activity.map((item) => (
              <div key={item.id} className="flex items-start gap-2 px-3 py-2.5">
                <div className={`mt-0.5 size-2 shrink-0 rounded-full ${
                  item.kind === "publish" ? "bg-[#2563EB]"
                    : item.kind === "lead" ? "bg-[#078359]"
                    : item.kind === "seo" ? "bg-[#8B5CF6]"
                    : "bg-[#EB0711]"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#354568] truncate">{item.title}</p>
                  <p className="text-[12px] text-[#354568]">{item.meta}</p>
                </div>
                <span className="shrink-0 text-[12px] text-[#354568]">{item.occurredAt}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
