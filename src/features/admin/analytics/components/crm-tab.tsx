"use client";

import { TrendAreaChart, ChartLegend } from "@/components/shared/charts/trend-area-chart";
import { DonutChart } from "@/components/shared/charts/donut-chart";
import type { AnalyticsDashboardData } from "../data/analytics-data";

export function CrmTab({ data }: { data: AnalyticsDashboardData["crm"] }) {
  const pipelineMax = Math.max(...data.pipeline.map((s) => s.count));

  return (
    <div className="space-y-2">
      <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Pipeline Funnel
          </h2>
          <div className="space-y-2 p-4">
            {data.pipeline.map((stage) => {
              const width = Math.round((stage.count / pipelineMax) * 100);
              return (
                <div key={stage.label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-[12px] text-[#354568]">{stage.label}</span>
                  <div className="flex-1 h-6 rounded-sm bg-[#E9EDF3]">
                    <div
                      className="h-full rounded-sm bg-gradient-to-r from-[#EB0711] to-[#F6A1A7]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[12px] font-semibold">{stage.count}</span>
                  <span className="w-16 shrink-0 text-right text-[12px] text-[#354568]">{stage.value}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Lead Sources
          </h2>
          <div className="flex items-center gap-3 p-4">
            <DonutChart
              segments={data.sources}
              centerValue="248"
              centerLabel="Total Leads"
              size={140}
            />
            <ul className="flex-1 space-y-1">
              {data.sources.map((src) => (
                <li key={src.key} className="flex items-center gap-2 rounded-sm px-2 py-1">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: src.color }} />
                  <span className="flex-1 text-[12px]">{src.label}</span>
                  <span className="text-[12px] font-semibold">{src.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.4fr_.6fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Leads Over Time
          </h2>
          <div className="p-3">
            <TrendAreaChart series={data.leadsTrend} height={220} />
            <div className="mt-2">
              <ChartLegend series={data.leadsTrend} />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Team Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
                <tr>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2 text-right">Leads</th>
                  <th className="px-3 py-2 text-right">Conv.</th>
                  <th className="px-3 py-2 text-right">Avg Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF3]">
                {data.team.map((t) => (
                  <tr key={t.name}>
                    <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{t.name}</td>
                    <td className="px-3 py-2 text-right text-[12px]">{t.leads}</td>
                    <td className="px-3 py-2 text-right text-[12px]">{t.conversions}</td>
                    <td className="px-3 py-2 text-right text-[12px]">{t.responseTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
        <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
          Recent Leads
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
              <tr>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2 w-[120px]">Stage</th>
                <th className="px-3 py-2">Assigned To</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.recentLeads.map((lead) => (
                <tr key={lead.name}>
                  <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{lead.name}</td>
                  <td className="px-3 py-2 text-[12px] text-[#354568]">{lead.source}</td>
                  <td className="px-3 py-2 text-[12px] text-[#354568]">{lead.project}</td>
                  <td className="px-3 py-2 w-[120px]">
                    <span className={`inline-block w-[90px] text-center rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${
                      lead.stage === "New" ? "bg-[#E8F0FE] text-[#2563EB]"
                        : lead.stage === "Contacted" ? "bg-[#FEF3CD] text-[#92700C]"
                        : lead.stage === "Qualified" ? "bg-[#E5F7EF] text-[#078359]"
                        : "bg-[#F3E8FF] text-[#8B5CF6]"
                    }`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[#354568]">{lead.assignedTo}</td>
                  <td className="px-3 py-2 text-[12px] text-[#354568]">{lead.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
