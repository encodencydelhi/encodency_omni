"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface IntegrationPendingBadgeProps {
  label?: string;
  className?: string;
}

export function IntegrationPendingBadge({
  label = "Live Integration Pending",
  className,
}: IntegrationPendingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900 shadow-2xs select-none",
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
      <span>{label}</span>
    </span>
  );
}

export interface IntegrationPendingBannerProps {
  moduleName: string;
  description?: string;
  feature?: string;
  badgeText?: string;
  className?: string;
  compact?: boolean;
}

export function IntegrationPendingBanner({
  moduleName,
  description,
  feature,
  badgeText = "Live Integration Pending",
  className,
  compact = false,
}: IntegrationPendingBannerProps) {
  const defaultDesc = feature
    ? `This ${moduleName.toLowerCase()} workspace is currently operating in an interactive preview sandbox. Live backend API integration for ${feature} is scheduled for an upcoming release.`
    : `This ${moduleName.toLowerCase()} workspace is currently operating in an interactive preview sandbox. Live backend API integration is in development and scheduled for an upcoming release.`;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-[11px] text-amber-950 shadow-2xs",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-semibold truncate">{moduleName}:</span>
          <span className="text-[10.5px] text-amber-900/80 truncate">
            {description || "Interactive preview &bull; Live backend integration pending."}
          </span>
        </div>
        <span className="text-[9.5px] font-semibold text-amber-800 bg-white/90 border border-amber-200/90 rounded px-1.5 py-0.5 shrink-0 shadow-2xs">
          Sandbox Preview
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/95 via-orange-50/50 to-amber-50/30 p-2.5 sm:px-3.5 shadow-2xs",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <div className="size-7 rounded-lg bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0 text-[11px] text-amber-950">
          <div className="font-bold flex items-center gap-2 flex-wrap">
            <span>{moduleName} &bull; Interactive Sandbox</span>
            <span className="rounded-full bg-amber-200/80 border border-amber-300 text-amber-900 px-2 py-0.2 text-[9px] font-semibold uppercase tracking-wider">
              {badgeText}
            </span>
          </div>
          <p className="text-[10px] text-amber-900/80 font-normal leading-tight mt-0.5">
            {description || defaultDesc}
          </p>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-auto">
        <span className="text-[9.5px] text-amber-900/90 font-medium bg-white/90 border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
          Local State Active
        </span>
      </div>
    </div>
  );
}
