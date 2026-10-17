/* eslint-disable @typescript-eslint/no-explicit-any -- repository preserves versioned workflow JSON compatibility */
import { 
  AutomationWorkflow, 
  AutomationRun, 
  AutomationTemplate, 
  AutomationAnalytics,
  AutomationConsoleLog,
  AutomationHealthMetrics
} from "./types";
import { AutomationSettingsState } from "./settings-types";

export interface AutomationRepository {
  // Workflows
  getWorkflows(clientId?: string): Promise<AutomationWorkflow[]>;
  getWorkflow(workflowId: string): Promise<AutomationWorkflow | null>;
  createWorkflow(clientId: string, workflow: Partial<AutomationWorkflow>): Promise<AutomationWorkflow>;
  updateWorkflow(workflowId: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow>;
  deleteWorkflow(workflowId: string): Promise<void>;

  // Runs
  getRuns(clientId?: string, workflowId?: string): Promise<AutomationRun[]>;
  getRun(runId: string): Promise<AutomationRun | null>;
  retryRun(runId: string, options?: { acknowledgeDuplicateRisk?: boolean }): Promise<AutomationRun>;
  bulkRetryRuns(runIds: string[], options?: { acknowledgeDuplicateRisk?: boolean }): Promise<AutomationRun[]>;
  /** Administrator attestation for a send whose outcome was unknown. Sends nothing; a later retry no longer needs the duplicate-risk prompt. */
  reconcileRun(runId: string, resolution: "DELIVERED" | "NOT_DELIVERED", note: string): Promise<AutomationRun>;
  cancelRun(runId: string): Promise<AutomationRun>;
  createTestWebhookRun(payload: { workflowId: string; eventType: string; payload: Record<string, any> }): Promise<AutomationRun>;

  // Console Logs
  getConsoleLogs(): Promise<AutomationConsoleLog[]>;

  // Templates
  getTemplates(): Promise<AutomationTemplate[]>;

  // Analytics & Diagnostics
  getAnalytics(clientId?: string): Promise<AutomationAnalytics>;
  getHealthMetrics(): Promise<AutomationHealthMetrics>;

  // Settings
  getSettings(): Promise<AutomationSettingsState>;
  updateSettings(settings: Partial<AutomationSettingsState>): Promise<AutomationSettingsState>;
  resetSettings(): Promise<AutomationSettingsState>;
}

