/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Job Attempts Table
 */

"use client";

import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDuration } from "@/lib/utils/format";
import { FAILURE_CLASSIFICATION_META } from "../data/config";
import type { JobAttempt } from "../data/types";

interface JobAttemptsTableProps {
  attempts: JobAttempt[];
  onOpenAttempt: (attempt: JobAttempt) => void;
}

const RESULT_TONE_MAP: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
  timeout: "bg-amber-50 text-amber-700 border border-amber-200",
  unknown: "bg-slate-100 text-slate-600 border border-slate-200",
};

const RESULT_LABELS: Record<string, string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  timeout: "Timeout",
  unknown: "Unknown",
};

export function JobAttemptsTable({ attempts, onOpenAttempt }: JobAttemptsTableProps) {
  return (
    <div className="rounded-sm border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Attempt History
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {attempts.length} Attempt{attempts.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
            <tr>
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Started At</th>
              <th className="py-2 px-3">Completed At</th>
              <th className="py-2 px-3">Worker</th>
              <th className="py-2 px-3 text-right">Duration</th>
              <th className="py-2 px-3">Result</th>
              <th className="py-2 px-3">Failure Classification</th>
              <th className="py-2 px-3">Error Summary</th>
              <th className="py-2 px-3 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                  No attempts recorded for this job.
                </td>
              </tr>
            ) : (
              attempts.map((attempt) => {
                const failureMeta = attempt.failureClassification
                  ? FAILURE_CLASSIFICATION_META[attempt.failureClassification]
                  : null;
                return (
                  <tr
                    key={attempt.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 px-3 tabular-nums font-medium text-slate-700">
                      {attempt.attemptNumber}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{formatDateTime(attempt.startedAt)}</span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          {formatDateTime(attempt.startedAt)}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {attempt.completedAt ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{formatDateTime(attempt.completedAt)}</span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {formatDateTime(attempt.completedAt)}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-500 font-mono truncate max-w-[100px]">
                      {attempt.workerId ?? "\u2014"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-500 whitespace-nowrap">
                      {attempt.durationMs != null ? formatDuration(attempt.durationMs) : "\u2014"}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                          RESULT_TONE_MAP[attempt.result]
                        )}
                      >
                        {RESULT_LABELS[attempt.result] ?? attempt.result}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {failureMeta ? (
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                            failureMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                            failureMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                            failureMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200",
                            failureMeta.tone === "info" && "bg-blue-50 text-blue-700 border border-blue-200",
                            failureMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          )}
                        >
                          {failureMeta.label}
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {attempt.errorMessage ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-slate-600 truncate max-w-[180px]">
                              {attempt.errorMessage}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[300px]">
                            {attempt.errorMessage}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-slate-400 hover:text-slate-700"
                            onClick={() => onOpenAttempt(attempt)}
                          >
                            <EyeIcon className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">View Attempt Detail</TooltipContent>
                      </Tooltip>
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
