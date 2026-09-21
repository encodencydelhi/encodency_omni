/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Worker Registry Table
 */

"use client";

import {
  EyeIcon,
  BriefcaseIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { WORKER_LIVENESS_META } from "../data/config";
import type { WorkerRecord } from "../data/types";

interface WorkerTableProps {
  workers: WorkerRecord[];
  onOpenWorker: (worker: WorkerRecord) => void;
  isLoading: boolean;
}

const LIVENESS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  stale: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-slate-300",
};

export function WorkerTable({ workers, onOpenWorker, isLoading }: WorkerTableProps) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Worker Registry
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {workers.length} Worker{workers.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
            <tr>
              <th className="py-2 px-3">Worker ID</th>
              <th className="py-2 px-3">Group</th>
              <th className="py-2 px-3">Assigned Queue(s)</th>
              <th className="py-2 px-3">Liveness</th>
              <th className="py-2 px-3">Last Heartbeat</th>
              <th className="py-2 px-3">Current Job(s)</th>
              <th className="py-2 px-3">Concurrency</th>
              <th className="py-2 px-3 text-right">Recent Attempts</th>
              <th className="py-2 px-3 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                  <Loader2Icon className="size-4 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading workers...
                </td>
              </tr>
            ) : workers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                  No workers registered.
                </td>
              </tr>
            ) : (
              workers.map((w) => {
                const livenessMeta = WORKER_LIVENESS_META[w.liveness];
                return (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-slate-900 text-xs">{w.id}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-xs font-medium text-slate-600">{w.group}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {w.assignedQueues.map((q) => (
                          <span
                            key={q}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50 truncate max-w-[100px]"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold",
                          livenessMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          livenessMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                          livenessMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                          livenessMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full shrink-0", LIVENESS_DOT[w.liveness])} />
                        {livenessMeta.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatRelativeTime(w.lastHeartbeat)}
                    </td>
                    <td className="py-2 px-3">
                      {w.currentJobIds.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold tabular-nums">
                          {w.currentJobIds.length}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs tabular-nums font-medium text-slate-700">
                      {w.currentProcessing} / {w.concurrencyCapacity}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-700">
                      {w.recentAttempts}
                    </td>
                    <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-500 hover:text-blue-600"
                              onClick={() => onOpenWorker(w)}
                            >
                              <EyeIcon className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">View Worker</TooltipContent>
                        </Tooltip>
                        {w.currentJobIds.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-slate-500 hover:text-blue-600"
                                onClick={() => onOpenWorker(w)}
                              >
                                <BriefcaseIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">View Current Job(s)</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
