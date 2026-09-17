import { AutomationWorkflow, AutomationRun, AutomationTemplate, AutomationAnalytics } from "./types";

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

  // Templates
  getTemplates(): Promise<AutomationTemplate[]>;

  // Analytics
  getAnalytics(clientId: string): Promise<AutomationAnalytics>;
}
