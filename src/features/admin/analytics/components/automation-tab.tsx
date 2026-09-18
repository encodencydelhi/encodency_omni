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
  const isUp = (kpi.delta?.changePercent ?? 0) >= 0;

  return (
    <div className="flex min-w-[155px] flex-col gap-2 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-xs transition-all hover:shadow-md hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium uppercase tracking-wider text-[#354568]">{kpi.label}</p>
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br", colorClass)}>
          <Icon className="size-3.5 text-white" />
        </span>
      </div>
      <p className="text-[20px] font-bold leading-none tracking-tight tabular text-[#101A3D]">{kpi.value}</p>
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[12px] font-semibold",
          isUp ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#FFE8EA] text-[#D91521]"
        )}>
          <TrendingUp className={cn("size-3", !isUp && "rotate-180")} />
          {kpi.delta ? `${kpi.delta.changePercent > 0 ? "+" : ""}${kpi.delta.changePercent}%` : "—"}
        </span>
        <span className="text-[12px] text-[#354568]">vs. last 30 days</span>
      </div>
      {kpi.hint && <p className="text-[12px] text-[#354568]">{kpi.hint}</p>}
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
            <MonthlyBarChart
              data={data.successTrend}
              color="#078359"
              valueLabel="Success %"
              height={150}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">
            Queue Health
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
              {data.workflows.map((wf) => (
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
              ))}
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
              {data.runs.map((run) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
