export type AutomationWorkflowStatus = "Active" | "Draft" | "Paused" | "Error" | "Archived";
export type AutomationRunStatus = "Running" | "Waiting" | "Successful" | "Failed" | "Cancelled" | "Partial Failure";
export type AutomationStepStatus = "Successful" | "Failed" | "Skipped" | "Waiting" | "Running" | "Cancelled" | "Partial Failure";
export type IntegrationCapability = "meta" | "aisensy" | "google-business" | "ga4" | "search-console" | "omni-tracking";

export interface AutomationWorkflow {
  id: string;
  clientId: string;
  name: string;
  status: AutomationWorkflowStatus;
  version: number;
  draftVersion?: number;
  publishedVersion?: number | null;
  trigger: {
    type: string;
    label: string;
  };
  channels: string[];
  ownerId?: string;
  ownerName?: string;
  /** Runs in the selected period. */
  runs: number;
  totalRuns?: number;
  /** Null when the workflow has no finished runs in the period. */
  successRate: number | null;
  failures: number;
  lastRunAt?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
}

export type AutomationNodeType = "trigger" | "action" | "condition" | "delay" | "branch" | "parallel" | "merge" | "loop" | "approval" | "sub_workflow";

export interface AutomationNode {
  id: string;
  type: AutomationNodeType;
  actionId?: string;
  label: string;
  description?: string;
  status: "idle" | "error" | "configured" | "missing-dependency";
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface AutomationRunStep {
  id: string;
  nodeId: string;
  label?: string;
  actionId?: string;
  status: AutomationStepStatus;
  startedAt: string;
  durationMs: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
}

export interface AutomationRun {
  id: string;
  clientId: string;
  workflowId: string;
  workflowName?: string;
  channel?: string;
  triggerSource?: string;
  test?: boolean;
  status: AutomationRunStatus;
  startedAt: string;
  completedAt?: string | null;
  resumeAt?: string | null;
  durationMs: number;
  owner?: string;
  httpDumps?: any[];
  triggerEntity: {
    type: string;
    id: string;
    label: string;
    subLabel?: string;
  };
  steps: AutomationRunStep[];
  stepsTotal?: number;
  stepsSucceeded?: number;
  branches?: Array<{ id: string; branchKey: string; splitNodeId: string; joinNodeId?: string | null; currentNodeId?: string | null; status: string; startedAt?: string | null; completedAt?: string | null; durationMs?: number | null; output?: Record<string, any>; error?: Record<string, any> }>;
  iterations?: Array<{ id: string; nodeId: string; iterationIndex: number; itemKey: string; currentNodeId?: string | null; status: string; startedAt?: string | null; completedAt?: string | null; durationMs?: number | null; item?: unknown; output?: Record<string, any>; error?: Record<string, any> }>;
  joins?: Array<{ splitNodeId: string; joinNodeId: string; mode: "all" | "any"; failurePolicy: string; status: string; expectedCount: number; completedCount: number; succeededCount: number; failedCount: number; timeoutAt?: string | null }>;
  approvals?: Array<{ id: string; nodeId: string; status: string; expiresAt: string; reminderAt?: string | null; remindedAt?: string | null; decidedAt?: string | null; decidedById?: string | null; decisionNote?: string | null }>;
  childRuns?: Array<{ id: string; workflowId: string; workflowName?: string; parentNodeId?: string | null; workflowVersion: number; status: string; startedAt: string; completedAt?: string | null; error?: Record<string, any> }>;
  parentRunId?: string | null;
  parentNodeId?: string | null;
  nestingDepth?: number;
  /** Ties a run to the event / request that started it; used to find related runs. */
  correlationId?: string | null;
  rawWebhookPayload?: Record<string, any>;
  retryOfId?: string | null;
  dlqStatus?: "OPEN" | "REPLAYED" | "DISMISSED" | null;
  failureClass?: "retries_exhausted" | "permanent" | "unknown_outcome" | "quota" | "runtime" | "stalled" | null;
  errorSummary?: {
    code: string;
    message: string;
    stack?: string;
    recommendation: string;
  };
}

export interface AutomationApproval {
  id: string;
  runId: string;
  workflowId: string;
  workflowName: string;
  nodeId: string;
  status: string;
  expiresAt: string;
  reminderAt?: string | null;
  decidedAt?: string | null;
  decidedById?: string | null;
  decisionNote?: string | null;
}

export type AutomationLogLevel = "info" | "warn" | "error" | "debug";

export interface AutomationConsoleLog {
  id: string;
  runId?: string;
  workflowName?: string;
  timestamp: string;
  level: AutomationLogLevel;
  source: string;
  message: string;
  details?: Record<string, any>;
}

export interface AutomationHealthMetrics {
  totalExecutions: { value: number; trend: number };
  successRate: { value: number | null; trend: number };
  failedRuns: { value: number; trend: number };
  activeQueue: { count: number; waiting?: number; running?: number; avgWaitTime: string; processingRate: number };
  /** Provider rate limits are not reported by the integrations yet, or provided by mock/provider metrics. */
  rateLimits: null | {
    meta?: { remaining?: number; total?: number; percentage: number; status?: string };
    whatsapp?: { remaining?: number; total?: number; percentage: number; status?: string };
    google?: { remaining?: number; total?: number; percentage: number; status?: string };
    [key: string]: any;
  };
  webhookIngestion: { eventsPerMin: number; eventsLastHour?: number; uptime: number | null };
}

export interface AutomationAnalytics {
  periodDays?: number;
  activeWorkflows: { value: number; trend: number };
  totalRuns: { value: number; trend: number };
  successRate: { value: number | null; trend: number };
  failedRuns: { value: number; trend: number };
  timeSavedHours: { value: number; trend: number; estimate?: string };
  actionsExecuted: { value: number; trend: number };
  activity: { date: string; successfulRuns: number; failedRuns: number; successRate: number | null }[];
  health: { status: string; count: number; color: string }[];
  triggerSources: { source: string; count?: number; percentage: number; color: string }[];
  alerts: AutomationAlert[];
}

export interface AutomationAlert {
  id: string;
  title: string;
  description: string;
  at?: string;
  timeAgo?: string;
  type: "error" | "warning";
  actionLabel: string;
  workflowId?: string;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "Lead Management" | "Website" | "WhatsApp" | "Tasks" | "Notifications" | "Google Business" | string;
  trigger: string;
  stepCount: number;
  requiredIntegrations: string[];
  channels?: string[];
  useCount: number;
  complexity: "Basic" | "Intermediate" | "Advanced";
  features?: string[];
  nodes?: Array<Pick<AutomationNode, "id" | "type" | "actionId" | "label" | "description" | "config">>;
}
