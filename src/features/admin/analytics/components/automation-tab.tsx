"use client";

import { MonthlyBarChart } from "@/components/shared/charts/monthly-bar-chart";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsDashboardData } from "../data/analytics-data";
import {
  Bot, Play, CheckCircle2, Clock, XCircle, Layers,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const AUTO_ICONS: LucideIcon[] = [Bot, Play, CheckCircle2, Clock, XCircle, Layers];

const ICON_COLORS = [
  "from-[#2563EB] to-[#93C5FD]",
  "from-[#078359] to-[#6EE7B7]",
  "from-[#14B8A6] to-[#5EEAD4]",
  "from-[#F59E0B] to-[#FCD34D]",
  "from-[#EB0711] to-[#F6A1A7]",
  "from-[#8B5CF6] to-[#C4B5FD]",
];

function KpiCard({ kpi, index }: { kpi: AnalyticsDashboardData["automation"]["kpis"][number]; index: number }) {
  const Icon = AUTO_ICONS[index];
  const colorClass = ICON_COLORS[index % ICON_COLORS.length];
  const change = kpi.delta?.changePercent ?? 0;
  const hasDelta = kpi.delta !== undefined && kpi.delta !== null;

  return (
    <div className="flex flex-col justify-between gap-1 rounded-sm border border-[#DDE4ED] bg-white p-2.5 shadow-xs transition-all hover:shadow-md hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#475569] truncate">{kpi.label}</p>
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br", colorClass)}>
          {Icon && <Icon className="size-3 text-white" />}
        </span>
      </div>
      <div className="my-1 flex items-baseline gap-1.5">
        <p className="text-[18px] font-bold leading-none tracking-tight tabular text-[#101A3D]">{kpi.value}</p>
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

export function AutomationTab({ data }: { data: AnalyticsDashboardData["automation"] }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {data.kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Success Rate Trend
          </h2>
          <div className="p-3">
            {data.successTrend?.length ? (
              <MonthlyBarChart
                data={data.successTrend}
                color="#078359"
                valueLabel="Success %"
                height={150}
              />
            ) : (
              <div className="flex h-[150px] items-center justify-center text-[12px] text-[#5E6D89]">
                No automation execution history recorded yet
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Runs by State
          </h2>
          <div className="grid grid-cols-2 gap-2 p-4">
            {data.queues.map((q) => (
              <div
                key={q.label}
                className={`rounded-sm border p-3 ${
                  q.status === "healthy"
                    ? "border-[#E5F7EF] bg-[#F0FDF4]"
                    : q.status === "warning"
                    ? "border-[#FEF3CD] bg-[#FFFBEB]"
                    : "border-[#FFE8EA] bg-[#FFF5F5]"
                }`}
              >
                <p className="text-[12px] font-medium text-[#354568]">{q.label}</p>
                <p className={`text-[14px] font-semibold ${
                  q.status === "healthy" ? "text-[#078359]"
                    : q.status === "warning" ? "text-[#92700C]"
                    : "text-[#D91521]"
                }`}>
                  {q.count} {q.count === 1 ? "item" : "items"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
        <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
          Workflow Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
              <tr>
                <th className="px-3 py-2">Workflow</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2 text-right">Runs</th>
                <th className="px-3 py-2 text-right">Success</th>
                <th className="px-3 py-2 text-right">Last Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.workflows?.length ? (
                data.workflows.map((wf) => (
                  <tr key={wf.name}>
                    <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{wf.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${
                        wf.status === "Active" ? "bg-[#E5F7EF] text-[#078359]"
                          : wf.status === "Paused" ? "bg-[#FEF3CD] text-[#92700C]"
                          : "bg-[#FFE8EA] text-[#D91521]"
                      }`}>
                        {wf.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#354568]">{wf.channel}</td>
                    <td className="px-3 py-2 text-right text-[12px]">{wf.runs.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-[12px] font-semibold ${
                        wf.successRate >= 95 ? "text-[#078359]"
                          : wf.successRate >= 90 ? "text-[#92700C]"
                          : "text-[#D91521]"
                      }`}>
                        {wf.successRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#354568]">{wf.lastRun}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[12px] text-[#5E6D89]">
                    No automated workflows configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
        <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
          Recent Runs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-[#F8FAFD] text-[12px] uppercase text-[#354568]">
              <tr>
                <th className="px-3 py-2">Run ID</th>
                <th className="px-3 py-2">Workflow</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Trigger</th>
                <th className="px-3 py-2 text-right">Duration</th>
                <th className="px-3 py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3]">
              {data.runs?.length ? (
                data.runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-3 py-2 text-[12px] font-mono text-[#354568]">{run.id}</td>
                    <td className="px-3 py-2 text-[12px] font-medium text-[#354568]">{run.workflow}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${
                        run.status === "Successful" ? "bg-[#E5F7EF] text-[#078359]"
                          : "bg-[#FFE8EA] text-[#D91521]"
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#354568]">{run.trigger}</td>
                    <td className="px-3 py-2 text-right text-[12px] font-mono">{run.duration}</td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#354568]">{run.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[12px] text-[#5E6D89]">
                    No automation runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
