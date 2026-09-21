"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  CalendarIcon,
  RefreshCwIcon,
  Clock3Icon,
  CalendarCheck2Icon,
  CircleCheckBigIcon,
  CircleXIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatDateTime, formatRelativeTime } from "@/lib/utils/format";
import { useSchedules, useJobs } from "../data/hooks";
import { SCHEDULE_STATE_META, MOCK_ENVIRONMENT, MOCK_DATA_SOURCE } from "../data/config";
import type { JobSchedule } from "../data/types";

const STATE_TONE_MAP: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function SchedulesPage() {
  const router = useRouter();
  const { data: schedules = [], isLoading } = useSchedules();
  const { data: allJobs = [] } = useJobs();

  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      const matchesSearch = !search || s.jobId.toLowerCase().includes(search.toLowerCase());
      const matchesState = stateFilter === "all" || s.scheduleState === stateFilter;
      return matchesSearch && matchesState;
    });
  }, [schedules, search, stateFilter]);

  const kpis = useMemo(() => {
    return [
      { label: "Upcoming", value: schedules.filter((s) => s.scheduleState === "upcoming").length, tone: "info", icon: Clock3Icon },
      { label: "Due", value: schedules.filter((s) => s.scheduleState === "due").length, tone: "warning", icon: CalendarIcon },
      { label: "Dispatched", value: schedules.filter((s) => s.scheduleState === "dispatched").length, tone: "success", icon: CalendarCheck2Icon },
      { label: "Cancelled", value: schedules.filter((s) => s.scheduleState === "cancelled").length, tone: "neutral", icon: CircleXIcon },
      { label: "Missed", value: schedules.filter((s) => s.scheduleState === "missed").length, tone: "danger", icon: AlertTriangleIcon },
    ];
  }, [schedules]);

  const getJobForSchedule = (schedule: JobSchedule) => allJobs.find((j) => j.id === schedule.jobId);

  return (
    <div className="space-y-4 max-w-full pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Schedules</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            View upcoming, due, dispatched, and missed scheduled jobs across all queues.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-sm border border-slate-200/80 px-3 py-2">
        <span className="font-medium">Environment:</span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold">{MOCK_ENVIRONMENT}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Data Source:</span>
        <span>{MOCK_DATA_SOURCE}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Total Schedules:</span>
        <span className="font-semibold">{formatNumber(schedules.length)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-stretch">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-sm border border-slate-200/90 bg-white p-3 shadow-2xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
                <span className={cn(
                  "flex size-6 items-center justify-center rounded-sm border",
                  kpi.tone === "success" && "bg-emerald-50 text-emerald-600 border-emerald-200",
                  kpi.tone === "warning" && "bg-amber-50 text-amber-600 border-amber-200",
                  kpi.tone === "danger" && "bg-red-50 text-red-600 border-red-200",
                  kpi.tone === "info" && "bg-blue-50 text-blue-600 border-blue-200",
                  kpi.tone === "neutral" && "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className={cn(
                "text-xl font-extrabold tabular-nums mt-0.5",
                kpi.tone === "success" && "text-emerald-600",
                kpi.tone === "warning" && "text-amber-600",
                kpi.tone === "danger" && "text-red-600",
                kpi.tone === "info" && "text-slate-900",
                kpi.tone === "neutral" && "text-slate-500"
              )}>
                {formatNumber(kpi.value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            placeholder="Search by Job ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs rounded-sm border-slate-200"
          />
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="h-8 px-2 text-xs rounded-sm border border-slate-200 bg-white text-slate-700 font-medium"
        >
          <option value="all">All States</option>
          {Object.entries(SCHEDULE_STATE_META).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-sm border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
              <tr>
                <th className="py-2 px-3">Job</th>
                <th className="py-2 px-3">Schedule Type</th>
                <th className="py-2 px-3">Company/Client</th>
                <th className="py-2 px-3">Queue</th>
                <th className="py-2 px-3">Scheduled At</th>
                <th className="py-2 px-3">Timezone</th>
                <th className="py-2 px-3">State</th>
                <th className="py-2 px-3">Next Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="py-2 px-3"><div className="h-4 rounded bg-slate-100 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                    No schedules match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((schedule) => {
                  const job = getJobForSchedule(schedule);
                  const stateMeta = SCHEDULE_STATE_META[schedule.scheduleState];
                  return (
                    <tr
                      key={schedule.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/super-admin/jobs?view=job&jobId=${schedule.jobId}`)}
                    >
                      <td className="py-2 px-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-slate-900 truncate max-w-[140px]">{schedule.jobId}</p>
                          {job && <p className="text-xs text-slate-400 truncate max-w-[140px]">{job.type}</p>}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
                          {schedule.recurrenceRule ? "Recurring" : "One-time"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate max-w-[120px]">
                            {job?.company?.name ?? "System"}
                          </p>
                          {job?.client && (
                            <p className="text-xs text-slate-400 truncate max-w-[120px]">{job.client.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm border border-slate-200 text-xs font-medium text-slate-600 bg-slate-50">
                          {job?.queue ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(schedule.scheduledAt)}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {schedule.timezone}
                      </td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                          stateMeta.tone === "success" && STATE_TONE_MAP.success,
                          stateMeta.tone === "warning" && STATE_TONE_MAP.warning,
                          stateMeta.tone === "danger" && STATE_TONE_MAP.danger,
                          stateMeta.tone === "info" && STATE_TONE_MAP.info,
                          stateMeta.tone === "neutral" && STATE_TONE_MAP.neutral,
                        )}>
                          {stateMeta.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {schedule.nextEligibleExecution ? formatRelativeTime(schedule.nextEligibleExecution) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
