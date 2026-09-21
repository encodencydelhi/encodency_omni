/**
 * EnCodency OmniPlatform - Jobs & Queues Module
 * Worker Detail Drawer
 */

"use client";

import {
  ClockIcon,
  CpuIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatRelativeTime, formatDateTime, formatDuration } from "@/lib/utils/format";
import { WORKER_LIVENESS_META } from "../data/config";
import type { WorkerRecord, JobRecord } from "../data/types";

interface WorkerDetailDrawerProps {
  worker: WorkerRecord | null;
  isOpen: boolean;
  onClose: () => void;
  jobs: JobRecord[];
}

const LIVENESS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  stale: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-slate-300",
};

export function WorkerDetailDrawer({
  worker,
  isOpen,
  onClose,
  jobs,
}: WorkerDetailDrawerProps) {
  if (!worker) return null;

  const livenessMeta = WORKER_LIVENESS_META[worker.liveness];
  const currentJobs = jobs.filter((j) => worker.currentJobIds.includes(j.id));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden p-0 text-xs">
        <SheetHeader className="border-b border-slate-200/80 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-bold text-slate-900">
              Worker Detail
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs font-mono text-slate-500 mt-1">
            ID: {worker.id}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {/* Worker Meta */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Group</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{worker.group}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Environment</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{worker.environment}</p>
            </div>
          </div>

          {/* Registration & Heartbeat */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="size-3.5 text-slate-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Timing</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500">Registered At</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{formatDateTime(worker.registeredAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Last Heartbeat</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{formatRelativeTime(worker.lastHeartbeat)}</p>
              </div>
            </div>
          </div>

          {/* Liveness */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-semibold",
                  livenessMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  livenessMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                  livenessMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                  livenessMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                <span className={cn("size-1.5 rounded-full shrink-0", LIVENESS_DOT[worker.liveness])} />
                {livenessMeta.label}
              </span>
              <span className="text-xs text-slate-500">{livenessMeta.description}</span>
            </div>
          </div>

          {/* Assigned Queues */}
          <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assigned Queues</p>
            <div className="flex flex-wrap gap-1">
              {worker.assignedQueues.map((q) => (
                <Badge key={q} tone="info" className="text-xs">
                  {q}
                </Badge>
              ))}
            </div>
          </div>

          {/* Concurrency & Processing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <div className="flex items-center gap-2 mb-1">
                <CpuIcon className="size-3.5 text-slate-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Concurrency</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {worker.currentProcessing} / {worker.concurrencyCapacity}
              </p>
            </div>
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Current Processing</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{worker.currentProcessing}</p>
            </div>
          </div>

          {/* Recent Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Attempts</p>
              <p className="text-sm font-semibold tabular-nums text-slate-900 mt-0.5">{formatNumber(worker.recentAttempts)}</p>
            </div>
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Failures</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums mt-0.5",
                worker.recentFailures > 0 ? "text-red-600" : "text-slate-900"
              )}>
                {formatNumber(worker.recentFailures)}
              </p>
            </div>
          </div>

          {/* Current Job IDs */}
          {worker.currentJobIds.length > 0 && (
            <div className="rounded-sm border border-slate-200/90 p-3 bg-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current Job IDs</p>
              <div className="flex flex-wrap gap-1">
                {worker.currentJobIds.map((jid) => (
                  <span
                    key={jid}
                    className="inline-flex items-center px-2 py-0.5 rounded-sm border border-blue-200 text-xs font-mono font-medium text-blue-700 bg-blue-50"
                  >
                    {jid}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Current Jobs Detail */}
          {currentJobs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Current Jobs
              </h4>
              <div className="space-y-2">
                {currentJobs.map((job) => (
                  <div key={job.id} className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-xs truncate max-w-[200px]">{job.name || job.type}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{job.id}</p>
                      </div>
                      {job.durationMs !== null && (
                        <span className="text-xs text-slate-500 tabular-nums shrink-0">
                          {formatDuration(job.durationMs)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-white">
                        {job.type}
                      </span>
                      {(job.company || job.client) && (
                        <span className="text-xs text-slate-500 truncate max-w-[150px]">
                          {job.company?.name || job.client?.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {worker.currentJobIds.length === 0 && currentJobs.length === 0 && (
            <div className="rounded-sm border border-slate-100 bg-slate-50/60 p-4 text-center">
              <p className="text-xs text-slate-500">Worker is idle — no current jobs.</p>
            </div>
          )}

          {/* Warning for stale/offline */}
          {(worker.liveness === "stale" || worker.liveness === "offline") && (
            <div className="rounded-sm border border-amber-200 bg-amber-50/50 p-3">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <AlertTriangleIcon className="size-3.5 text-amber-600" />
                <span>Worker Liveness Warning</span>
              </div>
              <p className="text-xs text-amber-700">
                {livenessMeta.description} Last heartbeat was {formatRelativeTime(worker.lastHeartbeat)}.
              </p>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
