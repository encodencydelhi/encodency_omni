/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Premium KPI Metric Cards
 */

"use client";

import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  GlobeIcon,
  TimerIcon,
  XCircleIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber, formatPercent, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ApiMonitoringKpis } from "../data/types";

interface ApiMonitoringKpiCardsProps {
  kpis: ApiMonitoringKpis;
}

export function ApiMonitoringKpiCards({ kpis }: ApiMonitoringKpiCardsProps) {
  const cards = [
    {
      label: "Total Requests",
      value: formatNumber(kpis.totalRequests24h),
      icon: ActivityIcon,
      hint: "Last 24 hours",
      tooltip: "Total API requests made across all monitored endpoints in the last 24 hours.",
      tone: "blue",
      accent: "from-blue-600 to-indigo-600",
    },
    {
      label: "Success Rate",
      value: formatPercent(kpis.successRate, 1),
      icon: CheckCircle2Icon,
      hint: `${formatNumber(Math.round((kpis.totalRequests24h * kpis.successRate) / 100))} successful`,
      tooltip: "Percentage of API requests that returned a 2xx status code.",
      tone: "emerald",
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: "Avg Response",
      value: formatDuration(kpis.avgResponseMs),
      icon: TimerIcon,
      hint: `P95: ${formatDuration(kpis.p95ResponseMs)}`,
      tooltip: "Mean response time across all endpoints. P95 shows the 95th percentile.",
      tone: "cyan",
      accent: "from-cyan-500 to-blue-500",
    },
    {
      label: "Error Rate",
      value: formatPercent(kpis.errorRate, 1),
      icon: XCircleIcon,
      hint: `${formatNumber(Math.round((kpis.totalRequests24h * kpis.errorRate) / 100))} errors`,
      tooltip: "Percentage of API requests that returned error status codes (4xx/5xx).",
      tone: kpis.errorRate > 5 ? "rose" : kpis.errorRate > 2 ? "amber" : "slate",
      accent: kpis.errorRate > 5 ? "from-rose-500 to-red-600" : "from-amber-500 to-orange-500",
      valueColor: kpis.errorRate > 5 ? "text-rose-600" : "text-slate-900",
    },
    {
      label: "Rate Limited",
      value: formatNumber(kpis.rateLimitedRequests),
      icon: AlertTriangleIcon,
      hint: "Requests throttled",
      tooltip: "Requests rejected or delayed due to rate limiting in the last 24 hours.",
      tone: kpis.rateLimitedRequests > 100 ? "amber" : "slate",
      accent: "from-amber-400 to-amber-600",
      valueColor: kpis.rateLimitedRequests > 100 ? "text-amber-700" : "text-slate-900",
    },
    {
      label: "Active Endpoints",
      value: `${kpis.activeEndpoints} / ${kpis.totalEndpoints}`,
      icon: GlobeIcon,
      hint: "Monitored endpoints",
      tooltip: "Number of active monitored API endpoints out of total registered.",
      tone: "violet",
      accent: "from-violet-500 to-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 items-stretch">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all duration-150 overflow-hidden h-full min-h-[105px]"
          >
            {/* Top Accent Line */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-90 transition-opacity",
                card.accent
              )}
            />

            <div className="flex items-start justify-between gap-1 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-tight">
                {card.label}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors",
                      card.tone === "blue" && "bg-blue-50 text-blue-600 border border-blue-100",
                      card.tone === "emerald" && "bg-emerald-50 text-emerald-600 border border-emerald-100",
                      card.tone === "cyan" && "bg-cyan-50 text-cyan-600 border border-cyan-100",
                      card.tone === "rose" && "bg-rose-50 text-rose-600 border border-rose-100",
                      card.tone === "amber" && "bg-amber-50 text-amber-600 border border-amber-100",
                      card.tone === "violet" && "bg-violet-50 text-violet-600 border border-violet-100",
                      card.tone === "slate" && "bg-slate-100 text-slate-600 border border-slate-200"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {card.tooltip}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="my-1">
              <span
                className={cn(
                  "text-xl font-extrabold tracking-tight tabular-nums block",
                  card.valueColor || "text-slate-900"
                )}
              >
                {card.value}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-medium truncate">
              {card.hint}
            </div>
          </div>
        );
      })}
    </div>
  );
}
