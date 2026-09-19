/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Error Breakdown Panel
 */

"use client";

import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { ERROR_CATEGORY_META } from "../data/config";
import type { ErrorBreakdown } from "../data/types";

interface ErrorBreakdownPanelProps {
  errors: ErrorBreakdown[];
  className?: string;
}

export function ErrorBreakdownPanel({ errors, className }: ErrorBreakdownPanelProps) {
  if (errors.length === 0) {
    return (
      <div className={cn("rounded-xl border border-slate-200/90 bg-white p-8 text-center shadow-2xs flex flex-col items-center justify-center h-full", className)}>
        <AlertTriangleIcon className="size-6 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">No errors recorded in the monitoring window.</p>
      </div>
    );
  }

  const maxCount = Math.max(...errors.map((e) => e.count));

  return (
    <div className={cn("rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden flex flex-col h-full", className)}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Error Breakdown
        </h3>
        <span className="text-xs font-semibold text-slate-500 tabular-nums">
          {errors.reduce((sum, e) => sum + e.count, 0)} Total
        </span>
      </div>
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between overflow-y-auto">
        {errors.map((err) => {
          const meta = ERROR_CATEGORY_META[err.category] || { label: err.category, tone: "neutral" };
          const barWidth = maxCount > 0 ? (err.count / maxCount) * 100 : 0;
          return (
            <div key={err.category} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold shrink-0",
                      meta.tone === "danger" && "bg-red-50 text-red-700 border border-red-100",
                      meta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-100",
                      meta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200",
                      meta.tone === "info" && "bg-blue-50 text-blue-700 border border-blue-100"
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-slate-500 truncate">{err.topMessage}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold tabular-nums text-slate-900">{formatNumber(err.count)}</span>
                  <span className="text-xs text-slate-400 tabular-nums w-12 text-right">{err.percentage}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    meta.tone === "danger" && "bg-gradient-to-r from-red-400 to-rose-500",
                    meta.tone === "warning" && "bg-gradient-to-r from-amber-400 to-orange-500",
                    meta.tone === "neutral" && "bg-slate-400",
                    meta.tone === "info" && "bg-gradient-to-r from-blue-400 to-indigo-500"
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
