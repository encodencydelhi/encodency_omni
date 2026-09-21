import type {
  JobRecord,
  JobAttempt,
  JobSchedule,
  JobWorkflow,
  JobDependency,
  QueueDefinition,
  WorkerRecord,
  RecoveryRequest,
  QueueOperationalControl,
  JobActivity,
  JobsOverviewData,
  ProcessingTrendPoint,
  RetryRequestState,
} from "./types";
import * as store from "./mock/store";

export interface JobsQueuesRepository {
  getJobs(): Promise<JobRecord[]>;
  getJobById(id: string): Promise<JobRecord | null>;
  getAttempts(jobId: string): Promise<JobAttempt[]>;
  getAllAttempts(): Promise<JobAttempt[]>;
  getSchedules(): Promise<JobSchedule[]>;
  getScheduleById(id: string): Promise<JobSchedule | null>;
  getWorkflows(): Promise<JobWorkflow[]>;
  getWorkflowById(id: string): Promise<JobWorkflow | null>;
  getDependencies(jobId: string): Promise<JobDependency[]>;
  getQueues(): Promise<QueueDefinition[]>;
  getQueueById(id: string): Promise<QueueDefinition | null>;
  getWorkers(): Promise<WorkerRecord[]>;
  getWorkerById(id: string): Promise<WorkerRecord | null>;
  getRecoveryRequests(): Promise<RecoveryRequest[]>;
  getQueueOperationalControls(): Promise<QueueOperationalControl[]>;
  getActivity(): Promise<JobActivity[]>;
  getProcessingTrend(): Promise<ProcessingTrendPoint[]>;
  getOverview(): Promise<JobsOverviewData>;
  requestJobRetry(jobId: string): Promise<RecoveryRequest | null>;
  updateRecoveryRequestState(requestId: string, state: RetryRequestState, notes?: string): Promise<RecoveryRequest | null>;
  cancelJob(jobId: string): Promise<JobRecord | null>;
  pauseQueue(queueId: string): Promise<QueueDefinition | null>;
  resumeQueue(queueId: string): Promise<QueueDefinition | null>;
  resetDemo(): Promise<void>;
}

export const jobsQueuesRepository: JobsQueuesRepository = {
  getJobs: () => store.getJobs(),
  getJobById: (id) => store.getJobById(id),
  getAttempts: (jobId) => store.getAttempts(jobId),
  getAllAttempts: () => store.getAllAttempts(),
  getSchedules: () => store.getSchedules(),
  getScheduleById: (id) => store.getScheduleById(id),
  getWorkflows: () => store.getWorkflows(),
  getWorkflowById: (id) => store.getWorkflowById(id),
  getDependencies: (jobId) => store.getDependencies(jobId),
  getQueues: () => store.getQueues(),
  getQueueById: (id) => store.getQueueById(id),
  getWorkers: () => store.getWorkers(),
  getWorkerById: (id) => store.getWorkerById(id),
  getRecoveryRequests: () => store.getRecoveryRequests(),
  getQueueOperationalControls: () => store.getQueueOperationalControls(),
  getActivity: () => store.getActivity(),
  getProcessingTrend: () => store.getProcessingTrend(),
  getOverview: () => store.getOverview(),
  requestJobRetry: (jobId) => store.requestJobRetry(jobId),
  updateRecoveryRequestState: (requestId, state, notes) => store.updateRecoveryRequestState(requestId, state, notes),
  cancelJob: (jobId) => store.cancelJob(jobId),
  pauseQueue: (queueId) => store.pauseQueue(queueId),
  resumeQueue: (queueId) => store.resumeQueue(queueId),
  resetDemo: () => store.resetDemo(),
};
