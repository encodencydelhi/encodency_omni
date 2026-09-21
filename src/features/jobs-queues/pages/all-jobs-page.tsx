"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  DownloadIcon,
  FilterXIcon,
  RefreshCwIcon,
  EyeIcon,
  MoreVerticalIcon,
  ListTodoIcon,
  Clock3Icon,
  ZapIcon,
  RefreshCcwIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { useJobs, useQueues, useRequestJobRetry } from "../data/hooks";
import { JOB_LIFECYCLE_META, MOCK_ENVIRONMENT, MOCK_DATA_SOURCE } from "../data/config";
import { filterJobs, getDistinctQueues, getDistinctCompanies, paginate, DEFAULT_JOB_FILTERS, type JobFilters } from "../data/selectors";
import type { JobRecord } from "../data/types";
import { JobsTable, JobPreviewDrawer, RetryReviewDrawer } from "../components";

const QUICK_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Waiting", value: "waiting" },
  { label: "Running", value: "running" },
  { label: "Retry Waiting", value: "retry_waiting" },
  { label: "Failed", value: "failed" },
  { label: "Dead Lettered", value: "dead_lettered" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Scheduled", value: "scheduled" },
];

const SORT_OPTIONS: Array<{ value: JobFilters["sortBy"]; label: string }> = [
  { value: "newest", label: "Newest First" },
  { value: "oldest_waiting", label: "Oldest Waiting" },
  { value: "recently_failed", label: "Recently Failed" },
  { value: "recently_completed", label: "Recently Completed" },
  { value: "priority", label: "Priority" },
  { value: "next_retry", label: "Next Retry" },
];

