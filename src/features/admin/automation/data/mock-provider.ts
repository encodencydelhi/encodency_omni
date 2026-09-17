import { AutomationRepository } from "./repository";
import { AutomationRun, AutomationTemplate, AutomationWorkflow, AutomationAnalytics } from "./types";

export const AUTOMATION_MOCK_MODE = true;
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const MOCK_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: "wf_1",
    clientId: "client_1",
    name: "New Meta Lead Follow-up",
    status: "Active",
    version: 2,
    trigger: { type: "meta_lead", label: "New Meta Lead" },
    channels: ["meta", "whatsapp"],
    runs: 1248,
    successRate: 98.4,
    failures: 8,
    lastRunAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [
      { id: "node_1", type: "trigger", label: "New Meta Lead", status: "configured", config: { source: "Campaign A" } },
      { id: "node_2", type: "action", actionId: "send_whatsapp", label: "Send WhatsApp", status: "configured", config: { template: "welcome_message" } },
      { id: "node_3", type: "delay", label: "Wait 2 hours", status: "configured", config: { duration: 2, unit: "hours" } },
      { id: "node_4", type: "action", actionId: "assign_user", label: "Assign User", status: "configured", config: { assignee: "sales_team" } }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" },
      { id: "e2", source: "node_2", target: "node_3" },
      { id: "e3", source: "node_3", target: "node_4" },
    ]
  },
  {
    id: "wf_2",
    clientId: "client_1",
    name: "Google Review Alert",
    status: "Active",
    version: 1,
    trigger: { type: "google_review", label: "New Google review" },
    channels: ["google-business", "email"],
    runs: 428,
    successRate: 100,
    failures: 0,
    lastRunAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [
      { id: "node_1", type: "trigger", label: "New Google Review", status: "configured", config: { minRating: 1, maxRating: 3 } },
      { id: "node_2", type: "action", actionId: "send_email", label: "Send Alert Email", status: "configured", config: { to: "manager@company.com" } }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" }
    ]
  },
  {
    id: "wf_3",
    clientId: "client_1",
    name: "WhatsApp Re-engagement",
    status: "Paused",
    version: 4,
    trigger: { type: "whatsapp_no_reply", label: "No reply for 24 hours" },
    channels: ["whatsapp"],
    runs: 316,
    successRate: 91.8,
    failures: 14,
    lastRunAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [],
    edges: []
  },
  {
    id: "wf_4",
    clientId: "client_1",
    name: "Website Down Alert",
    status: "Error",
    version: 1,
    trigger: { type: "website_down", label: "Website Down" },
    channels: ["omni-tracking"],
    runs: 12,
    successRate: 85.0,
    failures: 2,
    lastRunAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    nodes: [
      { id: "node_1", type: "trigger", label: "Website Down", status: "configured", config: {} },
      { id: "node_2", type: "action", actionId: "send_whatsapp", label: "Send WhatsApp", status: "error", config: {} }
    ],
    edges: [
      { id: "e1", source: "node_1", target: "node_2" }
    ]
  }
];

const MOCK_RUNS: AutomationRun[] = [
  {
    id: "run_1",
    workflowId: "wf_1",
    status: "Successful",
    startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    durationMs: 450,
    triggerEntity: { type: "lead", id: "lead_123", label: "Rahul Sharma" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), durationMs: 50, input: {}, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Successful", startedAt: new Date(Date.now() - 11.9 * 60 * 1000).toISOString(), durationMs: 200, input: { phone: "+919876543210" }, retryCount: 0 },
    ]
  },
  {
    id: "run_2",
    workflowId: "wf_1",
    status: "Failed",
    startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    durationMs: 1200,
    triggerEntity: { type: "lead", id: "lead_124", label: "Priya Singh" },
    steps: [
      { id: "step_1", nodeId: "node_1", status: "Successful", startedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), durationMs: 40, input: {}, retryCount: 0 },
      { id: "step_2", nodeId: "node_2", status: "Failed", startedAt: new Date(Date.now() - 24.9 * 60 * 1000).toISOString(), durationMs: 1100, input: { phone: "invalid_number" }, error: "Invalid recipient phone number format.", retryCount: 1 },
    ]
  }
];

