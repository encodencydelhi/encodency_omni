/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Queue Preview Drawer
 */

"use client";

import {
  EyeIcon,
  ListIcon,
  PauseIcon,
  PlayIcon,
  AlertTriangleIcon,
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
import { formatNumber, formatRelativeTime } from "@/lib/utils/format";
import { QUEUE_STATE_META } from "../data/config";
import type { QueueDefinition } from "../data/types";

interface QueuePreviewDrawerProps {
  queue: QueueDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFull: (queue: QueueDefinition) => void;
  onPauseResume: (queue: QueueDefinition) => void;
}

export function QueuePreviewDrawer({
  queue,
  isOpen,
  onClose,
  onOpenFull,
  onPauseResume,
}: QueuePreviewDrawerProps) {
  if (!queue) return null;

  const stateMeta = QUEUE_STATE_META[queue.operationalState];
  const canPauseResume = queue.operationalState === "running" || queue.operationalState === "paused";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden p-0 text-xs">
        <SheetHeader className="border-b border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-bold text-slate-900">
              {queue.name}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs font-mono text-slate-500 mt-1">
            ID: {queue.id}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {/* Status Bar */}
          <div className="flex items-center gap-2 flex-wrap">
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
            <span className="px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
              {queue.category}
            </span>
            <span className="px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
              {queue.environment}
            </span>
          </div>

          {/* Purpose */}
          <p className="text-xs text-slate-600 leading-relaxed">{queue.purpose}</p>

          {/* Job Counts */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Waiting", value: queue.waiting, color: "text-amber-600" },
              { label: "Running", value: queue.running, color: "text-blue-600" },
              { label: "Delayed", value: queue.delayed, color: "text-slate-600" },
              { label: "Failed", value: queue.failed, color: queue.failed > 0 ? "text-red-600" : "text-slate-600" },
              { label: "Retry Wait", value: queue.retryWaiting, color: "text-orange-600" },
              { label: "Dead Lett.", value: queue.deadLettered, color: queue.deadLettered > 0 ? "text-red-600" : "text-slate-600" },
            ].map((m) => (
              <div key={m.label} className="rounded-sm border border-slate-200/90 bg-slate-50/50 p-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{m.label}</p>
                <p className={cn("text-sm font-extrabold tabular-nums mt-0.5", m.color)}>{formatNumber(m.value)}</p>
              </div>
            ))}
          </div>

          {/* Oldest Waiting Age */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold text-slate-900 mb-1">Oldest Waiting Age</p>
            <p className="text-sm font-semibold tabular-nums text-slate-700">
              {queue.oldestWaitingAt ? formatRelativeTime(queue.oldestWaitingAt) : "None"}
            </p>
          </div>

          {/* Registered Workers */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold text-slate-900 mb-1">Registered Workers</p>
            <p className="text-sm font-semibold tabular-nums text-slate-700">
              {queue.registeredWorkers}
            </p>
          </div>

          {/* Job Types */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold text-slate-900 mb-1">Job Types</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {queue.jobTypes.map((jt) => (
                <Badge key={jt} tone="neutral" className="text-xs">
                  {jt}
                </Badge>
              ))}
            </div>
          </div>

          {/* Policies Grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Priority Policy", value: queue.priorityPolicy },
              { label: "Concurrency", value: queue.concurrencyReference },
              { label: "Timeout", value: queue.timeoutPolicy },
              { label: "Retry Policy", value: queue.retryPolicy },
            ].map((p) => (
              <div key={p.label} className="rounded-sm border border-slate-200/90 p-3 bg-white">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.label}</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{p.value}</p>
              </div>
            ))}
          </div>

          {/* Dead-Letter Policy */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dead-Letter Policy</p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{queue.deadLetterPolicy}</p>
          </div>
        </SheetBody>

        <SheetFooter className="border-t border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="text-xs h-8 font-semibold"
              onClick={() => {
                onOpenFull(queue);
                onClose();
              }}
            >
              <EyeIcon className="size-3.5 mr-1.5" />
              Open Queue
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 font-semibold"
              onClick={() => {
                onOpenFull(queue);
                onClose();
              }}
            >
              <ListIcon className="size-3.5 mr-1.5" />
              View Jobs
            </Button>
            {canPauseResume && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs h-8 font-semibold",
                  queue.operationalState === "running"
                    ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                )}
                onClick={() => onPauseResume(queue)}
              >
                {queue.operationalState === "running" ? (
                  <>
                    <PauseIcon className="size-3.5 mr-1.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayIcon className="size-3.5 mr-1.5" />
                    Resume
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 font-semibold text-red-600 hover:bg-red-50"
              onClick={() => {
                onOpenFull(queue);
                onClose();
              }}
            >
              <AlertTriangleIcon className="size-3.5 mr-1.5" />
              View Failures
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
