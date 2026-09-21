/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Retry Review Drawer
 */

"use client";

import {
  AlertTriangleIcon,
  SaveIcon,
  SendIcon,
  XIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShieldQuestionIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatDuration, formatDateTime } from "@/lib/utils/format";
import { FAILURE_CLASSIFICATION_META, RETRY_ELIGIBILITY_META, JOB_LIFECYCLE_META } from "../data/config";
import type { JobRecord } from "../data/types";

interface RetryReviewDrawerProps {
  job: JobRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestRetry: (job: JobRecord) => void;
  onCancel: (job: JobRecord) => void;
}

function getRiskBadge(risk: "safe" | "unknown" | "risky", label: string) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold",
        risk === "safe" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        risk === "unknown" && "bg-amber-50 text-amber-700 border border-amber-200",
        risk === "risky" && "bg-red-50 text-red-700 border border-red-200"
      )}
    >
      {risk === "safe" ? (
        <ShieldCheckIcon className="size-3" />
      ) : risk === "risky" ? (
        <ShieldAlertIcon className="size-3" />
      ) : (
        <ShieldQuestionIcon className="size-3" />
      )}
      {label}
    </span>
  );
}

export function RetryReviewDrawer({
  job,
  isOpen,
  onClose,
  onRequestRetry,
  onCancel,
}: RetryReviewDrawerProps) {
  if (!job) return null;

  const failureMeta = job.failureClassification
    ? FAILURE_CLASSIFICATION_META[job.failureClassification]
    : null;
  const eligibilityMeta = RETRY_ELIGIBILITY_META[job.retryEligibility];
  const lifecycleMeta = JOB_LIFECYCLE_META[job.lifecycleState];

  // Derive risk from payload for display
  const idempotencyRisk = (job.payload?.idempotencyRisk as "safe" | "unknown" | "risky") || "unknown";
  const sideEffectRisk = (job.payload?.sideEffectRisk as "safe" | "unknown" | "risky") || "unknown";
  const dependencyState = (job.payload?.dependencyState as string) || "Unknown";
  const proposedAction = (job.payload?.proposedAction as string) || "Re-execute job";
  const reason = (job.payload?.reason as string) || "N/A";
  const requiresApproval = (job.payload?.requiresApproval as boolean) ?? true;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden p-0 text-xs">
        <SheetHeader className="border-b border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-bold text-slate-900">
              Retry Review
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs font-mono text-slate-500 mt-1">
            Job: {job.id}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {/* Job Identity */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Type</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{job.type}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Company / Client</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                {job.company?.name || job.client?.name || "N/A"}
              </p>
            </div>
          </div>

          {/* Original Execution Summary */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Original Execution Summary
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500">Attempts</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">
                  {formatNumber(job.attempts)} / {formatNumber(job.maxAttempts)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">
                  {job.durationMs !== null ? formatDuration(job.durationMs) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Attempt</p>
                <p className="text-xs font-medium text-slate-700">
                  {job.lastAttemptAt ? formatDateTime(job.lastAttemptAt) : "N/A"}
                </p>
              </div>
            </div>
            {job.errorMessage && (
              <div className="mt-2 rounded-sm border border-red-200 bg-red-50/50 p-2">
                <p className="text-xs font-bold text-red-800 mb-0.5">Last Error</p>
                <p className="text-xs text-red-700 font-mono">{job.errorMessage}</p>
              </div>
            )}
          </div>

          {/* Latest Failure Classification */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Latest Failure Classification
            </p>
            {failureMeta ? (
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                  failureMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  failureMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                  failureMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                  failureMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200",
                  failureMeta.tone === "info" && "bg-blue-50 text-blue-700 border border-blue-200"
                )}
              >
                {failureMeta.label}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Not classified</span>
            )}
          </div>

          {/* Retry Eligibility & Risk Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                eligibilityMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                eligibilityMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                eligibilityMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                eligibilityMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200",
                eligibilityMeta.tone === "info" && "bg-blue-50 text-blue-700 border border-blue-200"
              )}
            >
              Retry: {eligibilityMeta.label}
            </span>
            {getRiskBadge(idempotencyRisk, `Idempotency: ${idempotencyRisk}`)}
            {getRiskBadge(sideEffectRisk, `Side-Effect: ${sideEffectRisk}`)}
          </div>

          {/* Side-Effect Warning */}
          {sideEffectRisk === "risky" && (
            <div className="rounded-sm border border-amber-300 bg-amber-50/80 p-3">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <AlertTriangleIcon className="size-3.5 text-amber-600" />
                <span>External Outcome Unknown</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                External outcome unknown — verify provider result before retrying.
              </p>
            </div>
          )}

          {/* Current Dependency State */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Current Dependency State
            </p>
            <p className="text-sm font-medium text-slate-700">{dependencyState}</p>
          </div>

          {/* Proposed Action & Reason */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Proposed Action
            </p>
            <p className="text-sm font-medium text-slate-700">{proposedAction}</p>
            <div className="mt-2">
              <p className="text-xs text-slate-500">Reason</p>
              <p className="text-xs font-medium text-slate-700 mt-0.5">{reason}</p>
            </div>
          </div>

          {/* Required Approval */}
          {requiresApproval && (
            <div className="rounded-sm border border-blue-200 bg-blue-50/50 p-3">
              <p className="text-xs font-bold text-blue-800 mb-0.5">Required Approval</p>
              <p className="text-xs text-blue-700">
                This retry request requires supervisor approval before execution.
              </p>
            </div>
          )}

          {/* Lifecycle State */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Current State</p>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                lifecycleMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                lifecycleMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                lifecycleMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                lifecycleMeta.tone === "info" && "bg-blue-50 text-blue-700 border border-blue-200",
                lifecycleMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {lifecycleMeta.label}
            </span>
          </div>
        </SheetBody>

        <SheetFooter className="border-t border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 font-semibold text-slate-600 hover:text-red-600"
              onClick={() => onCancel(job)}
            >
              <XIcon className="size-3.5 mr-1.5" />
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 font-semibold text-slate-700"
              onClick={() => onRequestRetry(job)}
            >
              <SaveIcon className="size-3.5 mr-1.5" />
              Save Draft
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs h-8 font-semibold"
              onClick={() => onRequestRetry(job)}
            >
              <SendIcon className="size-3.5 mr-1.5" />
              Create Demo Request
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
