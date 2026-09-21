"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarIcon,
  ClipboardListIcon,
  ListChecksIcon,
  RefreshCwIcon,
  ServerIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/lib/utils/format";
import {
  useActivity,
  useJobs,
  useQueueOperationalControls,
  useRecoveryRequests,
  useSchedules,
  useWorkers,
} from "../data/hooks";
import {
  FAILURE_CLASSIFICATION_META,
  JOB_LIFECYCLE_META,
  RETRY_REQUEST_STATE_META,
  SCHEDULE_STATE_META,
  WORKER_LIVENESS_META,
} from "../data/config";
import type { JobRecord, WorkerRecord } from "../data/types";
import { AllJobsPage } from "../pages/all-jobs-page";
import { JobDetailPage } from "../pages/job-detail-page";
import { OverviewPage } from "../pages/overview-page";
import { QueueDetailPage } from "../pages/queue-detail-page";
import { QueuesPage } from "../pages/queues-page";
import { JobsTable, RetryReviewDrawer, WorkerDetailDrawer, WorkerTable } from ".";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "jobs", label: "All Jobs" },
  { id: "queues", label: "Queues" },
  { id: "schedules", label: "Schedules" },
  { id: "failures", label: "Failures & Dead Letters" },
  { id: "workers", label: "Workers & Processing" },
  { id: "activity", label: "Activity & Settings" },
];

const toneClass: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold", toneClass[tone])}>
      {children}
    </span>
  );
}

