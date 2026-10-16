/** Milestone 3F — shapes returned by the read-only diagnostics endpoints. They mirror backend/src/automation/automation.{trace,simulator,insights}.ts. */

export type TraceNodeState = "successful" | "failed" | "running" | "waiting" | "skipped" | "cancelled" | "unknown_outcome" | "not_executed";
export type TraceEdgeState = "taken" | "not_taken" | "not_reached";
export type TraceEvidence = "recorded" | "inferred";

export interface TraceNode {
  state: TraceNodeState; executions: number; attempts: number; startedAt: string | null; finishedAt: string | null; durationMs: number | null;
  errorCode: string | null; error: string | null; recommendation: string | null; providerRef: string | null; selectedEdgeId: string | null; evidence: TraceEvidence;
  dryRun: boolean; skipReason: string | null; input: unknown; output: unknown;
}

export interface TraceSnapshotNode { id: string; type: string; actionId: string; label: string; config: Record<string, unknown>; position: { x: number; y: number } | null }
export interface TraceSnapshotEdge { id: string; source: string; target: string; sourceHandle: string | null; label: string | null; state: TraceEdgeState; evidence: TraceEvidence }

export interface TraceEvent {
  at: string; kind: string; nodeId: string | null; title: string; detail: string | null; status: string | null; refId: string | null;
  source: "run" | "step" | "step_run" | "branch" | "iteration" | "join" | "approval" | "child_run";
}

export interface RunTrace {
  run: {
    id: string; status: string; isTest: boolean; triggerSource: string | null; startedAt: string | null; completedAt: string | null; durationMs: number;
    workflowId: string; workflowName: string | null; workflowVersion: number | null; executionMode: string; correlationId: string | null; rootRunId: string | null;
    retryOfId: string | null; parentRunId: string | null; parentNodeId: string | null; nestingDepth: number; failureClass: string | null; dlqStatus: string | null;
    resumeAt: string | null; error: { code?: string; message?: string; recommendation?: string } | null;
  };
  checkpoint: { cursor: number; stateVersion: number; heartbeatAt: string | null; leaseUntil: string | null };
  snapshot: { available: boolean; nodes: TraceSnapshotNode[]; edges: TraceSnapshotEdge[] };
  nodes: Record<string, TraceNode>;
  timeline: TraceEvent[];
  branches: Array<{ id: string; branchKey: string; splitNodeId: string; joinNodeId: string | null; status: string; startedAt: string | null; completedAt: string | null }>;
  iterations: Array<{ id: string; nodeId: string; index: number; status: string; startedAt: string | null; completedAt: string | null }>;
  approvals: Array<{ id: string; nodeId: string; status: string; expiresAt: string | null; decidedAt: string | null }>;
  childRuns: Array<{ id: string; workflowId: string; workflowName: string | null; parentNodeId: string | null; workflowVersion: number | null; status: string; startedAt: string | null; completedAt: string | null }>;
  investigation: { failedNodeId: string | null; evidence: string[]; unknownOutcome: boolean; duplicateRisk: boolean; canRetry: boolean; retryRequiresAcknowledgement: boolean; rootCauseCertainty: "recorded_evidence_only" | "none" };
  dataQuality: { snapshotAvailable: boolean; stepRunsAvailable: boolean; payloadRetained: boolean; notes: string[] };
  parent: { id: string; status: string; workflowName: string } | null;
}

export interface PlanStep {
  seq: number; nodeId: string; actionId: string; label: string; kind: "trigger" | "decision" | "action" | "wait" | "approval" | "child" | "orchestration";
  status: "planned" | "skipped" | "blocked" | "failed"; simulated: true; scope: string | null; note: string | null; route?: string | null;
  wouldExecute?: boolean; rendered?: unknown; mock?: unknown; resumeAt?: string | null;
}
export interface GraphIssue { kind: "graph" | "node" | "edge"; id?: string; code: string; message: string }
export interface SimulationResult {
  canSimulate: boolean; issues: GraphIssue[]; warnings: string[]; steps: PlanStep[]; plannedActions: PlanStep[]; visitedNodeIds: string[]; takenEdgeIds: string[];
  outcome: "completed" | "stopped" | "blocked" | "invalid"; truncated: boolean; sideEffects: "none"; simulated: true; limitations: string[];
  source: "unsaved_editor" | "draft" | "published" | "version"; version: number | null;
}
export interface NodeTestResult {
  nodeId: string; actionId: string; supported: boolean; limitation: string | null; simulated: true; sideEffects: "none";
  validation: Array<{ path: string; message: string }>; unresolvedVariables: string[]; resolved: unknown; result: Record<string, unknown> | null;
}

export type Metric<T> = { available: true; value: T; samples: number } | { available: false; reason: string; samples: number };
export interface DurationStats { count: number; avgMs: number; p50Ms: number; p95Ms: number; maxMs: number }
export interface WorkflowInsights {
  windowDays: number; runsAnalysed: number; truncated: boolean;
  outcomes: { successful: number; failed: number; cancelled: number; running: number; waiting: number };
  failureRatePercent: Metric<number>; runDuration: Metric<DurationStats>;
  slowestNodes: Array<{ nodeId: string; label: string; actionId: string; executions: number; failures: number; duration: Metric<DurationStats> }>;
  nodes: Array<{ nodeId: string; label: string; actionId: string; executions: number; failures: number; duration: Metric<DurationStats> }>;
  retries: { total: number; byNode: Array<{ nodeId: string; count: number }> };
  approvalWait: Metric<DurationStats>;
  branchBottlenecks: Metric<Array<{ key: string } & DurationStats>>; iterationBottlenecks: Metric<Array<{ key: string } & DurationStats>>;
  queueDelay: Metric<never>; waitingTime: Metric<never>; trend: Metric<Array<{ day: string; successful: number; failed: number }>>;
}
