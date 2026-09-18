export type AutomationWorkflowStatus = "Active" | "Draft" | "Paused" | "Error" | "Archived";
export type AutomationRunStatus = "Running" | "Successful" | "Failed" | "Partial Failure" | "Cancelled";
export type IntegrationCapability = "meta" | "aisensy" | "google-business" | "ga4" | "search-console" | "omni-tracking";

export interface AutomationWorkflow {
  id: string;
  clientId: string;
  name: string;
  status: AutomationWorkflowStatus;
  version: number;
  trigger: {
    type: string;
    label: string;
  };
  channels: string[];
  ownerId?: string;
  runs: number;
  successRate: number;
  failures: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
}

export type AutomationNodeType = "trigger" | "action" | "condition" | "delay" | "branch";

export interface AutomationNode {
  id: string;
  type: AutomationNodeType;
  actionId?: string;
  label: string;
  description?: string;
  status: "idle" | "error" | "configured" | "missing-dependency";
  config: Record<string, any>;
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
  label?: string; // e.g. "Yes", "No"
}

export interface AutomationRun {
  id: string;
  workflowId: string;
  workflowName?: string;
  channel?: IntegrationCapability | "whatsapp" | "email" | "system";
  triggerSource?: string;
  status: AutomationRunStatus;
  startedAt: string;
  durationMs: number;
  triggerEntity: {
    type: string;
    id: string;
    label: string;
    subLabel?: string;
  };
  steps: AutomationRunStep[];
  rawWebhookPayload?: Record<string, any>;
  httpDumps?: Array<{
    id: string;
    service: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    endpoint: string;
    statusCode: number;
    durationMs: number;
    requestHeaders?: Record<string, string>;
    requestBody?: Record<string, any>;
    responseBody?: Record<string, any>;
  }>;
  errorSummary?: {
    code: string;
    message: string;
    stack?: string;
    recommendation: string;
  };
  owner?: string;
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
  successRate: { value: number; trend: number };
  failedRuns: { value: number; trend: number };
  activeQueue: { count: number; avgWaitTime: string; processingRate: number };
  rateLimits: {
    meta: { remaining: number; total: number; percentage: number; status: "Healthy" | "Warning" | "Critical" };
    whatsapp: { remaining: number; total: number; percentage: number; status: "Healthy" | "Warning" | "Critical" };
    google: { remaining: number; total: number; percentage: number; status: "Healthy" | "Warning" | "Critical" };
  };
  webhookIngestion: { eventsPerMin: number; uptime: number };
}

export interface AutomationRunStep {
  id: string;
  nodeId: string;
  status: AutomationRunStatus;
  startedAt: string;
  durationMs: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
}

export interface AutomationAnalytics {
  activeWorkflows: { value: number; trend: number };
  totalRuns: { value: number; trend: number };
  successRate: { value: number; trend: number };
  failedRuns: { value: number; trend: number };
  timeSavedHours: { value: number; trend: number };
  actionsExecuted: { value: number; trend: number };
  activity: { date: string; successfulRuns: number; failedRuns: number; successRate: number }[];
  health: { status: "Healthy" | "Needs Attention" | "Paused" | "Error"; count: number; color: string }[];
  triggerSources: { source: string; percentage: number; color: string }[];
  alerts: AutomationAlert[];
}

export interface AutomationAlert {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: "error" | "warning";
  actionLabel: string;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "Lead Management" | "Google Business" | "Website" | "SEO" | "WhatsApp" | "Tasks" | "Notifications";
  trigger: string;
  stepCount: number;
  requiredIntegrations: IntegrationCapability[];
  useCount: number;
  complexity: "Basic" | "Intermediate" | "Advanced";
}