export function JobsQueuesOperationsCenter() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const tab = searchParams.get("tab") ?? "overview";

  if (view === "job") return <JobDetailPage />;
  if (view === "queue") return <QueueDetailPage />;

  return (
    <div className="space-y-4">
      <Tabs value={tab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="h-9 rounded-sm border border-slate-200 bg-white p-0.5">
            {TABS.map((item) => (
              <TabsTrigger key={item.id} value={item.id} asChild className="h-7 rounded-sm px-3 text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                <Link href={item.id === "overview" ? "/super-admin/jobs" : `/super-admin/jobs?tab=${item.id}`}>
                  {item.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {tab === "jobs" ? <AllJobsPage /> : null}
      {tab === "queues" ? <QueuesPage /> : null}
      {tab === "schedules" ? <SchedulesPanel /> : null}
      {tab === "failures" ? <FailuresPanel /> : null}
      {tab === "workers" ? <WorkersPanel /> : null}
      {tab === "activity" ? <ActivitySettingsPanel /> : null}
      {tab === "overview" ? <OverviewPage /> : null}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof CalendarIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600">
          <Icon className="size-4" />
        </span>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function SchedulesPanel() {
  const { data: schedules = [], isLoading } = useSchedules();
  const { data: jobs = [] } = useJobs();
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  return (
    <div className="space-y-4 pb-12">
      <SectionHeader icon={CalendarIcon} title="Schedules" subtitle="Inspect scheduled execution records without changing publishing intent." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {["upcoming", "due", "dispatched", "missed"].map((state) => (
          <div key={state} className="rounded-sm border border-slate-200 bg-white p-3 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{state.replace("_", " ")}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums">{formatNumber(schedules.filter((s) => s.scheduleState === state).length)}</p>
          </div>
        ))}
      </div>
      <div className="rounded-sm border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wider">
              <tr><th className="px-3 py-2">Scheduled Job</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Queue</th><th className="px-3 py-2">Scheduled At</th><th className="px-3 py-2">State</th><th className="px-3 py-2 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Loading schedules...</td></tr> : schedules.map((schedule) => {
                const job = jobById.get(schedule.jobId);
                const meta = SCHEDULE_STATE_META[schedule.scheduleState];
                return (
                  <tr key={schedule.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><p className="font-mono font-semibold text-slate-900">{schedule.jobId}</p><p className="text-slate-500">{job?.type ?? "Unknown job"}</p></td>
                    <td className="px-3 py-2 text-slate-700">{job?.company?.name ?? "System"}</td>
                    <td className="px-3 py-2"><Badge>{job?.queue ?? "Unknown"}</Badge></td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{formatDateTime(schedule.scheduledAt)}<p className="text-slate-400">{schedule.timezone}</p></td>
                    <td className="px-3 py-2"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                    <td className="px-3 py-2 text-right"><Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link href={`/super-admin/jobs?view=job&jobId=${schedule.jobId}`}>Open Job</Link></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FailuresPanel() {
  const { data: jobs = [], isLoading } = useJobs();
  const [retryJob, setRetryJob] = useState<JobRecord | null>(null);
  const failed = jobs.filter((job) => ["failed", "dead_lettered", "retry_waiting"].includes(job.lifecycleState));

  return (
    <div className="space-y-4 pb-12">
      <SectionHeader icon={ClipboardListIcon} title="Failures & Dead Letters" subtitle="Review failed jobs, dead letters and recovery eligibility." />
      <JobsTable jobs={failed} isLoading={isLoading} onOpenJob={(job) => location.assign(`/super-admin/jobs?view=job&jobId=${job.id}`)} onQuickPreview={setRetryJob} />
      <RetryReviewDrawer job={retryJob} isOpen={Boolean(retryJob)} onClose={() => setRetryJob(null)} onCancel={() => setRetryJob(null)} onRequestRetry={() => setRetryJob(null)} />
    </div>
  );
}

function WorkersPanel() {
  const { data: workers = [], isLoading } = useWorkers();
  const { data: jobs = [] } = useJobs();
  const [selectedWorker, setSelectedWorker] = useState<WorkerRecord | null>(null);

  return (
    <div className="space-y-4 pb-12">
      <SectionHeader icon={ServerIcon} title="Workers & Processing" subtitle="Inspect worker liveness, current processing and heartbeat freshness." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(["online", "stale", "offline", "unknown"] as const).map((state) => {
          const meta = WORKER_LIVENESS_META[state];
          return <div key={state} className="rounded-sm border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{meta.label}</p><p className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums">{workers.filter((w) => w.liveness === state).length}</p></div>;
        })}
      </div>
      <WorkerTable workers={workers} isLoading={isLoading} onOpenWorker={setSelectedWorker} />
      <WorkerDetailDrawer worker={selectedWorker} isOpen={Boolean(selectedWorker)} onClose={() => setSelectedWorker(null)} jobs={jobs} />
    </div>
  );
}

function ActivitySettingsPanel() {
  const { data: activity = [] } = useActivity();
  const { data: recoveryRequests = [] } = useRecoveryRequests();
  const { data: controls = [] } = useQueueOperationalControls();
  const activityStatsCards = [
    {
      title: "Recovery Requests",
      icon: RefreshCwIcon,
      content: (
        <div className="mt-3 max-h-[260px] overflow-auto divide-y divide-slate-100">
          {recoveryRequests.map((request) => {
            const meta = RETRY_REQUEST_STATE_META[request.state];
            return <div key={request.id} className="flex items-center justify-between gap-2 py-2"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-slate-900">{request.id}</p><p className="truncate text-xs text-slate-500">{request.jobId} · {request.proposedAction}</p></div><Badge tone={meta.tone}>{meta.label}</Badge></div>;
          })}
        </div>
      ),
    },
    {
      title: "Queue Control Requests",
      icon: SlidersHorizontalIcon,
      content: (
        <div className="mt-3 max-h-[260px] overflow-auto divide-y divide-slate-100">
          {controls.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">No queue-control requests yet.</p> : controls.map((control) => <div key={control.id} className="py-2"><div className="flex items-center justify-between gap-2"><p className="font-mono text-xs font-semibold text-slate-900">{control.id}</p><Badge tone="warning">{control.state.replace("_", " ")}</Badge></div><p className="mt-0.5 text-xs text-slate-500">{control.queueName}: {control.currentOperationalState} to {control.proposedOperationalState}</p></div>)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      <SectionHeader icon={Settings2Icon} title="Activity & Settings" subtitle="Review operational activity, retry drafts and queue-control requests." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {activityStatsCards.map(({ title, icon: Icon, content }) => (
          <div key={title} className="rounded-sm border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h2>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-600">
                <Icon className="size-4" />
              </span>
            </div>
            {content}
          </div>
        ))}
      </div>
      <div className="rounded-sm border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="max-h-[420px] overflow-auto divide-y divide-slate-100">
          {activity.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{item.details}</p>
                <p className="text-xs text-slate-500">{item.eventType} · {item.actor} · {item.queue ?? "Platform"}</p>
              </div>
              <div className="shrink-0 text-right"><Badge tone={item.result === "success" ? "success" : item.result === "failure" ? "danger" : "neutral"}>{item.result}</Badge><p className="mt-1 text-xs text-slate-400">{formatRelativeTime(item.timestamp)}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