export function AllJobsPage() {
  const router = useRouter();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: queues = [] } = useQueues();
  const retryMutation = useRequestJobRetry();

  const [filters, setFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);
  const [page, setPage] = useState(1);
  const [previewJob, setPreviewJob] = useState<JobRecord | null>(null);
  const [retryJob, setRetryJob] = useState<JobRecord | null>(null);

  const distinctQueues = useMemo(() => getDistinctQueues(jobs), [jobs]);
  const distinctCompanies = useMemo(() => getDistinctCompanies(jobs), [jobs]);

  const filteredJobs = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const paginated = useMemo(() => paginate(filteredJobs, page, 25), [filteredJobs, page]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {
      total: jobs.length,
      waiting: 0,
      running: 0,
      retry_waiting: 0,
      succeeded: 0,
      failed: 0,
      dead_lettered: 0,
      scheduled: 0,
    };
    for (const j of jobs) {
      if (j.lifecycleState in counts) {
        counts[j.lifecycleState] = (counts[j.lifecycleState] ?? 0) + 1;
      }
    }
    return counts;
  }, [jobs]);

  const handleQuickFilter = useCallback((value: string) => {
    setFilters((f) => ({ ...f, lifecycleState: value }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_JOB_FILTERS);
    setPage(1);
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = ["ID", "Type", "Queue", "State", "Priority", "Company", "Attempts", "Created At", "Duration", "Error"];
    const rows = filteredJobs.map((j) => [
      j.id,
      j.type,
      j.queue,
      JOB_LIFECYCLE_META[j.lifecycleState]?.label ?? j.lifecycleState,
      j.priority,
      j.company?.name ?? "System",
      `${j.attempts}/${j.maxAttempts}`,
      j.createdAt,
      j.durationMs != null ? `${j.durationMs}ms` : "",
      j.errorMessage ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobs-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredJobs]);

  const handleOpenFull = useCallback((job: JobRecord) => {
    setPreviewJob(null);
    router.push(`/super-admin/jobs?view=job&jobId=${encodeURIComponent(job.id)}`);
  }, [router]);

  const handleRequestRetryFromPreview = useCallback((job: JobRecord) => {
    setPreviewJob(null);
    setRetryJob(job);
  }, []);

  const handleRequestRetryFromTable = useCallback((job: JobRecord) => {
    setRetryJob(job);
  }, []);

  const handleCancelRetry = useCallback(() => {
    setRetryJob(null);
  }, []);

  const handleSubmitRetry = useCallback((job?: JobRecord) => {
    const target = job ?? retryJob;
    if (target) retryMutation.mutate(target.id);
    setRetryJob(null);
  }, [retryJob, retryMutation]);

  const hasActiveFilters =
    filters.query !== "" ||
    filters.lifecycleState !== "all" ||
    filters.queue !== "all" ||
    filters.company !== "all" ||
    filters.priority !== "all";

  const now = new Date().toLocaleString();

  return (
    <div className="space-y-4 max-w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">All Jobs</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse, search, filter, and export all background jobs across OmniPlatform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8 font-semibold bg-white text-slate-700" onClick={handleExportCsv}>
            <DownloadIcon className="size-3.5 mr-1.5 text-slate-500" />
            Export
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
        <span className="font-medium">Last Updated:</span>
        <span>{now}</span>
      </div>

      {/* KPI Strip */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: "Total", value: stateCounts.total, color: "slate", icon: ListTodoIcon },
          { label: "Waiting", value: stateCounts.waiting, color: "amber", icon: Clock3Icon },
          { label: "Running", value: stateCounts.running, color: "emerald", icon: ZapIcon },
          { label: "Retry Waiting", value: stateCounts.retry_waiting, color: "orange", icon: RefreshCcwIcon },
          { label: "Succeeded", value: stateCounts.succeeded, color: "green", icon: CheckCircle2Icon },
          { label: "Failed", value: stateCounts.failed, color: "red", icon: XCircleIcon },
          { label: "Dead Lettered", value: stateCounts.dead_lettered, color: "rose", icon: AlertTriangleIcon },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-sm border border-slate-200/90 bg-white text-xs"
            >
              <span className={cn(
                "flex size-6 items-center justify-center rounded-sm border",
                item.color === "slate" && "bg-slate-50 text-slate-700 border-slate-200",
                item.color === "amber" && "bg-amber-50 text-amber-700 border-amber-200",
                item.color === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                item.color === "orange" && "bg-orange-50 text-orange-700 border-orange-200",
                item.color === "green" && "bg-green-50 text-green-700 border-green-200",
                item.color === "red" && "bg-red-50 text-red-700 border-red-200",
                item.color === "rose" && "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                <Icon className="size-3.5" />
              </span>
              <span className="font-medium text-slate-500">{item.label}</span>
              <span className={cn("font-bold tabular-nums",
                item.color === "slate" && "text-slate-900",
                item.color === "amber" && "text-amber-700",
                item.color === "emerald" && "text-emerald-700",
                item.color === "orange" && "text-orange-700",
                item.color === "green" && "text-green-700",
                item.color === "red" && "text-red-700",
                item.color === "rose" && "text-rose-700"
              )}>
                {formatNumber(item.value ?? 0)}
              </span>
              {item.label !== "Total" && (stateCounts.total ?? 0) > 0 && (
                <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full",
                      item.color === "amber" && "bg-amber-400",
                      item.color === "emerald" && "bg-emerald-400",
                      item.color === "orange" && "bg-orange-400",
                      item.color === "green" && "bg-green-400",
                      item.color === "red" && "bg-red-400",
                      item.color === "rose" && "bg-rose-400"
                    )}
                    style={{ width: `${Math.min(((item.value ?? 0) / (stateCounts.total ?? 1)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="rounded-sm border border-slate-200/90 bg-white p-3 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Search by ID, type, queue, company..."
              value={filters.query}
              onChange={(e) => {
                setFilters((f) => ({ ...f, query: e.target.value }));
                setPage(1);
              }}
              className="h-8 text-xs pl-8 bg-white border-slate-200"
            />
          </div>

          {/* Queue Filter */}
          <Select
            value={filters.queue}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, queue: v }));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-40 bg-white border-slate-200">
              <SelectValue placeholder="Queue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Queues</SelectItem>
              {distinctQueues.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Company Filter */}
          <Select
            value={filters.company}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, company: v }));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-40 bg-white border-slate-200">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {distinctCompanies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters.priority}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, priority: v }));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-36 bg-white border-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={filters.sortBy}
            onValueChange={(v) => setFilters((f) => ({ ...f, sortBy: v as JobFilters["sortBy"] }))}
          >
            <SelectTrigger className="h-8 text-xs w-40 bg-white border-slate-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs h-8 font-semibold text-slate-500 hover:text-slate-700" onClick={handleClearFilters}>
              <FilterXIcon className="size-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_FILTERS.map((pf) => (
            <button
              key={pf.value}
              onClick={() => handleQuickFilter(pf.value)}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors border",
                filters.lifecycleState === pf.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {pf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count + pagination */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">
          {formatNumber(paginated.total)} jobs found
          {hasActiveFilters && <span className="text-slate-400 ml-1">(filtered)</span>}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 font-semibold bg-white text-slate-700"
            disabled={!paginated.hasPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500 tabular-nums">
            Page {page} of {paginated.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 font-semibold bg-white text-slate-700"
            disabled={!paginated.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Jobs Table */}
      <JobsTable
        jobs={paginated.items}
        onOpenJob={handleOpenFull}
        onQuickPreview={(job) => setPreviewJob(job)}
        isLoading={jobsLoading}
      />

      {/* Job Preview Drawer */}
      <JobPreviewDrawer
        job={previewJob}
        isOpen={previewJob !== null}
        onClose={() => setPreviewJob(null)}
        onOpenFull={handleOpenFull}
        onRequestRetry={handleRequestRetryFromPreview}
      />

      {/* Retry Review Drawer */}
      <RetryReviewDrawer
        job={retryJob}
        isOpen={retryJob !== null}
        onClose={() => setRetryJob(null)}
        onRequestRetry={handleSubmitRetry}
        onCancel={handleCancelRetry}
      />
    </div>
  );
}
