/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Job Detail Header
 */

"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  XIcon,
  MoreVerticalIcon,
  CopyIcon,
  GitBranchIcon,
  LinkIcon,
  ActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { JOB_LIFECYCLE_META, JOB_PRIORITY_META } from "../data/config";
import type { JobRecord } from "../data/types";

interface JobDetailHeaderProps {
  job: JobRecord;
  onBack: () => void;
  onRequestRetry: (job: JobRecord) => void;
  onCancel: (job: JobRecord) => void;
  onViewWorkflow?: () => void;
  onViewRelatedResource?: () => void;
  onViewActivity?: () => void;
}

const PRIORITY_DEFAULT = { label: "Normal", tone: "neutral" as const };

const STATE_TONE_MAP: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function JobDetailHeader({
  job,
  onBack,
  onRequestRetry,
  onCancel,
  onViewWorkflow,
  onViewRelatedResource,
  onViewActivity,
}: JobDetailHeaderProps) {
  const [copied, setCopied] = useState(false);

  const stateMeta = JOB_LIFECYCLE_META[job.lifecycleState];
  const priorityMeta = JOB_PRIORITY_META[job.priority] ?? PRIORITY_DEFAULT;

  const isRetryable = job.retryEligibility === "retryable";
  const isCancellable = ["waiting", "ready", "scheduled", "retry_waiting"].includes(job.lifecycleState);

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(job.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white border-b border-slate-200/80">
      {/* Left Side */}
      <div className="flex items-start gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-slate-500 hover:text-slate-700 shrink-0 mt-0.5"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-bold text-slate-900 truncate">{job.type}</h1>
            <span className="font-mono text-xs text-slate-500 truncate">{job.id}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
            {job.company && (
              <span className="text-xs text-slate-500 font-medium">
                {job.company.name}
                {job.client && <span className="text-slate-400"> / {job.client.name}</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 shrink-0">
        {isRetryable && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 font-semibold"
            onClick={() => onRequestRetry(job)}
          >
            <RefreshCwIcon className="size-3.5 mr-1.5" />
            Review Retry
          </Button>
        )}
        {isCancellable && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 font-semibold text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onCancel(job)}
          >
            <XIcon className="size-3.5 mr-1.5" />
            Cancel
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-slate-400 hover:text-slate-700">
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 text-xs">
            <DropdownMenuItem className="text-xs" onClick={handleCopyId}>
              <CopyIcon className="size-3.5 mr-2 text-slate-400" />
              {copied ? "Copied!" : "Copy Job ID"}
            </DropdownMenuItem>
            {job.workflowId && (
              <DropdownMenuItem className="text-xs" onClick={onViewWorkflow}>
                <GitBranchIcon className="size-3.5 mr-2 text-slate-400" />
                View Workflow
              </DropdownMenuItem>
            )}
            {job.relatedResourceId && (
              <DropdownMenuItem className="text-xs" onClick={onViewRelatedResource}>
                <LinkIcon className="size-3.5 mr-2 text-slate-400" />
                View Related Resource
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs" onClick={onViewActivity}>
              <ActivityIcon className="size-3.5 mr-2 text-slate-400" />
              View Operational Activity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
