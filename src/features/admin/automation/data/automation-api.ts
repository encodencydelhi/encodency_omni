import { apiClient } from "@/lib/api/client";
import { companyScopeHeaders } from "@/lib/api/company-scope";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import type { AutomationSettingsState } from "./settings-types";
import type { NodeTestResult, RunTrace, SimulationResult, WorkflowInsights } from "./trace-types";
import type {
  AutomationAnalytics,
  AutomationApproval,
  AutomationConsoleLog,
  AutomationHealthMetrics,
  AutomationRun,
  AutomationRunStatus,
  AutomationTemplate,
  AutomationWorkflow,
  AutomationWorkflowStatus,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `clientId` scopes a request to one Client. `null` means "all clients" (read-only
 * aggregate): no x-client-id header is sent and the backend returns company-wide data.
 */
export type ClientScope = string | null;

function headers(clientId: ClientScope): Record<string, string> {
  return companyScopeHeaders(getStoredCompanyId(), clientId && UUID_PATTERN.test(clientId) ? { "x-client-id": clientId } : {});
}

function req<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, clientId: ClientScope, body?: unknown, query?: Record<string, string>) {
  return apiClient.request<T>({ method, path, headers: headers(clientId), body, query });
}

export interface WorkflowInput {
  name: string;
  status: AutomationWorkflowStatus;
  trigger: { type?: string; label?: string };
  nodes: AutomationWorkflow["nodes"];
  edges: AutomationWorkflow["edges"];
  channels: string[];
  ownerId?: string;
  templateId?: string;
  expectedVersion?: number;
  executionMode?: "legacy" | "graph-v1";
}

export interface WorkflowVersion {
  id: string;
  version: number;
  state: "DRAFT" | "PUBLISHED" | string;
  name: string;
  definition: { trigger?: AutomationWorkflow["trigger"]; nodes?: AutomationWorkflow["nodes"]; edges?: AutomationWorkflow["edges"]; channels?: string[] };
  createdAt: string;
  publishedAt?: string | null;
  sourceVersion?: number | null;
}

export interface DefinitionSelector {
  /** Unsaved editor state. It is evaluated in memory only and never stored. */
  definition?: { executionMode?: string; nodes: unknown[]; edges: unknown[] };
  version?: number;
  versionTag?: "draft" | "published";
}
export interface SimulateInput extends DefinitionSelector {
  payload?: Record<string, unknown>;
  record?: Record<string, unknown>;
  approvalOutcomes?: Record<string, "approved" | "rejected" | "expired">;
  childOutcomes?: Record<string, "success" | "failure">;
  mockResponses?: Record<string, { success: boolean; errorCode?: string }>;
}
export interface TestNodeInput extends DefinitionSelector {
  nodeId?: string;
  node?: Record<string, unknown>;
  sample?: Record<string, unknown>;
  record?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
}

export interface RunFilters {
  workflowId?: string;
  days?: number;
  status?: AutomationRunStatus;
  limit?: number;
  correlationId?: string;
}

export interface RunNowInput {
  payload?: Record<string, unknown>;
  recordKind?: "lead" | "contact";
  recordId?: string;
  eventType?: string;
  test?: boolean;
}

export interface AutomationWebsiteResources {
  websites: Array<{ id: string; name: string; url: string }>;
  owner: { available: boolean; count: number; maskedEmail: string | null };
}

export interface CompanySmtpSettings {
  configured: boolean; enabled: boolean; host: string; port: number; secure: boolean; usernameConfigured: boolean;
  credentialHint: string | null; fromEmail: string; fromName: string; fallbackPolicy: "DENY" | "ALLOW_PLATFORM";
  verifiedAt: string | null; lastVerificationAt: string | null; lastVerificationOk: boolean | null; revision: number;
}

function query(values: Record<string, string | number | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
}

