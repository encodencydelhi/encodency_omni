"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  RefreshCwIcon,
  ZapIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ServerIcon,
  CalendarIcon,
  UsersIcon,
  ActivityIcon,
  TimerIcon,
  XCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber, formatDateTime, formatRelativeTime, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useJobsOverview, useResetJobsDemo } from "../data/hooks";
import { JOB_LIFECYCLE_META, MOCK_ENVIRONMENT, MOCK_DATA_SOURCE, MOCK_WORKER_STATUS } from "../data/config";
import { JobsKpiCards } from "../components";

export function OverviewPage() {
  const { data: overview, isLoading } = useJobsOverview();
  const resetDemo = useResetJobsDemo();
  const now = new Date().toLocaleString();

  if (isLoading || !overview) {
    return (
      <div className="space-y-4 max-w-full pb-12">
        <div className="h-10 w-64 rounded bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-sm bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-sm bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const { kpis, processingTrend, queues, failuresRequiringAttention, upcomingScheduled, workers, recentActivity } = overview;

  return (
    <div className="space-y-4 max-w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Jobs & Queues</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor background execution, queue processing, scheduled jobs and operational failures across OmniPlatform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="text-xs h-8 font-semibold bg-white text-slate-700">
            <Link href="/super-admin/system-health">
              <ServerIcon className="size-3.5 mr-1.5 text-slate-500" />
              System Health
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8 font-semibold bg-white text-slate-700" onClick={() => resetDemo.mutate()} disabled={resetDemo.isPending}>
            <RefreshCwIcon className={cn("size-3.5 mr-1.5 text-slate-500", resetDemo.isPending && "animate-spin")} />
            Reset Demo
          </Button>
        </div>
      </div>

      {/* Operational Context Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-sm border border-slate-200/80 px-3 py-2">
        <span className="font-medium">Environment:</span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold">{MOCK_ENVIRONMENT}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Job Data Source:</span>
        <span>{MOCK_DATA_SOURCE}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Worker Backend:</span>
        <span className="text-amber-600">{MOCK_WORKER_STATUS}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Last Updated:</span>
        <span>{now}</span>
      </div>

      {/* KPI Cards */}
      <JobsKpiCards kpis={kpis} />

      {/* Processing Trend Chart (simple bar visualization) */}
      <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Processing Trend</h2>
            <p className="text-xs text-slate-500 mt-0.5">Job completions and failures over the last 14 days.</p>
          </div>
        </div>
        <div className="flex items-end gap-1 h-32">
          {processingTrend.map((point, i) => {
            const maxVal = Math.max(...processingTrend.map((p) => p.completed + p.failed), 1);
            const completedH = (point.completed / maxVal) * 100;
            const failedH = (point.failed / maxVal) * 100;
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex flex-col items-center gap-0.5 cursor-default">
                    <div className="w-full flex flex-col items-center" style={{ height: "120px" }}>
                      <div className="w-full flex items-end" style={{ height: "100%" }}>
                        <div className="w-full bg-emerald-400 rounded-t-sm" style={{ height: `${completedH}%`, minHeight: "2px" }} />
                      </div>
                      {failedH > 0 && (
                        <div className="w-full flex items-end -mt-px">
                          <div className="w-full bg-red-400 rounded-t-sm" style={{ height: `${failedH}%`, minHeight: "1px" }} />
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <p className="font-semibold">{point.date}</p>
                  <p>Completed: {point.completed}</p>
                  <p>Failed: {point.failed}</p>
                  <p>Started: {point.started}</p>
                  <p>Retries: {point.retriesScheduled}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-emerald-400" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-red-400" /> Failed</span>
        </div>
      </div>

      {/* Queue Backlog + Failures Requiring Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {/* Queue Backlog */}
        <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Queue Backlog</h2>
              <p className="text-xs text-slate-500 mt-0.5">Current operational state per queue.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/super-admin/jobs?tab=queues">View All <ArrowRightIcon className="size-3 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-2 flex-1">
            {queues.slice(0, 6).map((q) => (
              <div key={q.id} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{q.name}</p>
                  <p className="text-xs text-slate-400">{q.category}</p>
                </div>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-amber-600 font-medium" title="Waiting">{q.waiting} waiting</span>
                  <span className="text-blue-600 font-medium" title="Running">{q.running} running</span>
                  <span className={cn("px-1.5 py-0.5 rounded-sm text-xs font-semibold",
                    q.operationalState === "running" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  )}>{q.operationalState === "running" ? "Running" : "Paused"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Failures Requiring Attention */}
        <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Failures Requiring Attention</h2>
              <p className="text-xs text-slate-500 mt-0.5">Jobs eligible for retry or manual review.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/super-admin/jobs?tab=failures">View All <ArrowRightIcon className="size-3 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-2 flex-1">
            {failuresRequiringAttention.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No failures requiring attention.</p>
            ) : (
              failuresRequiringAttention.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 font-mono truncate">{j.id}</p>
                    <p className="text-xs text-slate-500 truncate">{j.type} &middot; {j.company?.name ?? "System"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{j.attempts}/{j.maxAttempts} attempts</span>
                    <span className="px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700 text-xs font-semibold">
                      {JOB_LIFECYCLE_META[j.lifecycleState]?.label}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled + Worker Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {/* Upcoming Scheduled */}
        <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Upcoming Scheduled</h2>
              <p className="text-xs text-slate-500 mt-0.5">Jobs pending future execution.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/super-admin/jobs?tab=schedules">View All <ArrowRightIcon className="size-3 ml-1" /></Link>
            </Button>
          </div>
          <div className="space-y-2 flex-1">
            {upcomingScheduled.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No upcoming scheduled jobs.</p>
            ) : (
              upcomingScheduled.map((j) => (
                <div key={j.id} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{j.type}</p>
                    <p className="text-xs text-slate-500">{j.company?.name ?? "System"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-700">{j.scheduledAt ? formatDateTime(j.scheduledAt) : "Not set"}</p>
                    <p className="text-xs text-slate-400">{j.queue}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Worker Activity */}
        <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Worker Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Registered workers and their liveness status.</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link href="/super-admin/jobs?tab=workers">View All <ArrowRightIcon className="size-3 ml-1" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "Online", value: kpis.onlineWorkers, color: "emerald", icon: CheckCircle2Icon },
              { label: "Stale", value: kpis.staleWorkers, color: "amber", icon: ClockIcon },
              { label: "Offline", value: kpis.offlineWorkers, color: "red", icon: XCircleIcon },
              { label: "Total", value: kpis.totalWorkers, color: "slate", icon: UsersIcon },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 py-1.5 px-2 rounded-sm bg-slate-50">
                <span className={cn("size-6 rounded-sm flex items-center justify-center",
                  item.color === "emerald" && "bg-emerald-50 text-emerald-600",
                  item.color === "amber" && "bg-amber-50 text-amber-600",
                  item.color === "red" && "bg-red-50 text-red-600",
                  item.color === "slate" && "bg-slate-100 text-slate-600"
                )}>
                  <item.icon className="size-3" />
                </span>
                <div>
                  <p className="text-sm font-bold tabular-nums">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1 flex-1 overflow-y-auto max-h-40">
            {workers.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between py-1 px-2 text-xs rounded-sm hover:bg-slate-50">
                <span className="font-mono font-medium truncate">{w.id}</span>
                <span className={cn("px-1.5 py-0.5 rounded-sm text-xs font-semibold",
                  w.liveness === "online" ? "bg-emerald-50 text-emerald-700" :
                  w.liveness === "stale" ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-700"
                )}>{w.liveness}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Job Activity */}
      <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Recent Job Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest operational events across all queues.</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs h-7">
            <Link href="/super-admin/jobs?tab=activity">View Activity <ArrowRightIcon className="size-3 ml-1" /></Link>
          </Button>
        </div>
        <div className="space-y-0 max-h-64 overflow-y-auto">
          {recentActivity.map((act) => (
            <div key={act.id} className="flex items-center justify-between py-2 px-2 rounded-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-900 truncate">{act.details}</p>
                <p className="text-xs text-slate-500">
                  {act.jobId && <span className="font-mono">{act.jobId}</span>}
                  {act.queue && <span className="ml-1.5 text-slate-400">&middot; {act.queue}</span>}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <span className={cn("px-1.5 py-0.5 rounded-sm text-xs font-semibold",
                  act.result === "success" ? "bg-emerald-50 text-emerald-700" :
                  act.result === "failure" ? "bg-red-50 text-red-700" :
                  "bg-slate-100 text-slate-600"
                )}>{act.result}</span>
                <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(act.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
