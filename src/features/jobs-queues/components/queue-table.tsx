/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Queue Registry Table
 */

"use client";

import {
  EyeIcon,
  PauseIcon,
  PlayIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatRelativeTime } from "@/lib/utils/format";
import { QUEUE_STATE_META } from "../data/config";
import type { QueueDefinition } from "../data/types";

interface QueueTableProps {
  queues: QueueDefinition[];
  onOpenQueue: (queue: QueueDefinition) => void;
  isLoading: boolean;
}

export function QueueTable({ queues, onOpenQueue, isLoading }: QueueTableProps) {
  return (
    <div className="rounded-sm border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Queue Registry
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {queues.length} Queue{queues.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
            <tr>
              <th className="py-2 px-3">Queue Name</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3">State</th>
              <th className="py-2 px-3 text-right">Waiting</th>
              <th className="py-2 px-3 text-right">Running</th>
              <th className="py-2 px-3 text-right">Delayed</th>
              <th className="py-2 px-3 text-right">Failed</th>
              <th className="py-2 px-3">Oldest Waiting</th>
              <th className="py-2 px-3">Workers</th>
              <th className="py-2 px-3 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                  <Loader2Icon className="size-4 animate-spin mx-auto mb-2 text-slate-400" />
                  Loading queues...
                </td>
              </tr>
            ) : queues.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                  No queues registered.
                </td>
              </tr>
            ) : (
              queues.map((q) => {
                const stateMeta = QUEUE_STATE_META[q.operationalState];
                return (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate max-w-[180px]">{q.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{q.purpose}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
                        {q.category}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                          stateMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          stateMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                          stateMeta.tone === "info" && "bg-blue-50 text-blue-700 border border-blue-200",
                          stateMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                          stateMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        {stateMeta.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-700">
                      {formatNumber(q.waiting)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-700">
                      {formatNumber(q.running)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-700">
                      {formatNumber(q.delayed)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={cn(
                          "tabular-nums font-medium",
                          q.failed > 0 ? "text-red-600" : "text-slate-500"
                        )}
                      >
                        {formatNumber(q.failed)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {q.oldestWaitingAt ? formatRelativeTime(q.oldestWaitingAt) : "None"}
                    </td>
                    <td className="py-2 px-3 text-xs tabular-nums font-medium text-slate-700">
                      {q.registeredWorkers}
                    </td>
                    <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-500 hover:text-blue-600"
                              onClick={() => onOpenQueue(q)}
                            >
                              <EyeIcon className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Open Queue</TooltipContent>
                        </Tooltip>
                        {q.operationalState === "running" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-amber-500 hover:text-amber-700"
                                onClick={() => onOpenQueue(q)}
                              >
                                <PauseIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Pause Queue</TooltipContent>
                          </Tooltip>
                        ) : q.operationalState === "paused" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-emerald-500 hover:text-emerald-700"
                                onClick={() => onOpenQueue(q)}
                              >
                                <PlayIcon className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Resume Queue</TooltipContent>
                          </Tooltip>
                        ) : null}
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
