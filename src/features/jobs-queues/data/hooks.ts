import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsQueuesRepository } from "./repository";
import type { RetryRequestState } from "./types";

export const JOBS_QUERY_KEYS = {
  all: ["jobs-queues"] as const,
  jobs: () => [...JOBS_QUERY_KEYS.all, "jobs"] as const,
  job: (id: string) => [...JOBS_QUERY_KEYS.all, "job", id] as const,
  attempts: (jobId: string) => [...JOBS_QUERY_KEYS.all, "attempts", jobId] as const,
  allAttempts: () => [...JOBS_QUERY_KEYS.all, "all-attempts"] as const,
  schedules: () => [...JOBS_QUERY_KEYS.all, "schedules"] as const,
  schedule: (id: string) => [...JOBS_QUERY_KEYS.all, "schedule", id] as const,
  workflows: () => [...JOBS_QUERY_KEYS.all, "workflows"] as const,
  workflow: (id: string) => [...JOBS_QUERY_KEYS.all, "workflow", id] as const,
  queues: () => [...JOBS_QUERY_KEYS.all, "queues"] as const,
  queue: (id: string) => [...JOBS_QUERY_KEYS.all, "queue", id] as const,
  workers: () => [...JOBS_QUERY_KEYS.all, "workers"] as const,
  worker: (id: string) => [...JOBS_QUERY_KEYS.all, "worker", id] as const,
  recoveryRequests: () => [...JOBS_QUERY_KEYS.all, "recovery-requests"] as const,
  queueOperationalControls: () => [...JOBS_QUERY_KEYS.all, "queue-operational-controls"] as const,
  activity: () => [...JOBS_QUERY_KEYS.all, "activity"] as const,
  processingTrend: () => [...JOBS_QUERY_KEYS.all, "processing-trend"] as const,
  overview: () => [...JOBS_QUERY_KEYS.all, "overview"] as const,
};

export function useJobs() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.jobs(), queryFn: () => jobsQueuesRepository.getJobs() });
}

export function useJob(id: string) {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.job(id), queryFn: () => jobsQueuesRepository.getJobById(id), enabled: Boolean(id) });
}

export function useJobAttempts(jobId: string) {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.attempts(jobId), queryFn: () => jobsQueuesRepository.getAttempts(jobId), enabled: Boolean(jobId) });
}

export function useAllAttempts() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.allAttempts(), queryFn: () => jobsQueuesRepository.getAllAttempts() });
}

export function useSchedules() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.schedules(), queryFn: () => jobsQueuesRepository.getSchedules() });
}

export function useWorkflows() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.workflows(), queryFn: () => jobsQueuesRepository.getWorkflows() });
}

export function useWorkflow(id: string) {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.workflow(id), queryFn: () => jobsQueuesRepository.getWorkflowById(id), enabled: Boolean(id) });
}

export function useDependencies(jobId: string) {
  return useQuery({ queryKey: [...JOBS_QUERY_KEYS.all, "dependencies", jobId], queryFn: () => jobsQueuesRepository.getDependencies(jobId), enabled: Boolean(jobId) });
}

export function useSchedule(id: string) {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.schedule(id), queryFn: () => jobsQueuesRepository.getScheduleById(id), enabled: Boolean(id) });
}

export function useQueues() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.queues(), queryFn: () => jobsQueuesRepository.getQueues() });
}

export function useQueue(id: string) {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.queue(id), queryFn: () => jobsQueuesRepository.getQueueById(id), enabled: Boolean(id) });
}

export function useWorkers() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.workers(), queryFn: () => jobsQueuesRepository.getWorkers() });
}

export function useWorker(id: string) {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.worker(id), queryFn: () => jobsQueuesRepository.getWorkerById(id), enabled: Boolean(id) });
}

export function useRecoveryRequests() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.recoveryRequests(), queryFn: () => jobsQueuesRepository.getRecoveryRequests() });
}

export function useQueueOperationalControls() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.queueOperationalControls(), queryFn: () => jobsQueuesRepository.getQueueOperationalControls() });
}

export function useActivity() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.activity(), queryFn: () => jobsQueuesRepository.getActivity() });
}

export function useProcessingTrend() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.processingTrend(), queryFn: () => jobsQueuesRepository.getProcessingTrend() });
}

export function useJobsOverview() {
  return useQuery({ queryKey: JOBS_QUERY_KEYS.overview(), queryFn: () => jobsQueuesRepository.getOverview() });
}

export function useRequestJobRetry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => jobsQueuesRepository.requestJobRetry(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.recoveryRequests() });
    },
  });
}

export function useUpdateRecoveryRequestState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, state, notes }: { requestId: string; state: RetryRequestState; notes?: string }) =>
      jobsQueuesRepository.updateRecoveryRequestState(requestId, state, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.recoveryRequests() });
    },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => jobsQueuesRepository.cancelJob(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.jobs() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.overview() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.activity() });
    },
  });
}

export function usePauseQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueId: string) => jobsQueuesRepository.pauseQueue(queueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.queues() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.overview() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.queueOperationalControls() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.activity() });
    },
  });
}

export function useResumeQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queueId: string) => jobsQueuesRepository.resumeQueue(queueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.queues() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.overview() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.queueOperationalControls() });
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.activity() });
    },
  });
}

export function useResetJobsDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => jobsQueuesRepository.resetDemo(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: JOBS_QUERY_KEYS.all });
    },
  });
}
