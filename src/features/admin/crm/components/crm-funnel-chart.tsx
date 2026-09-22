"use client";

import type { PipelineStageAnalytics } from "../types";

interface FunnelChartProps {
  stages: PipelineStageAnalytics[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const width = Math.round((stage.count / maxCount) * 100);
        return (
          <div key={stage.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[12px] text-[#354568]">{stage.label}</span>
            <div className="flex-1 h-6 rounded-sm bg-[#E9EDF3]">
              <div
                className="h-full rounded-sm bg-gradient-to-r from-[#EB0711] to-[#F6A1A7] transition-all duration-300"
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-[12px] font-semibold">{stage.count}</span>
            <span className="w-14 shrink-0 text-right text-[12px] text-[#354568]">{stage.conversionRate}%</span>
          </div>
        );
      })}
    </div>
  );
}
