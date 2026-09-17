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
  status: AutomationRunStatus;
  startedAt: string;
  durationMs: number;
  triggerEntity: {
    type: string;
    id: string;
    label: string;
  };
  steps: AutomationRunStep[];
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
