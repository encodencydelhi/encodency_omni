"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  ClipboardListIcon,
  CircleAlertIcon,
  TimerResetIcon,
  MailboxIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import { useJobs } from "../data/hooks";
import { MOCK_ENVIRONMENT, JOBS_DATA_SOURCE } from "../data/config";
import type { JobRecord } from "../data/types";
import { JobsTable, JobPreviewDrawer, RetryReviewDrawer } from "../components";

export function FailuresDeadLettersPage() {
  const router = useRouter();
  const { data: allJobs = [], isLoading: jobsLoading } = useJobs();

  const [search, setSearch] = useState("");
  const [previewJob, setPreviewJob] = useState<JobRecord | null>(null);
  const [retryJob, setRetryJob] = useState<JobRecord | null>(null);

  const failures = useMemo(() => {
    return allJobs.filter((j) => ["failed", "dead_lettered", "retry_waiting"].includes(j.lifecycleState));
  }, [allJobs]);

  const filtered = useMemo(() => {
    if (!search) return failures;
    const q = search.toLowerCase();
    return failures.filter(
      (job) =>
        job.id.toLowerCase().includes(q) ||
        job.type.toLowerCase().includes(q) ||
        job.queue.toLowerCase().includes(q) ||
        (job.company?.name ?? "").toLowerCase().includes(q)
    );
  }, [failures, search]);

  const kpis = useMemo(() => {
    return [
      { label: "Failed Jobs", value: failures.filter((j) => j.lifecycleState === "failed").length, tone: "danger", icon: CircleAlertIcon },
      { label: "Retry Waiting", value: failures.filter((j) => j.lifecycleState === "retry_waiting").length, tone: "warning", icon: TimerResetIcon },
      { label: "Dead Lettered", value: failures.filter((j) => j.lifecycleState === "dead_lettered").length, tone: "danger", icon: MailboxIcon },
      { label: "Recovery Pending", value: 0, tone: "info", icon: ShieldAlertIcon }, // Mocked value based on recovery requests
    ];
  }, [failures]);

  const handleOpenFull = (job: JobRecord) => {
    setPreviewJob(null);
    router.push(`/super-admin/jobs?view=job&jobId=${encodeURIComponent(job.id)}`);
  };

  return (
    <div className="space-y-4 max-w-full pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Failures & Dead Letters</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-sm border border-violet-200">Platform</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review failed jobs, dead letters and assess recovery eligibility.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-sm border border-slate-200/80 px-3 py-2">
        <span className="font-medium">Environment:</span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-sm font-semibold">{MOCK_ENVIRONMENT}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Data Source:</span>
        <span>{JOBS_DATA_SOURCE}</span>
        <span className="text-slate-300">|</span>
        <span className="font-medium">Total Failures:</span>
        <span className="font-semibold">{formatNumber(failures.length)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-stretch">
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
                  kpi.tone === "info" && "bg-blue-50 text-blue-600 border-blue-200"
                )}>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className={cn(
                "text-xl font-extrabold tabular-nums mt-0.5",
                kpi.tone === "success" && "text-emerald-600",
                kpi.tone === "warning" && "text-amber-600",
                kpi.tone === "danger" && "text-red-600",
                kpi.tone === "info" && "text-slate-900"
              )}>
                {formatNumber(kpi.value)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            placeholder="Search by ID, type, queue, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs rounded-sm border-slate-200"
          />
        </div>
      </div>

      <JobsTable
        jobs={filtered}
        isLoading={jobsLoading}
        onOpenJob={handleOpenFull}
        onQuickPreview={setPreviewJob}
      />

      <JobPreviewDrawer
        job={previewJob}
        isOpen={previewJob !== null}
        onClose={() => setPreviewJob(null)}
        onOpenFull={handleOpenFull}
        onRequestRetry={(j) => {
          setPreviewJob(null);
          setRetryJob(j);
        }}
      />

      <RetryReviewDrawer
        job={retryJob}
        isOpen={retryJob !== null}
        onClose={() => setRetryJob(null)}
        onRequestRetry={() => setRetryJob(null)}
        onCancel={() => setRetryJob(null)}
      />
    </div>
  );
}
