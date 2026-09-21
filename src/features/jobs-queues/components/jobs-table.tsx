/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Jobs Data Table with Compact Display
 */

"use client";

import { useState } from "react";
import {
  EyeIcon,
  MoreVerticalIcon,
  CopyIcon,
  RefreshCwIcon,
  ListOrderedIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDuration } from "@/lib/utils/format";
import { JOB_LIFECYCLE_META, JOB_PRIORITY_META } from "../data/config";
import type { JobRecord } from "../data/types";
import { toast } from "sonner";

interface JobsTableProps {
  jobs: JobRecord[];
  onOpenJob: (job: JobRecord) => void;
  onQuickPreview: (job: JobRecord) => void;
  isLoading: boolean;
}

const STATE_TONE_MAP: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

const PRIORITY_DEFAULT = { label: "Normal", tone: "neutral" as const };
const PRIORITY_TONE_MAP: Record<string, string> = {
  danger: "bg-red-50 text-red-700 border border-red-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
};

export function JobsTable({ jobs, onOpenJob, onQuickPreview, isLoading }: JobsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`Job ID copied: ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-sm border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
            <tr>
              <th className="py-2 px-3">Job ID / Type</th>
              <th className="py-2 px-3">Company / Client</th>
              <th className="py-2 px-3">Queue</th>
              <th className="py-2 px-3">State</th>
              <th className="py-2 px-3">Priority</th>
              <th className="py-2 px-3 text-right">Attempts</th>
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3 text-right">Duration</th>
              <th className="py-2 px-3 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="hover:bg-slate-50">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={`skeleton-${i}-${j}`} className="py-2 px-3">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                  No jobs match the current filters.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const stateMeta = JOB_LIFECYCLE_META[job.lifecycleState];
                const priorityMeta = JOB_PRIORITY_META[job.priority] ?? PRIORITY_DEFAULT;
                return (
                  <tr
                    key={job.id}
                    onClick={() => onOpenJob(job)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-slate-900 truncate max-w-[140px]">{job.id}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[140px]">{job.type}</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate max-w-[120px]">
                          {job.company?.name ?? "System"}
                        </p>
                        {job.client && (
                          <p className="text-xs text-slate-400 truncate max-w-[120px]">{job.client.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
                        {job.queue}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                          STATE_TONE_MAP[stateMeta.tone]
                        )}
                      >
                        {stateMeta.label}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                          PRIORITY_TONE_MAP[priorityMeta.tone]
                        )}
                      >
                        {priorityMeta.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-700">
                      {job.attempts} / {job.maxAttempts}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{formatDateTime(job.createdAt)}</span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{formatDateTime(job.createdAt)}</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500 whitespace-nowrap">
                      {job.durationMs != null ? formatDuration(job.durationMs) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-400 hover:text-slate-700"
                              onClick={() => onOpenJob(job)}
                            >
                              <EyeIcon className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">View Detail</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-slate-400 hover:text-slate-700">
                              <MoreVerticalIcon className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem className="text-xs" onClick={() => onOpenJob(job)}>
                              <EyeIcon className="size-3.5 mr-2 text-slate-400" />
                              View Detail
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => onQuickPreview(job)}>
                              <ListOrderedIcon className="size-3.5 mr-2 text-slate-400" />
                              Quick Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => handleCopyId(job.id)}
                            >
                              <CopyIcon className="size-3.5 mr-2 text-slate-400" />
                              {copiedId === job.id ? "Copied!" : "Copy Job ID"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => onOpenJob(job)}>
                              <ListOrderedIcon className="size-3.5 mr-2 text-slate-400" />
                              View Attempts
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs"
                              disabled={job.retryEligibility !== "retryable"}
                              onClick={() => onOpenJob(job)}
                            >
                              <RefreshCwIcon className="size-3.5 mr-2 text-slate-400" />
                              Request Retry
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