const MOCK_TEMPLATES: AutomationTemplate[] = [
  {
    id: "tpl_1",
    name: "New Meta Lead Follow-up",
    description: "Instantly welcome new leads from Facebook & Instagram with a personalized WhatsApp message, then assign them to sales.",
    category: "Lead Management",
    trigger: "New Meta Lead",
    stepCount: 4,
    requiredIntegrations: ["meta", "aisensy"],
    useCount: 1245,
    complexity: "Basic"
  },
  {
    id: "tpl_2",
    name: "Negative Review Escalation",
    description: "Detect 1-3 star reviews on Google Business and immediately alert the manager via email while sending a polite apology to the customer.",
    category: "Google Business",
    trigger: "New Google Review",
    stepCount: 5,
    requiredIntegrations: ["google-business"],
    useCount: 890,
    complexity: "Intermediate"
  },
  {
    id: "tpl_3",
    name: "Website Down Alert",
    description: "Monitor website uptime and instantly notify the IT team via WhatsApp if the site becomes unreachable.",
    category: "Website",
    trigger: "Website Down",
    stepCount: 2,
    requiredIntegrations: ["omni-tracking", "aisensy"],
    useCount: 340,
    complexity: "Basic"
  }
];

class MockAutomationRepository implements AutomationRepository {
  private workflows = [...MOCK_WORKFLOWS];
  private runs = [...MOCK_RUNS];

  async getWorkflows(clientId: string): Promise<AutomationWorkflow[]> {
    return this.workflows.filter(wf => wf.clientId === clientId);
  }

  async getWorkflow(workflowId: string): Promise<AutomationWorkflow | null> {
    return this.workflows.find(wf => wf.id === workflowId) || null;
  }

  async createWorkflow(clientId: string, workflow: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const newWf: AutomationWorkflow = {
      id: `wf_${Date.now()}`,
      clientId,
      name: workflow.name || "Untitled Workflow",
      status: "Draft",
      version: 1,
      trigger: workflow.trigger || { type: "manual", label: "Manual Trigger" },
      channels: workflow.channels || [],
      runs: 0,
      successRate: 0,
      failures: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    };
    this.workflows.push(newWf);
    return newWf;
  }

