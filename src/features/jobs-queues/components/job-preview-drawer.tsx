/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Job Preview Drawer (Quick View)
 */

"use client";

import {
  ExternalLinkIcon,
  RefreshCwIcon,
  CopyIcon,
  XIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatDuration } from "@/lib/utils/format";
import { JOB_LIFECYCLE_META, JOB_PRIORITY_META, RETRY_ELIGIBILITY_META } from "../data/config";
import type { JobRecord } from "../data/types";
import { useState } from "react";

interface JobPreviewDrawerProps {
  job: JobRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFull: (job: JobRecord) => void;
  onRequestRetry: (job: JobRecord) => void;
}

const PRIORITY_DEFAULT = { label: "Normal", tone: "neutral" as const };

const STATE_TONE_MAP: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function JobPreviewDrawer({
  job,
  isOpen,
  onClose,
  onOpenFull,
  onRequestRetry,
}: JobPreviewDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  const stateMeta = JOB_LIFECYCLE_META[job.lifecycleState];
  const priorityMeta = JOB_PRIORITY_META[job.priority] ?? PRIORITY_DEFAULT;
  const retryMeta = RETRY_ELIGIBILITY_META[job.retryEligibility];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(job.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRetryable = job.retryEligibility === "retryable";
  const isFailed = job.lifecycleState === "failed" || job.lifecycleState === "dead_lettered";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 text-xs">
        <SheetHeader className="p-4 border-b border-slate-200/80 bg-slate-50/60 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <SheetTitle className="text-sm font-bold text-slate-900 truncate">
                Job Preview
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
              <XIcon className="size-4" />
            </Button>
          </div>
          <SheetDescription className="font-mono text-xs text-slate-500 mt-1">
            {job.id}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                STATE_TONE_MAP[stateMeta.tone]
              )}
            >
              {stateMeta.label}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-mono font-semibold text-slate-700 bg-slate-50">
              {job.queue}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                STATE_TONE_MAP[priorityMeta.tone]
              )}
            >
              {priorityMeta.label}
            </span>
          </div>

          {/* Job Info Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Job ID</p>
              <p className="text-xs font-mono text-slate-900 break-all">{job.id}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Type</p>
              <p className="text-xs font-medium text-slate-900 truncate">{job.type}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Company</p>
              <p className="text-xs font-medium text-slate-900 truncate">{job.company?.name ?? "System"}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Client</p>
              <p className="text-xs font-medium text-slate-900 truncate">{job.client?.name ?? "—"}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Attempts</p>
              <p className="text-xs font-medium text-slate-900">{job.attempts} / {job.maxAttempts}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Duration</p>
              <p className="text-xs font-medium text-slate-900">
                {job.durationMs != null ? formatDuration(job.durationMs) : "—"}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            {job.scheduledAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Scheduled At</span>
                <span className="text-slate-700 tabular-nums">{formatDateTime(job.scheduledAt)}</span>
              </div>
            )}
            {job.lastAttemptAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Last Attempt</span>
                <span className="text-slate-700 tabular-nums">{formatDateTime(job.lastAttemptAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Retry Eligibility</span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                  STATE_TONE_MAP[retryMeta.tone]
                )}
              >
                {retryMeta.label}
              </span>
            </div>
          </div>

          {/* Failure Summary */}
          {isFailed && (
            <div className="rounded-sm border border-red-200 bg-red-50/50 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs">
                <AlertTriangleIcon className="size-3.5 text-red-600" />
                <span>Failure Summary</span>
              </div>
              {job.failureClassification && (
                <p className="text-xs text-red-700">
                  Classification: {job.failureClassification.replace(/_/g, " ")}
                </p>
              )}
              {job.errorMessage && (
                <p className="text-xs text-red-600 font-mono break-all">{job.errorMessage}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            <Button
              size="sm"
              className="text-xs h-8 font-semibold"
              onClick={() => onOpenFull(job)}
            >
              <ExternalLinkIcon className="size-3.5 mr-1.5" />
              Open Full Job
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 font-semibold"
              disabled={!isRetryable}
              onClick={() => onRequestRetry(job)}
            >
              <RefreshCwIcon className="size-3.5 mr-1.5" />
              Request Retry
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 font-semibold text-slate-600"
              onClick={handleCopy}
            >
              <CopyIcon className="size-3.5 mr-1.5" />
              {copied ? "Copied!" : "Copy Job ID"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
