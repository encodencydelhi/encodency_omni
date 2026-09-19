/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Request Trends Mini Chart
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatDuration } from "@/lib/utils/format";
import type { RequestTrendPoint } from "../data/types";

interface RequestTrendsChartProps {
  trends: RequestTrendPoint[];
  className?: string;
}

export function RequestTrendsChart({ trends, className }: RequestTrendsChartProps) {
  const maxRequests = useMemo(() => Math.max(...trends.map((t) => t.requests), 1), [trends]);
  const maxErrors = useMemo(() => Math.max(...trends.map((t) => t.errors), 1), [trends]);

  const totalReqs = useMemo(() => trends.reduce((s, t) => s + t.requests, 0), [trends]);
  const totalErrors = useMemo(() => trends.reduce((s, t) => s + t.errors, 0), [trends]);
  const avgMs = useMemo(
    () => Math.round(trends.reduce((s, t) => s + t.avgMs, 0) / (trends.length || 1)),
    [trends]
  );

  return (
    <div className={cn("rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden flex flex-col h-full", className)}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Request Trends
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-sm bg-blue-500" /> Requests
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-sm bg-rose-500" /> Errors
          </span>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
        {/* Summary row */}
        <div className="flex items-center gap-6 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-500 font-medium">Total: </span>
            <span className="font-bold text-slate-900 tabular-nums">{formatNumber(totalReqs)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Errors: </span>
            <span className="font-bold text-rose-600 tabular-nums">{formatNumber(totalErrors)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Avg Latency: </span>
            <span className="font-bold text-slate-900 tabular-nums">{formatDuration(avgMs)}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[160px] relative flex flex-col justify-end pt-2">
          <div className="h-[140px] flex items-end gap-1">
            {trends.map((t, i) => {
              const reqHeight = maxRequests > 0 ? (t.requests / maxRequests) * 100 : 0;
              const errHeight = maxErrors > 0 ? (t.errors / maxErrors) * 100 : 0;
              const time = new Date(t.timestamp);
              const label = `${String(time.getHours()).padStart(2, "0")}:00`;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="w-full flex gap-0.5 items-end h-[115px]">
                    <div
                      className="flex-1 bg-blue-500 rounded-t-sm opacity-85 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${reqHeight}%` }}
                      title={`Requests: ${t.requests}`}
                    />
                    <div
                      className="flex-1 bg-rose-500 rounded-t-sm opacity-85 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${errHeight}%` }}
                      title={`Errors: ${t.errors}`}
                    />
                  </div>
                  {i % Math.max(Math.floor(trends.length / 8), 1) === 0 && (
                    <span className="text-xs text-slate-400 mt-1.5 whitespace-nowrap font-medium">{label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
