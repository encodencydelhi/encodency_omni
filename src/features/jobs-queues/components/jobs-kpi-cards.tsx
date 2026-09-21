/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Premium KPI Metric Cards
 */

"use client";

import {
  ClockIcon,
  CalendarIcon,
  ZapIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  ServerIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { JobsKpis } from "../data/types";

interface JobsKpiCardsProps {
  kpis: JobsKpis;
}

export function JobsKpiCards({ kpis }: JobsKpiCardsProps) {
  const cards = [
    {
      label: "Waiting",
      value: formatNumber(kpis.waiting),
      icon: ClockIcon,
      hint: "In queue",
      tooltip: "Jobs currently waiting in queue for a worker to pick them up.",
      tone: "amber",
      accent: "from-amber-500 to-orange-500",
    },
    {
      label: "Scheduled",
      value: formatNumber(kpis.scheduled),
      icon: CalendarIcon,
      hint: "Future execution",
      tooltip: "Jobs scheduled for future execution at a specific time.",
      tone: "blue",
      accent: "from-blue-500 to-indigo-500",
    },
    {
      label: "Running",
      value: formatNumber(kpis.running),
      icon: ZapIcon,
      hint: "Active workers",
      tooltip: "Jobs currently being processed by workers.",
      tone: "emerald",
      accent: "from-emerald-500 to-teal-500",
    },
    {
      label: "Retry Waiting",
      value: formatNumber(kpis.retryWaiting),
      icon: RefreshCwIcon,
      hint: "Pending retry",
      tooltip: "Jobs waiting before their next retry attempt after a failure.",
      tone: "orange",
      accent: "from-orange-500 to-amber-500",
    },
    {
      label: "Succeeded",
      value: formatNumber(kpis.succeeded),
      icon: CheckCircle2Icon,
      hint: "Completed OK",
      tooltip: "Jobs that have completed successfully.",
      tone: "green",
      accent: "from-green-500 to-emerald-500",
    },
    {
      label: "Failed",
      value: formatNumber(kpis.failed),
      icon: XCircleIcon,
      hint: "Permanent failure",
      tooltip: "Jobs that have permanently failed after exhausting all retry attempts.",
      tone: "red",
      accent: "from-red-500 to-rose-500",
    },
    {
      label: "Dead Lettered",
      value: formatNumber(kpis.deadLettered),
      icon: AlertTriangleIcon,
      hint: "Needs review",
      tooltip: "Jobs moved to dead-letter queue after exhausting retries. Requires manual review.",
      tone: "rose",
      accent: "from-rose-500 to-pink-500",
    },
    {
      label: "Active Queues",
      value: formatNumber(kpis.activeQueues),
      icon: ServerIcon,
      hint: "Operational",
      tooltip: "Number of queues currently operational and processing jobs.",
      tone: "violet",
      accent: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-stretch">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group relative flex flex-col justify-between rounded-sm border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-xs transition-all duration-150 overflow-hidden h-full min-h-[105px]"
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
                      card.tone === "amber" && "bg-amber-50 text-amber-600 border border-amber-100",
                      card.tone === "blue" && "bg-blue-50 text-blue-600 border border-blue-100",
                      card.tone === "emerald" && "bg-emerald-50 text-emerald-600 border border-emerald-100",
                      card.tone === "orange" && "bg-orange-50 text-orange-600 border border-orange-100",
                      card.tone === "green" && "bg-green-50 text-green-600 border border-green-100",
                      card.tone === "red" && "bg-red-50 text-red-600 border border-red-100",
                      card.tone === "rose" && "bg-rose-50 text-rose-600 border border-rose-100",
                      card.tone === "violet" && "bg-violet-50 text-violet-600 border border-violet-100"
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
              <span className="text-xl font-extrabold tracking-tight tabular-nums block text-slate-900">
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