export const automationApi = {
  /* Workflows */
  listWorkflows: (clientId: ClientScope, days = 30) => req<AutomationWorkflow[]>("GET", "/automation/workflows", clientId, undefined, query({ days })),
  getWorkflow: (clientId: string, id: string) => req<AutomationWorkflow>("GET", `/automation/workflows/${encodeURIComponent(id)}`, clientId),
  createWorkflow: (clientId: string, input: WorkflowInput) => req<AutomationWorkflow>("POST", "/automation/workflows", clientId, input),
  updateWorkflow: (clientId: string, id: string, input: WorkflowInput) => req<AutomationWorkflow>("PATCH", `/automation/workflows/${encodeURIComponent(id)}`, clientId, input),
  publishWorkflow: (clientId: string, id: string, expectedVersion: number) => req<AutomationWorkflow>("POST", `/automation/workflows/${encodeURIComponent(id)}/publish`, clientId, { expectedVersion }),
  workflowVersions: (clientId: string, id: string) => req<WorkflowVersion[]>("GET", `/automation/workflows/${encodeURIComponent(id)}/versions`, clientId),
  rollbackWorkflow: (clientId: string, id: string, version: number, expectedVersion: number, publish = true) => req<AutomationWorkflow>("POST", `/automation/workflows/${encodeURIComponent(id)}/rollback`, clientId, { version, expectedVersion, publish }),
  setWorkflowStatus: (clientId: string, id: string, status: AutomationWorkflowStatus) => req<AutomationWorkflow>("PATCH", `/automation/workflows/${encodeURIComponent(id)}/status`, clientId, { status }),
  duplicateWorkflow: (clientId: string, id: string) => req<AutomationWorkflow>("POST", `/automation/workflows/${encodeURIComponent(id)}/duplicate`, clientId),
  deleteWorkflow: (clientId: string, id: string) => req<void>("DELETE", `/automation/workflows/${encodeURIComponent(id)}`, clientId),
  runWorkflow: (clientId: string, id: string, input: RunNowInput) => req<AutomationRun>("POST", `/automation/workflows/${encodeURIComponent(id)}/run`, clientId, input),
  websiteResources: (clientId: string) => req<AutomationWebsiteResources>("GET", "/automation/resources/websites", clientId),

  /* Runs */
  listRuns: (clientId: ClientScope, filters: RunFilters = {}) => req<AutomationRun[]>("GET", "/automation/runs", clientId, undefined, query({ ...filters })),
  getRun: (clientId: string, id: string) => req<AutomationRun>("GET", `/automation/runs/${encodeURIComponent(id)}`, clientId),
  /** `acknowledgeDuplicateRisk` is required to retry a run whose outcome was unknown (it may already have been delivered). */
  retryRun: (clientId: string, id: string, options: { acknowledgeDuplicateRisk?: boolean } = {}) => req<AutomationRun>("POST", `/automation/runs/${encodeURIComponent(id)}/retry`, clientId, options),
  /** Issues a new webhook token. The plaintext is returned only here; read endpoints never include it. */
  rotateWebhook: (clientId: string, id: string) => req<{ token: string; workflowId: string }>("POST", `/automation/workflows/${encodeURIComponent(id)}/webhook/rotate`, clientId),
  bulkRetry: (clientId: string, runIds: string[], options: { acknowledgeDuplicateRisk?: boolean } = {}) => req<Array<{ runId: string; ok: boolean; error?: string }>>("POST", "/automation/runs/retry", clientId, { runIds, ...options }),
  cancelRun: (clientId: string, id: string) => req<AutomationRun>("POST", `/automation/runs/${encodeURIComponent(id)}/cancel`, clientId),
  testWebhook: (clientId: string, input: { workflowId: string; eventType: string; payload: Record<string, unknown> }) => req<AutomationRun>("POST", "/automation/test-webhook", clientId, input),
  approvals: (clientId: string) => req<AutomationApproval[]>("GET", "/automation/approvals", clientId),
  decideApproval: (clientId: string, id: string, decision: "APPROVED" | "REJECTED", note?: string) => req<{ id: string; runId: string; status: string }>("POST", `/automation/approvals/${encodeURIComponent(id)}/decision`, clientId, { decision, note }),

  /* Diagnostics (Milestone 3F) — read-only; simulation and node tests never execute anything */
  runTrace: (clientId: string, id: string) => req<RunTrace>("GET", `/automation/runs/${encodeURIComponent(id)}/trace`, clientId),
  simulate: (clientId: string, workflowId: string, input: SimulateInput) => req<SimulationResult>("POST", `/automation/workflows/${encodeURIComponent(workflowId)}/simulate`, clientId, input),
  testNode: (clientId: string, workflowId: string, input: TestNodeInput) => req<NodeTestResult>("POST", `/automation/workflows/${encodeURIComponent(workflowId)}/node-test`, clientId, input),
  workflowInsights: (clientId: string, workflowId: string, days = 30) => req<WorkflowInsights>("GET", `/automation/workflows/${encodeURIComponent(workflowId)}/insights`, clientId, undefined, query({ days })),

  /* Insights */
  analytics: (clientId: ClientScope, days = 30) => req<AutomationAnalytics>("GET", "/automation/analytics", clientId, undefined, query({ days })),
  health: (clientId: ClientScope) => req<AutomationHealthMetrics>("GET", "/automation/health", clientId),
  logs: (clientId: ClientScope) => req<AutomationConsoleLog[]>("GET", "/automation/logs", clientId),

  /* Templates */
  templates: (clientId: ClientScope) => req<AutomationTemplate[]>("GET", "/automation/templates", clientId),
  useTemplate: (clientId: string, templateId: string) => req<AutomationWorkflow>("POST", `/automation/templates/${encodeURIComponent(templateId)}/use`, clientId),

  /* Settings (company-wide) */
  getSettings: () => req<AutomationSettingsState>("GET", "/automation/settings", null),
  updateSettings: (settings: Partial<AutomationSettingsState>) => req<AutomationSettingsState>("PUT", "/automation/settings", null, { settings }),
  resetSettings: () => req<AutomationSettingsState>("POST", "/automation/settings/reset", null),
  testAlert: () => req<Array<{ channel: string; ok: boolean; detail: string }>>("POST", "/automation/settings/test-alert", null),
  smtpSettings: () => req<CompanySmtpSettings>("GET", "/automation/settings/smtp", null),
  saveSmtpSettings: (input: { enabled: boolean; host: string; port: number; secure: boolean; username?: string; password?: string; fromEmail: string; fromName?: string; fallbackPolicy: "DENY" | "ALLOW_PLATFORM"; expectedRevision: number }) => req<CompanySmtpSettings>("PUT", "/automation/settings/smtp", null, input),
  verifySmtpSettings: () => req<CompanySmtpSettings>("POST", "/automation/settings/smtp/verify", null),
  purgeRuns: (olderThanDays: number) => req<{ deleted: number }>("POST", "/automation/runs/purge", null, { olderThanDays }),
};

/** Endpoint without the secret token (the token goes in the `x-automation-token` header). */
export function webhookEndpoint(workflowId: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(/\/$/, "");
  const prefix = /^https?:/i.test(base) ? base : `${origin}${base}`;
  return `${prefix}/automation/hooks/${encodeURIComponent(workflowId)}`;
}

/** Public URL an external system posts to for a webhook-triggered workflow (token in the query string). */
export function webhookUrl(workflowId: string, token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(/\/$/, "");
  const prefix = /^https?:/i.test(base) ? base : `${origin}${base}`;
  return `${prefix}/automation/hooks/${encodeURIComponent(workflowId)}?token=${encodeURIComponent(token)}`;
}
