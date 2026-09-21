import type { JobRecord, JobLifecycleState, JobAttempt } from "./types";

export interface JobFilters {
  query: string;
  lifecycleState: string;
  queue: string;
  company: string;
  priority: string;
  sortBy: "newest" | "oldest_waiting" | "recently_failed" | "recently_completed" | "priority" | "next_retry";
}

export const DEFAULT_JOB_FILTERS: JobFilters = {
  query: "",
  lifecycleState: "all",
  queue: "all",
  company: "all",
  priority: "all",
  sortBy: "newest",
};

export function filterJobs(jobs: JobRecord[], filters: JobFilters): JobRecord[] {
  let result = [...jobs];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (j) =>
        j.id.toLowerCase().includes(q) ||
        j.type.toLowerCase().includes(q) ||
        j.queue.toLowerCase().includes(q) ||
        (j.company?.name?.toLowerCase().includes(q) ?? false) ||
        (j.client?.name?.toLowerCase().includes(q) ?? false) ||
        (j.correlationId?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters.lifecycleState !== "all") {
    result = result.filter((j) => j.lifecycleState === filters.lifecycleState);
  }
  if (filters.queue !== "all") {
    result = result.filter((j) => j.queue === filters.queue);
  }
  if (filters.company !== "all") {
    result = result.filter((j) => j.company?.id === filters.company);
  }
  if (filters.priority !== "all") {
    result = result.filter((j) => j.priority === filters.priority);
  }

  switch (filters.sortBy) {
    case "newest":
      result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      break;
    case "oldest_waiting":
      result.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      break;
    case "recently_failed":
      result = result.filter((j) => j.lifecycleState === "failed" || j.lifecycleState === "dead_lettered" || j.lifecycleState === "retry_waiting");
      result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      break;
    case "recently_completed":
      result = result.filter((j) => j.lifecycleState === "succeeded");
      result.sort((a, b) => Date.parse(b.completedAt ?? "0") - Date.parse(a.completedAt ?? "0"));
      break;
    case "priority": {
      const order = { high: 0, normal: 1, low: 2 };
      result.sort((a, b) => order[a.priority] - order[b.priority] || Date.parse(b.createdAt) - Date.parse(a.createdAt));
      break;
    }
    case "next_retry":
      result = result.filter((j) => j.nextRetryAt);
      result.sort((a, b) => Date.parse(a.nextRetryAt ?? "") - Date.parse(b.nextRetryAt ?? ""));
      break;
  }

  return result;
}

export function getDistinctQueues(jobs: JobRecord[]): string[] {
  return Array.from(new Set(jobs.map((j) => j.queue))).sort();
}

export function getDistinctCompanies(jobs: JobRecord[]): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const j of jobs) {
    if (j.company) map.set(j.company.id, j.company.name);
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function getDistinctJobTypes(jobs: JobRecord[]): string[] {
  return Array.from(new Set(jobs.map((j) => j.type))).sort();
}

export function countByState(jobs: JobRecord[]): Record<JobLifecycleState, number> {
  const counts: Record<JobLifecycleState, number> = {
    scheduled: 0, waiting: 0, ready: 0, running: 0,
    retry_waiting: 0, succeeded: 0, failed: 0, cancelled: 0, dead_lettered: 0,
  };
  for (const j of jobs) counts[j.lifecycleState]++;
  return counts;
}

export function attemptsByJob(attempts: JobAttempt[]): Map<string, JobAttempt[]> {
  const map = new Map<string, JobAttempt[]>();
  for (const a of attempts) {
    if (!map.has(a.jobId)) map.set(a.jobId, []);
    map.get(a.jobId)!.push(a);
  }
  return map;
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    totalPages,
    hasNext: p < totalPages,
    hasPrev: p > 1,
  };
}
