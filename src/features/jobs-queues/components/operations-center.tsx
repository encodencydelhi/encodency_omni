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
import { SchedulesPage } from "../pages/schedules-page";
import { FailuresDeadLettersPage } from "../pages/failures-dead-letters-page";
import { WorkersProcessingPage } from "../pages/workers-processing-page";
import { ActivitySettingsPage } from "../pages/activity-settings-page";
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
      {tab === "schedules" ? <SchedulesPage /> : null}
      {tab === "failures" ? <FailuresDeadLettersPage /> : null}
      {tab === "workers" ? <WorkersProcessingPage /> : null}
      {tab === "activity" ? <ActivitySettingsPage /> : null}
      {tab === "overview" ? <OverviewPage /> : null}
    </div>
  );
}

