"use client";

import type * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type StatusTone = "healthy" | "warning" | "critical" | "neutral";

interface StatusConfig {
  container: string;
  icon: string;
  dotPing: string;
  dotSolid: string;
  tooltipBadge: string;
  statusText: string;
}

const TONE_CONFIGS: Record<StatusTone, StatusConfig> = {
  healthy: {
    container:
      "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-900 hover:bg-emerald-500/[0.13] hover:border-emerald-500/40 shadow-2xs",
    icon: "text-emerald-600",
    dotPing: "bg-emerald-400",
    dotSolid: "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.7)]",
    tooltipBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    statusText: "Operational",
  },
  warning: {
    container:
      "border-amber-500/25 bg-amber-500/[0.07] text-amber-950 hover:bg-amber-500/[0.13] hover:border-amber-500/40 shadow-2xs",
    icon: "text-amber-600",
    dotPing: "bg-amber-400",
    dotSolid: "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.7)]",
    tooltipBadge: "bg-amber-50 text-amber-700 border-amber-200",
    statusText: "Attention",
  },
  critical: {
    container:
      "border-rose-500/25 bg-rose-500/[0.07] text-rose-950 hover:bg-rose-500/[0.13] hover:border-rose-500/40 shadow-2xs",
    icon: "text-rose-600",
    dotPing: "bg-rose-400",
    dotSolid: "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.7)]",
    tooltipBadge: "bg-rose-50 text-rose-700 border-rose-200",
    statusText: "Issue Alert",
  },
  neutral: {
    container:
      "border-slate-200 bg-slate-100/90 text-slate-700 hover:bg-slate-200/70 hover:border-slate-300 shadow-2xs",
    icon: "text-slate-500",
    dotPing: "",
    dotSolid: "bg-slate-400",
    tooltipBadge: "bg-slate-100 text-slate-600 border-slate-200",
    statusText: "Unknown",
  },
};

const HIGHLIGHT_CONFIGS: Record<StatusTone, { badge: string; icon: string }> = {
  healthy: {
    badge: "bg-white text-emerald-900 border-emerald-300/90 shadow-2xs",
    icon: "text-emerald-700",
  },
  warning: {
    badge: "bg-amber-100/95 text-amber-950 border-amber-300 shadow-2xs",
    icon: "text-amber-800",
  },
  critical: {
    badge: "bg-rose-100/95 text-rose-950 border-rose-300 shadow-2xs",
    icon: "text-rose-800",
  },
  neutral: {
    badge: "bg-white text-slate-800 border-slate-300 shadow-2xs",
    icon: "text-slate-600",
  },
};

export interface StatusHighlightData {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatusTone;
}

export interface StatusPillProps {
  href: string;
  tone?: StatusTone;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  highlightData?: StatusHighlightData | null;
  tooltipTitle?: string;
  tooltipLines?: Array<string | null | undefined>;
  tooltipAction?: string;
  loading?: boolean;
}

export function StatusPill({
  href,
  tone = "healthy",
  icon: Icon,
  label,
  highlightData,
  tooltipTitle,
  tooltipLines = [],
  tooltipAction = "View details →",
  loading = false,
}: StatusPillProps) {
  const config = TONE_CONFIGS[tone];
  const hasPing = tone !== "neutral" && !loading;

  const highlightTone = highlightData?.tone ?? tone;
  const highlightConfig = HIGHLIGHT_CONFIGS[highlightTone];
  const HighlightIcon = highlightData?.icon;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "group relative inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border pl-1.5 pr-1 text-[10px] font-semibold tracking-tight transition-all duration-150 active:scale-[0.98]",
            config.container,
          )}
        >
          {/* Service Icon */}
          <Icon className={cn("size-[11px] shrink-0 transition-transform duration-150 group-hover:scale-110", config.icon)} />

          {/* Radar Ping Beacon / Pulse Dot */}
          <span className="relative flex size-1.5 shrink-0 items-center justify-center">
            {hasPing ? (
              <>
                <span
                  className={cn(
                    "absolute -inset-0.5 animate-ping rounded-full opacity-65",
                    config.dotPing,
                  )}
                />
                <span className={cn("relative inline-flex size-1.5 rounded-full", config.dotSolid)} />
              </>
            ) : (
              <span className={cn("relative inline-flex size-1.5 rounded-full", config.dotSolid)} />
            )}
          </span>

          {/* Primary Label (Capitalized) */}
          <span className="capitalize font-semibold whitespace-nowrap leading-none">{label}</span>

          {/* Highlighted Renewal Date / Live Data Badge */}
          {highlightData?.text ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1 py-0.5 rounded text-[9.5px] font-bold leading-none shrink-0 border transition-all",
                highlightConfig.badge,
              )}
            >
              {HighlightIcon ? <HighlightIcon className={cn("size-[9px] shrink-0", highlightConfig.icon)} /> : null}
              <span className="whitespace-nowrap">{highlightData.text}</span>
            </span>
          ) : null}
        </Link>
      </TooltipTrigger>

      <TooltipContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="z-50 w-68 p-2.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xl text-slate-700"
      >
        {/* Tooltip Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-semibold text-[12px] text-slate-900 capitalize">
            <Icon className={cn("size-3.5", config.icon)} />
            <span>{tooltipTitle || label}</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border leading-none capitalize",
              config.tooltipBadge,
            )}
          >
            <span className={cn("size-1.5 rounded-full", config.dotSolid)} />
            {config.statusText}
          </span>
        </div>

        {/* Tooltip Lines */}
        {tooltipLines.filter(Boolean).length > 0 ? (
          <div className="space-y-1 text-[11px] text-slate-600">
            {tooltipLines
              .filter(Boolean)
              .map((line, idx) => (
                <div key={idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-slate-400 mt-1 size-1 rounded-full bg-slate-300 shrink-0" />
                  <span className="break-words">{line}</span>
                </div>
              ))}
          </div>
        ) : null}

        {/* Tooltip Action Prompt */}
        {tooltipAction ? (
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-semibold text-blue-600">
            <span>{tooltipAction}</span>
            <ArrowUpRight className="size-3" />
          </div>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
