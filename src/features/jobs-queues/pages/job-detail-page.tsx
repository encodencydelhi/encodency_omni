"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  ZapIcon,
  TimerIcon,
  CalendarIcon,
  UserIcon,
  ServerIcon,
  LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatDateTime, formatDuration, formatRelativeTime } from "@/lib/utils/format";
import { useJob, useJobAttempts, useRequestJobRetry, useCancelJob } from "../data/hooks";
import { jobsQueuesRepository } from "../data/repository";
import { JOB_LIFECYCLE_META, JOB_PRIORITY_META, FAILURE_CLASSIFICATION_META, RETRY_ELIGIBILITY_META, MOCK_ENVIRONMENT } from "../data/config";
import type { JobRecord, JobAttempt } from "../data/types";
import { JobDetailHeader, JobAttemptsTable, RetryReviewDrawer } from "../components";
import { toast } from "sonner";

const STATE_TONE_MAP: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
};

const ATTEMPT_RESULT_TONE: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
  timeout: "bg-amber-50 text-amber-700 border border-amber-200",
  unknown: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function JobDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");

  const { data: job, isLoading: jobLoading } = useJob(jobId ?? "");
  const { data: attempts = [], isLoading: attemptsLoading } = useJobAttempts(jobId ?? "");
  const retryMutation = useRequestJobRetry();
  const cancelMutation = useCancelJob();

  const [retryDrawerOpen, setRetryDrawerOpen] = useState(false);
  const [retryTarget, setRetryTarget] = useState<JobRecord | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<JobAttempt | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [workflowData, setWorkflowData] = useState<null | { id: string; name: string; jobIds: string[]; completionPolicy: string; currentStatus: string; relatedResourceType: string; relatedResourceId: string; relatedResourceName: string }>(null);

  useEffect(() => {
    if (job?.workflowId) {
      jobsQueuesRepository.getWorkflowById(job.workflowId).then(setWorkflowData);
    } else {
      setWorkflowData(null);
    }
  }, [job?.workflowId]);

  if (!jobId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <AlertTriangleIcon className="size-10 text-amber-500" />
        <h2 className="text-sm font-bold text-slate-900">No job specified</h2>
        <p className="text-xs text-slate-500">Provide a valid job ID to view details.</p>
        <Button variant="outline" size="sm" asChild className="text-xs h-8 font-semibold">
          <Link href="/super-admin/jobs">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  if (jobLoading || !job) {
    return (
      <div className="space-y-4 max-w-full pb-12">
        <div className="h-16 bg-slate-100 animate-pulse rounded-sm" />
        <div className="h-10 bg-slate-100 animate-pulse rounded-sm" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-48 bg-slate-100 animate-pulse rounded-sm" />
          <div className="h-48 bg-slate-100 animate-pulse rounded-sm" />
        </div>
      </div>
    );
  }

  const stateMeta = JOB_LIFECYCLE_META[job.lifecycleState];
  const priorityMeta = JOB_PRIORITY_META[job.priority] ?? { label: "Normal", tone: "neutral" as const };
  const failureMeta = job.failureClassification ? FAILURE_CLASSIFICATION_META[job.failureClassification] : null;
  const eligibilityMeta = RETRY_ELIGIBILITY_META[job.retryEligibility];

  const handleRequestRetry = (j: JobRecord) => {
    setRetryTarget(j);
    setRetryDrawerOpen(true);
  };

  const handleCancel = (j: JobRecord) => {
    cancelMutation.mutate(j.id, {
      onSuccess: () => toast.success("Cancellation request recorded"),
      onError: () => toast.error("Failed to record cancellation request"),
    });
  };

  const handleSubmitRetry = () => {
    if (!retryTarget) return;
    retryMutation.mutate(retryTarget.id, {
      onSuccess: () => {
        toast.success("Retry request submitted");
        setRetryDrawerOpen(false);
        setRetryTarget(null);
      },
      onError: () => toast.error("Failed to submit retry request"),
    });
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(job.id);
    toast.success("Job ID copied");
  };

  const timelineEvents = [
    job.createdAt && { label: "Created", time: job.createdAt, icon: CalendarIcon, tone: "info" },
    job.scheduledAt && { label: "Scheduled", time: job.scheduledAt, icon: ClockIcon, tone: "info" },
    job.enqueuedAt && { label: "Enqueued", time: job.enqueuedAt, icon: ZapIcon, tone: "info" },
    job.startedAt && { label: "Started", time: job.startedAt, icon: ZapIcon, tone: "success" },
    job.lastAttemptAt && { label: "Last Attempt", time: job.lastAttemptAt, icon: RefreshCwIcon, tone: "warning" },
    job.nextRetryAt && { label: "Next Retry", time: job.nextRetryAt, icon: TimerIcon, tone: "warning" },
    job.completedAt && { label: "Completed", time: job.completedAt, icon: CheckCircle2Icon, tone: job.lifecycleState === "succeeded" ? "success" : "danger" },
  ].filter(Boolean) as { label: string; time: string; icon: typeof CalendarIcon; tone: string }[];

  return (
    <div className="space-y-4 max-w-full pb-12">
      <JobDetailHeader
        job={job}
        onBack={() => router.back()}
        onRequestRetry={handleRequestRetry}
        onCancel={handleCancel}
        onViewWorkflow={() => setActiveTab("workflow")}
        onViewRelatedResource={() => router.push(resolveRelatedHref(job))}
        onViewActivity={() => router.push("/super-admin/jobs?tab=activity")}
      />

      <div className="flex items-center gap-2 px-1">
        <Button variant="ghost" size="sm" className="text-xs h-7 font-semibold" onClick={handleCopyId}>
          <CopyIcon className="size-3.5 mr-1.5" />
          Copy Job ID
        </Button>
        {job.relatedResourceId && (
          <Button variant="ghost" size="sm" asChild className="text-xs h-7 font-semibold">
            <Link href={resolveRelatedHref(job)}>
              <LinkIcon className="size-3.5 mr-1.5" />
              Related Resource
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-white border border-slate-200/90 rounded-sm p-0.5">
          <TabsTrigger value="overview" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="attempts" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">
            Attempts & Errors
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">
            Workflow & Dependencies
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="technical" className="text-xs h-7 rounded-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold">
            Technical Context
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2 mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Job Information</h3>
              <div className="space-y-2">
                {[
                  { label: "Job ID", value: job.id, mono: true },
                  { label: "Type", value: job.type },
                  { label: "Name", value: job.name || job.type },
                  { label: "Queue", value: job.queue, mono: true },
                  { label: "Priority", value: priorityMeta.label, tone: priorityMeta.tone },
                  { label: "Company", value: job.company?.name ?? "System" },
                  { label: "Client", value: job.client?.name ?? "—" },
                  { label: "Related Resource", value: job.relatedResourceName ?? job.relatedResourceId ?? "—" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                    {"tone" in item && item.tone ? (
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold", STATE_TONE_MAP[item.tone])}>{item.value}</span>
                    ) : (
                      <span className={cn("text-xs text-slate-900 font-medium", item.mono && "font-mono")}>{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Execution Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">State</p>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold mt-1", STATE_TONE_MAP[stateMeta.tone])}>
                    {stateMeta.label}
                  </span>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Attempts</p>
                  <p className="text-sm font-extrabold tabular-nums text-slate-900 mt-1">{job.attempts} / {job.maxAttempts}</p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Duration</p>
                  <p className="text-sm font-extrabold tabular-nums text-slate-900 mt-1">
                    {job.durationMs != null ? formatDuration(job.durationMs) : "—"}
                  </p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Retry Eligibility</p>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold mt-1", STATE_TONE_MAP[eligibilityMeta.tone])}>
                    {eligibilityMeta.label}
                  </span>
                </div>
              </div>
              {job.errorMessage && (
                <div className="mt-3 rounded-sm border border-red-200 bg-red-50/50 p-3">
                  <p className="text-xs font-bold text-red-800 mb-1">Last Error</p>
                  <p className="text-xs text-red-700 font-mono break-all">{job.errorMessage}</p>
                </div>
              )}
              {failureMeta && (
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-500 mb-1">Failure Classification</p>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold", STATE_TONE_MAP[failureMeta.tone])}>
                    {failureMeta.label}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{failureMeta.description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Retry Eligibility Assessment</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Eligibility</p>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold mt-1", STATE_TONE_MAP[eligibilityMeta.tone])}>
                  {eligibilityMeta.label}
                </span>
              </div>
              <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Attempts Remaining</p>
                <p className="text-sm font-extrabold tabular-nums text-slate-900 mt-1">
                  {Math.max(0, job.maxAttempts - job.attempts)}
                </p>
              </div>
              <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Environment</p>
                <span className="px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 font-semibold text-xs mt-1 inline-flex">{MOCK_ENVIRONMENT}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{eligibilityMeta.description}</p>
          </div>
        </TabsContent>

        <TabsContent value="attempts" className="space-y-2 mt-2">
          <JobAttemptsTable
            attempts={attempts}
            onOpenAttempt={setSelectedAttempt}
          />
          {selectedAttempt && (
            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Attempt #{selectedAttempt.attemptNumber} Detail
                </h3>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedAttempt(null)}>
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Worker</p>
                  <p className="text-xs font-mono font-medium text-slate-900 mt-0.5">{selectedAttempt.workerId ?? "—"}</p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Result</p>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold mt-1", ATTEMPT_RESULT_TONE[selectedAttempt.result])}>
                    {selectedAttempt.result}
                  </span>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Duration</p>
                  <p className="text-xs font-medium text-slate-900 mt-0.5 tabular-nums">
                    {selectedAttempt.durationMs != null ? formatDuration(selectedAttempt.durationMs) : "—"}
                  </p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Classification</p>
                  {selectedAttempt.failureClassification ? (
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold mt-1", STATE_TONE_MAP[FAILURE_CLASSIFICATION_META[selectedAttempt.failureClassification]?.tone ?? "neutral"])}>
                      {FAILURE_CLASSIFICATION_META[selectedAttempt.failureClassification]?.label}
                    </span>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">—</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Started At</p>
                  <p className="text-xs font-medium text-slate-900 mt-0.5">{formatDateTime(selectedAttempt.startedAt)}</p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed At</p>
                  <p className="text-xs font-medium text-slate-900 mt-0.5">{selectedAttempt.completedAt ? formatDateTime(selectedAttempt.completedAt) : "—"}</p>
                </div>
              </div>
              {selectedAttempt.errorMessage && (
                <div className="rounded-sm border border-red-200 bg-red-50/50 p-3">
                  <p className="text-xs font-bold text-red-800 mb-1">Error Message</p>
                  <p className="text-xs text-red-700 font-mono break-all">{selectedAttempt.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-2 mt-2">
          {workflowData ? (
            <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Workflow</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Workflow Name</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{workflowData.name}</p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold mt-1",
                    workflowData.currentStatus === "succeeded" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    workflowData.currentStatus === "failed" ? "bg-red-50 text-red-700 border border-red-200" :
                    "bg-blue-50 text-blue-700 border border-blue-200"
                  )}>
                    {workflowData.currentStatus}
                  </span>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion Policy</p>
                  <p className="text-xs font-medium text-slate-900 mt-0.5">{workflowData.completionPolicy}</p>
                </div>
                <div className="rounded-sm border border-slate-200/90 p-3 bg-slate-50/50">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Related Resource</p>
                  <p className="text-xs font-medium text-slate-900 mt-0.5">{workflowData.relatedResourceName}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Workflow Jobs</p>
                <div className="flex flex-wrap gap-1">
                  {workflowData.jobIds.map((jid) => (
                    <span
                      key={jid}
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-sm border text-xs font-mono font-medium",
                        jid === job.id ? "border-blue-300 text-blue-700 bg-blue-50" : "border-slate-200 text-slate-600 bg-slate-50"
                      )}
                    >
                      {jid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-sm border border-slate-200/90 bg-white p-8 shadow-2xs text-center">
              <p className="text-xs text-slate-500">No workflow associated with this job.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-2 mt-2">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Job Timeline</h3>
            <div className="relative">
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-4">
                {timelineEvents.map((event, i) => {
                  const Icon = event.icon;
                  return (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className={cn(
                        "relative z-10 size-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white",
                        event.tone === "success" && "bg-emerald-100 text-emerald-600",
                        event.tone === "warning" && "bg-amber-100 text-amber-600",
                        event.tone === "danger" && "bg-red-100 text-red-600",
                        event.tone === "info" && "bg-blue-100 text-blue-600",
                      )}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="pt-1">
                        <p className="text-xs font-bold text-slate-900">{event.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(event.time)}</p>
                        <p className="text-xs text-slate-400">{formatRelativeTime(event.time)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="technical" className="space-y-2 mt-2">
          <div className="rounded-sm border border-slate-200/90 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Technical Context</h3>
            <p className="text-xs text-slate-500 mb-3">Sanitized technical details. Sensitive data (tokens, secrets) excluded.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {[
                { label: "Job ID", value: job.id, mono: true },
                { label: "Queue", value: job.queue, mono: true },
                { label: "Job Type", value: job.type },
                { label: "Environment", value: MOCK_ENVIRONMENT },
                { label: "Correlation ID", value: job.correlationId ?? "—", mono: true },
                { label: "Idempotency Key", value: job.idempotencyKey ?? "—", mono: true },
                { label: "Priority", value: job.priority },
                { label: "Lifecycle State", value: job.lifecycleState },
                { label: "Retry Eligibility", value: job.retryEligibility },
                { label: "Attempts", value: `${job.attempts} / ${job.maxAttempts}` },
                { label: "Workflow ID", value: job.workflowId ?? "—", mono: true },
                { label: "Related Resource", value: job.relatedResourceId ?? "—" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                  <span className={cn("text-xs text-slate-900 font-medium truncate max-w-[200px]", item.mono && "font-mono")}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <RetryReviewDrawer
        job={retryTarget}
        isOpen={retryDrawerOpen}
        onClose={() => { setRetryDrawerOpen(false); setRetryTarget(null); }}
        onRequestRetry={handleSubmitRetry}
        onCancel={handleCancel}
      />
    </div>
  );
}

function resolveRelatedHref(job: JobRecord) {
  if (job.relatedResourceType?.includes("integration")) return "/super-admin/integrations";
  if (job.relatedResourceType?.includes("api")) return "/super-admin/api-monitoring";
  if (job.relatedResourceType?.includes("webhook")) return "/super-admin/webhooks";
  if (job.company?.id) return `/super-admin/companies/${job.company.id}`;
  return "/super-admin/jobs?tab=activity";
}