  async updateWorkflow(workflowId: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow> {
    const idx = this.workflows.findIndex(wf => wf.id === workflowId);
    if (idx === -1) throw new Error("Workflow not found");
    
    this.workflows[idx] = { 
      ...this.workflows[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    } as AutomationWorkflow;
    return this.workflows[idx];
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    this.workflows = this.workflows.filter(wf => wf.id !== workflowId);
  }

  async getRuns(clientId: string, workflowId?: string): Promise<AutomationRun[]> {
    let results = this.runs;
    if (workflowId) {
      results = results.filter(r => r.workflowId === workflowId);
    } else {
      // In a real app we would join runs with workflows to filter by clientId
      const clientWfIds = this.workflows.filter(wf => wf.clientId === clientId).map(wf => wf.id);
      results = results.filter(r => clientWfIds.includes(r.workflowId));
    }
    return results.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getRun(runId: string): Promise<AutomationRun | null> {
    return this.runs.find(r => r.id === runId) || null;
  }

  async getTemplates(): Promise<AutomationTemplate[]> {
    return MOCK_TEMPLATES;
  }

  async getAnalytics(_clientId: string): Promise<AutomationAnalytics> {
    await delay(600);
    return {
      activeWorkflows: { value: 12, trend: 33 },
      totalRuns: { value: 2076, trend: 18 },
      successRate: { value: 97.1, trend: 2.4 },
      failedRuns: { value: 61, trend: -28 },
      timeSavedHours: { value: 84, trend: 41 },
      actionsExecuted: { value: 6842, trend: 26 },
      activity: [
        { date: "Mar 15", successfulRuns: 50, failedRuns: 5, successRate: 90 },
        { date: "Mar 16", successfulRuns: 45, failedRuns: 3, successRate: 92 },
        { date: "Mar 17", successfulRuns: 65, failedRuns: 10, successRate: 85 },
        { date: "Mar 18", successfulRuns: 70, failedRuns: 8, successRate: 89 },
        { date: "Mar 19", successfulRuns: 80, failedRuns: 4, successRate: 95 },
        { date: "Mar 20", successfulRuns: 85, failedRuns: 2, successRate: 97 },
        { date: "Mar 21", successfulRuns: 75, failedRuns: 6, successRate: 92 },
        { date: "Mar 22", successfulRuns: 60, failedRuns: 1, successRate: 98 },
        { date: "Mar 23", successfulRuns: 55, failedRuns: 2, successRate: 96 },
        { date: "Mar 24", successfulRuns: 65, failedRuns: 4, successRate: 94 },
        { date: "Mar 25", successfulRuns: 70, failedRuns: 3, successRate: 95 },
        { date: "Mar 26", successfulRuns: 80, failedRuns: 2, successRate: 97 },
        { date: "Mar 27", successfulRuns: 90, failedRuns: 5, successRate: 94 },
        { date: "Mar 28", successfulRuns: 75, failedRuns: 12, successRate: 85 },
        { date: "Mar 29", successfulRuns: 80, failedRuns: 6, successRate: 92 },
        { date: "Mar 30", successfulRuns: 100, failedRuns: 3, successRate: 97 },
        { date: "Mar 31", successfulRuns: 95, failedRuns: 2, successRate: 98 },
        { date: "Apr 1", successfulRuns: 90, failedRuns: 4, successRate: 95 },
        { date: "Apr 2", successfulRuns: 110, failedRuns: 5, successRate: 95 },
        { date: "Apr 3", successfulRuns: 120, failedRuns: 3, successRate: 97 },
        { date: "Apr 4", successfulRuns: 115, failedRuns: 2, successRate: 98 },
        { date: "Apr 5", successfulRuns: 100, failedRuns: 8, successRate: 92 },
        { date: "Apr 6", successfulRuns: 105, failedRuns: 4, successRate: 96 },
        { date: "Apr 7", successfulRuns: 125, failedRuns: 5, successRate: 96 },
        { date: "Apr 8", successfulRuns: 130, failedRuns: 2, successRate: 98 },
        { date: "Apr 9", successfulRuns: 110, failedRuns: 4, successRate: 96 },
        { date: "Apr 10", successfulRuns: 115, failedRuns: 1, successRate: 99 },
        { date: "Apr 11", successfulRuns: 125, failedRuns: 3, successRate: 97 },
        { date: "Apr 12", successfulRuns: 120, failedRuns: 5, successRate: 95 },
        { date: "Apr 13", successfulRuns: 110, failedRuns: 4, successRate: 96 },
        { date: "Apr 14", successfulRuns: 115, failedRuns: 2, successRate: 98 }
      ],
      health: [
        { status: "Healthy", count: 24, color: "#10B981" },
        { status: "Needs Attention", count: 4, color: "#F59E0B" },
        { status: "Paused", count: 3, color: "#3B82F6" },
        { status: "Error", count: 1, color: "#EF4444" }
      ],
      triggerSources: [
        { source: "Meta Ads", percentage: 38, color: "#1877F2" },
        { source: "Website", percentage: 24, color: "#10B981" },
        { source: "Google Business", percentage: 16, color: "#F59E0B" },
        { source: "Manual", percentage: 10, color: "#8B5CF6" },
        { source: "Time Based", percentage: 8, color: "#EC4899" },
        { source: "Others", percentage: 4, color: "#94A3B8" }
      ],
      alerts: [
        { id: "a1", type: "error", title: "WhatsApp action failed 14 times", description: "New Meta Lead Follow-up", timeAgo: "2 hrs ago", actionLabel: "View Runs" },
        { id: "a2", type: "warning", title: "Google connection expired", description: "Google Review Alert", timeAgo: "5 hrs ago", actionLabel: "Reconnect" },
        { id: "a3", type: "error", title: "8 leads stuck at step 3", description: "WhatsApp Re-engagement", timeAgo: "1 day ago", actionLabel: "View Runs" },
        { id: "a4", type: "warning", title: "Workflow has no assignee", description: "Website Down Alert", timeAgo: "1 day ago", actionLabel: "Edit" },
        { id: "a5", type: "error", title: "Meta integration error", description: "Lead Campaign Monitor", timeAgo: "2 days ago", actionLabel: "Fix" },
      ]
    };
  }
}

export const automationRepository = new MockAutomationRepository();
