"use client";

import { TrendAreaChart, ChartLegend } from "@/components/shared/charts/trend-area-chart";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsDashboardData } from "../data/analytics-data";
import {
  MousePointerClick, Eye, BarChart3, Percent, FileText, HeartPulse,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SEO_ICONS: LucideIcon[] = [MousePointerClick, Eye, BarChart3, Percent, FileText, HeartPulse];

const ICON_COLORS = [
  "from-[#2563EB] to-[#93C5FD]",
  "from-[#8B5CF6] to-[#C4B5FD]",
  "from-[#078359] to-[#6EE7B7]",
  "from-[#F59E0B] to-[#FCD34D]",
  "from-[#0EA5E9] to-[#7DD3FC]",
  "from-[#14B8A6] to-[#5EEAD4]",
];

function KpiCard({ kpi, index }: { kpi: AnalyticsDashboardData["seo"]["kpis"][number]; index: number }) {
  const Icon = SEO_ICONS[index];
  const colorClass = ICON_COLORS[index % ICON_COLORS.length];
  const change = kpi.delta?.changePercent ?? 0;
  const hasDelta = kpi.delta !== undefined && kpi.delta !== null;

  return (
    <div className="flex flex-col justify-between gap-1 rounded-sm border border-[#DDE4ED] bg-white p-2.5 shadow-xs transition-all hover:shadow-md hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#475569] truncate">{kpi.label}</p>
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br", colorClass)}>
          {Icon && <Icon className="size-2.5 text-white" />}
        </span>
      </div>
      <div className="my-1 flex items-baseline gap-1.5">
        <p className="text-[16px] font-bold leading-none tracking-tight tabular text-[#101A3D]">{kpi.value}</p>
        {hasDelta && (
          change > 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#E5F7EF] text-[#078359]">
              <TrendingUp className="size-2.5" />
              +{change}%
            </span>
          ) : change < 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#FFE8EA] text-[#D91521]">
              <TrendingUp className="size-2.5 rotate-180" />
              {change}%
            </span>
          ) : (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-[#F1F5F9] text-[#64748B]">
              0%
            </span>
          )
        )}
      </div>
      {kpi.hint && <p className="text-[11.5px] text-[#64748B] truncate" title={kpi.hint}>{kpi.hint}</p>}
    </div>
  );
}

export function SeoTab({ data }: { data: AnalyticsDashboardData["seo"] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {data.kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_.6fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Clicks & Impressions Trend
          </h2>
          <div className="p-3">
            {data.trend?.length ? (
              <>
                <TrendAreaChart series={data.trend} height={240} />
                <div className="mt-2">
                  <ChartLegend series={data.trend} />
                </div>
              </>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-[12px] text-[#5E6D89]">
                Google Search Console not connected. Connect GSC to track organic impressions and clicks.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Keyword Rankings
          </h2>
          <div className="overflow-y-auto max-h-[260px]">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
                <tr>
                  <th className="px-3 py-2">Keyword</th>
                  <th className="px-3 py-2 text-right">Pos.</th>
                  <th className="px-3 py-2 text-right">Change</th>
                  <th className="px-3 py-2 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF3]">
                {data.keywords?.length ? (
                  data.keywords.map((kw, idx) => (
                    <tr key={`${kw.keyword}-${idx}`}>
                      <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{kw.keyword}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-semibold">{kw.position}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-[12px] font-semibold ${
                          kw.trend === "up" ? "text-[#078359]"
                            : kw.trend === "down" ? "text-[#D91521]"
                            : "text-[#354568]"
                        }`}>
                          {kw.change}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] text-[#354568]">{kw.volume}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-10 text-center text-[12px] text-[#5E6D89]">
                      Search Console not linked. Connect GSC to view ranking search keywords.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Technical Health
          </h2>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#354568]">SEO Score</span>
              <div className="flex-1 h-3 rounded-sm bg-[#E9EDF3]">
                <div className="h-full rounded-sm bg-[#078359]" style={{ width: `${data.technical.score}%` }} />
              </div>
              <span className="text-[12px] font-semibold">{data.technical.score}/100</span>
            </div>
            {data.technical.issues?.length ? (
              data.technical.issues.map((issue, idx) => (
                <div key={`tech-issue-${idx}-${issue.issue}`} className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${
                    issue.priority === "High" ? "bg-[#D91521]"
                      : issue.priority === "Medium" ? "bg-[#F59E0B]"
                      : "bg-[#2563EB]"
                  }`} />
                  <span className="flex-1 text-[12px] text-[#354568]">{issue.issue}</span>
                  <span className="text-[12px] text-[#354568]">{issue.type}</span>
                  <span className="text-[12px] font-medium">{issue.pages} pages</span>
                  <span className={`text-[12px] font-semibold ${
                    issue.priority === "High" ? "text-[#D91521]"
                      : issue.priority === "Medium" ? "text-[#92700C]"
                      : "text-[#2563EB]"
                  }`}>
                    {issue.priority}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[12px] text-[#078359] font-medium">No critical SEO issues detected.</div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Top Crawled Pages
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
                <tr>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2 text-right">Status</th>
                  <th className="px-3 py-2 text-right">Title</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF3]">
                {data.topPages?.length ? (
                  data.topPages.map((p, idx) => (
                    <tr key={`${p.path}-${idx}`}>
                      <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{p.path}</td>
                      <td className="px-3 py-2 text-right text-[12px] text-[#078359] font-semibold">{p.clicks}</td>
                      <td className="px-3 py-2 text-right text-[12px] text-[#354568] truncate max-w-[180px]">{p.trend}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-[12px] text-[#5E6D89]">
                      No site audit pages crawled yet. Run a scan in Website Workspace.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
