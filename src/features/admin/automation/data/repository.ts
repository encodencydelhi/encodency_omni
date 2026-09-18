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
  getWorkflows(clientId: string): Promise<AutomationWorkflow[]>;
  getWorkflow(workflowId: string): Promise<AutomationWorkflow | null>;
  createWorkflow(clientId: string, workflow: Partial<AutomationWorkflow>): Promise<AutomationWorkflow>;
  updateWorkflow(workflowId: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow>;
  deleteWorkflow(workflowId: string): Promise<void>;

  // Runs
  getRuns(clientId: string, workflowId?: string): Promise<AutomationRun[]>;
  getRun(runId: string): Promise<AutomationRun | null>;
  retryRun(runId: string): Promise<AutomationRun>;
  bulkRetryRuns(runIds: string[]): Promise<AutomationRun[]>;
  createTestWebhookRun(payload: { workflowId: string; eventType: string; payload: Record<string, any> }): Promise<AutomationRun>;

  // Console Logs
  getConsoleLogs(): Promise<AutomationConsoleLog[]>;

  // Templates
  getTemplates(): Promise<AutomationTemplate[]>;

  // Analytics & Diagnostics
  getAnalytics(clientId: string): Promise<AutomationAnalytics>;
  getHealthMetrics(): Promise<AutomationHealthMetrics>;

  // Settings
  getSettings(): Promise<AutomationSettingsState>;
  updateSettings(settings: Partial<AutomationSettingsState>): Promise<AutomationSettingsState>;
  resetSettings(): Promise<AutomationSettingsState>;
}

