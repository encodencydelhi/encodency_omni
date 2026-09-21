"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatDateTime, formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { useQueue, useJobs, usePauseQueue, useResumeQueue } from "../data/hooks";
import { QUEUE_STATE_META, MOCK_ENVIRONMENT } from "../data/config";
import type { JobRecord } from "../data/types";
import { JobsTable, JobPreviewDrawer } from "../components";
import { toast } from "sonner";

const STATE_TONE_MAP: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function QueueDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queueId = searchParams.get("queueId");

  const { data: queue, isLoading: queueLoading } = useQueue(queueId ?? "");
  const { data: allJobs = [], isLoading: jobsLoading } = useJobs();
  const pauseMutation = usePauseQueue();
  const resumeMutation = useResumeQueue();

  const [activeTab, setActiveTab] = useState("overview");
  const [previewJob, setPreviewJob] = useState<JobRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const queueJobs = useMemo(() => {
    if (!queue) return [];
    return allJobs.filter((j) => j.queue === queue.name);
  }, [allJobs, queue]);

  const failedJobs = useMemo(() => queueJobs.filter((j) => j.lifecycleState === "failed" || j.lifecycleState === "dead_lettered"), [queueJobs]);

  if (!queueId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <p className="text-sm font-bold text-slate-900">No queue specified</p>
        <Button variant="outline" size="sm" asChild className="text-xs h-8 font-semibold">
          <Link href="/super-admin/jobs?tab=queues">Back to Queues</Link>
        </Button>
      </div>
    );
  }

  if (queueLoading || !queue) {
    return (
      <div className="space-y-4 max-w-full pb-12">
        <div className="h-16 bg-slate-100 animate-pulse rounded-sm" />
        <div className="h-10 bg-slate-100 animate-pulse rounded-sm" />
        <div className="h-64 bg-slate-100 animate-pulse rounded-sm" />
      </div>
    );
  }

  const stateMeta = QUEUE_STATE_META[queue.operationalState];
  const canPauseResume = queue.operationalState === "running" || queue.operationalState === "paused";

  const handlePauseResume = () => {
    if (queue.operationalState === "running") {
      pauseMutation.mutate(queue.id, {
        onSuccess: () => toast.success(`Pause request drafted for "${queue.name}"`),
        onError: () => toast.error("Failed to draft pause request"),
      });
    } else if (queue.operationalState === "paused") {
      resumeMutation.mutate(queue.id, {
        onSuccess: () => toast.success(`Resume request drafted for "${queue.name}"`),
        onError: () => toast.error("Failed to draft resume request"),
      });
    }
  };

  return (
    <div className="space-y-4 max-w-full pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white border-b border-slate-200/80">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-slate-700 shrink-0 mt-0.5" onClick={() => router.back()}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-slate-900 truncate">{queue.name}</h1>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold",
                  stateMeta.tone === "success" && STATE_TONE_MAP.success,
                  stateMeta.tone === "warning" && STATE_TONE_MAP.warning,
                  stateMeta.tone === "info" && STATE_TONE_MAP.info,
                  stateMeta.tone === "danger" && STATE_TONE_MAP.danger,
                  stateMeta.tone === "neutral" && STATE_TONE_MAP.neutral,
                )}
              >
                {stateMeta.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{queue.purpose}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canPauseResume && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "text-xs h-8 font-semibold",
                queue.operationalState === "running" ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              )}
              onClick={handlePauseResume}
            >
              {queue.operationalState === "running" ? (
                <><PauseIcon className="size-3.5 mr-1.5" />Pause</>
              ) : (
                <><PlayIcon className="size-3.5 mr-1.5" />Resume</>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs h-8 font-semibold bg-white text-slate-700" onClick={() => router.refresh()}>
            <RefreshCwIcon className="size-3.5 mr-1.5 text-slate-500" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-white border border-slate-200/90 rounded-sm p-0.5">
          <TabsTrigger value="overview" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="jobs" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">Jobs</TabsTrigger>
          <TabsTrigger value="workers" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">Workers</TabsTrigger>
          <TabsTrigger value="failures" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">Failures</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2 mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-stretch">
            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Queue Information</h3>
              <div className="space-y-2">
                {[
                  { label: "Queue ID", value: queue.id, mono: true },
                  { label: "Name", value: queue.name },
                  { label: "Category", value: queue.category },
                  { label: "Environment", value: queue.environment },
                  { label: "Worker Group", value: queue.workerGroup },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                    <span className={cn("text-xs text-slate-900 font-medium truncate max-w-[160px]", item.mono && "font-mono")}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Processing Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Waiting", value: queue.waiting, color: "text-amber-600" },
                  { label: "Running", value: queue.running, color: "text-blue-600" },
                  { label: "Delayed", value: queue.delayed, color: "text-slate-600" },
                  { label: "Failed", value: queue.failed, color: queue.failed > 0 ? "text-red-600" : "text-slate-600" },
                  { label: "Retry Waiting", value: queue.retryWaiting, color: "text-orange-600" },
                  { label: "Dead Lett.", value: queue.deadLettered, color: queue.deadLettered > 0 ? "text-red-600" : "text-slate-600" },
                ].map((m) => (
                  <div key={m.label} className="rounded-sm border border-slate-200/90 p-2.5 bg-slate-50/50">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{m.label}</p>
                    <p className={cn("text-sm font-extrabold tabular-nums mt-0.5", m.color)}>{formatNumber(m.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Job Counts</h3>
              <div className="space-y-2">
                {[
                  { label: "Succeeded (24h)", value: queue.succeededLast24h },
                  { label: "Registered Workers", value: queue.registeredWorkers },
                  { label: "Total Jobs", value: queue.waiting + queue.running + queue.delayed + queue.failed + queue.succeededLast24h },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                    <span className="text-xs font-bold tabular-nums text-slate-900">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Policies</p>
                {[
                  { label: "Priority", value: queue.priorityPolicy },
                  { label: "Timeout", value: queue.timeoutPolicy },
                  { label: "Retry", value: queue.retryPolicy },
                ].map((p) => (
                  <div key={p.label} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-slate-500">{p.label}</span>
                    <span className="text-xs text-slate-700 font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="mt-2">
          <JobsTable
            jobs={queueJobs}
            onOpenJob={(j) => router.push(`/super-admin/jobs?view=job&jobId=${encodeURIComponent(j.id)}`)}
            onQuickPreview={(j) => { setPreviewJob(j); setPreviewOpen(true); }}
            isLoading={jobsLoading}
          />
        </TabsContent>

        <TabsContent value="workers" className="mt-2">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Assigned Workers</h3>
            {queue.registeredWorkers > 0 ? (
              <div className="space-y-2">
                {Array.from({ length: queue.registeredWorkers }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-900">worker-{queue.workerGroup.toLowerCase()}-{String(i + 1).padStart(2, "0")}</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-xs font-semibold">online</span>
                    </div>
                    <span className="text-xs text-slate-500">{queue.workerGroup}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No workers registered for this queue.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="failures" className="mt-2">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Failed Jobs</h3>
              <span className="text-xs text-slate-400 font-medium">{failedJobs.length} failed</span>
            </div>
            {failedJobs.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No failed jobs in this queue.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {failedJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2 px-2 rounded-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer" onClick={() => router.push(`/super-admin/jobs?view=job&jobId=${encodeURIComponent(job.id)}`)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-slate-900 truncate">{job.id}</p>
                      <p className="text-xs text-slate-500 truncate">{job.type} &middot; {job.company?.name ?? "System"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-slate-500">{job.attempts}/{job.maxAttempts}</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700 text-xs font-semibold">
                        {job.lifecycleState === "dead_lettered" ? "Dead Lettered" : "Failed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-2">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Queue Activity</h3>
            <div className="space-y-0">
              {[
                { event: "Queue registered", time: queue.id, result: "info" },
                { event: "State: running", time: "Current state", result: "success" },
                { event: `${queue.registeredWorkers} worker(s) assigned`, time: queue.workerGroup, result: "info" },
                { event: `Priority policy: ${queue.priorityPolicy}`, time: "Config", result: "info" },
                { event: `Timeout policy: ${queue.timeoutPolicy}`, time: "Config", result: "info" },
              ].map((act, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2 rounded-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-900 truncate">{act.event}</p>
                    <p className="text-xs text-slate-500">{act.time}</p>
                  </div>
                  <span className={cn("px-1.5 py-0.5 rounded-sm text-xs font-semibold",
                    act.result === "success" ? "bg-emerald-50 text-emerald-700" :
                    act.result === "failure" ? "bg-red-50 text-red-700" :
                    "bg-slate-100 text-slate-600"
                  )}>{act.result}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <JobPreviewDrawer
        job={previewJob}
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewJob(null); }}
        onOpenFull={(j) => router.push(`/super-admin/jobs?view=job&jobId=${encodeURIComponent(j.id)}`)}
        onRequestRetry={() => {}}
      />
    </div>
  );
}
