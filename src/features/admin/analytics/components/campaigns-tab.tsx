"use client";

import { MonthlyBarChart } from "@/components/shared/charts/monthly-bar-chart";
import { DonutChart } from "@/components/shared/charts/donut-chart";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsDashboardData } from "../data/analytics-data";
import { Megaphone, Play, Users, Wallet, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CAMPAIGN_ICONS: LucideIcon[] = [Megaphone, Play, Users, Wallet];

const ICON_COLORS = [
  "from-[#EB0711] to-[#F6A1A7]",
  "from-[#078359] to-[#6EE7B7]",
  "from-[#2563EB] to-[#93C5FD]",
  "from-[#F59E0B] to-[#FCD34D]",
];

function KpiCard({ kpi, index }: { kpi: AnalyticsDashboardData["campaigns"]["summary"][number]; index: number }) {
  const Icon = CAMPAIGN_ICONS[index];
  const colorClass = ICON_COLORS[index % ICON_COLORS.length];
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

function FunnelBar({ label, value, pct, max }: { label: string; value: number; pct: string; max: number }) {
  const width = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[12px] text-[#354568]">{label}</span>
      <div className="flex-1 h-5 rounded-sm bg-[#E9EDF3]">
        <div className="h-full rounded-sm bg-[#EB0711]" style={{ width: `${width}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-[12px] font-medium">{value.toLocaleString()}</span>
      <span className="w-12 shrink-0 text-right text-[12px] text-[#354568]">{pct}</span>
    </div>
  );
}

export function CampaignsTab({ data }: { data: AnalyticsDashboardData["campaigns"] }) {
  const funnelMax = data.funnel[0]?.value ?? 1;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {data.summary.map((kpi, i) => (
          <KpiCard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
        <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
          Campaign Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Channels</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">Leads</th>
                <th className="px-3 py-2 text-right">Conv.</th>
                <th className="px-3 py-2 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.list.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{row.name}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${
                      row.status === "Active" ? "bg-[#E5F7EF] text-[#078359]"
                        : row.status === "Completed" ? "bg-[#E8F0FE] text-[#2563EB]"
                        : "bg-[#FEF3CD] text-[#92700C]"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[#354568]">{row.channels}</td>
                  <td className="px-3 py-2 text-right text-[12px] font-medium">{row.spend}</td>
                  <td className="px-3 py-2 text-right text-[12px]">{row.leads}</td>
                  <td className="px-3 py-2 text-right text-[12px]">{row.conversions}</td>
                  <td className="px-3 py-2 text-right text-[12px] font-semibold text-[#078359]">{row.roi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-2 lg:grid-cols-3">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Spend vs Leads (Monthly)
          </h2>
          <div className="p-3">
            <MonthlyBarChart
              data={data.spendTrend}
              color="#EB0711"
              valueLabel="Spend (₹)"
              height={180}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Channel ROI
          </h2>
          <div className="flex items-center gap-3 p-4">
            <DonutChart
              segments={data.channelRoi}
              centerValue="4.2x"
              centerLabel="Avg ROI"
              size={120}
            />
            <ul className="flex-1 space-y-1">
              {data.channelRoi.map((ch) => (
                <li key={ch.key} className="flex items-center gap-2 rounded-sm px-2 py-1">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: ch.color }} />
                  <span className="flex-1 text-[12px]">{ch.label}</span>
                  <span className="text-[12px] font-semibold">{ch.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Conversion Funnel
          </h2>
          <div className="space-y-2 p-4">
            {data.funnel.map((step) => (
              <FunnelBar key={step.label} {...step} max={funnelMax} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
