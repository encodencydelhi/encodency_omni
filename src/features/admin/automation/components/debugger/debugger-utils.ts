import type { Metric, PlanStep, RunTrace, SimulationResult, TraceEdgeState, TraceEvent, TraceEvidence, TraceNodeState } from "../../data/trace-types";

export const NODE_STATE_STYLE: Record<TraceNodeState, { label: string; border: string; bg: string; dot: string; text: string; hex: string }> = {
  successful: { label: "Successful", border: "border-emerald-400", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700", hex: "#10B981" },
  failed: { label: "Failed", border: "border-red-400", bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700", hex: "#EF4444" },
  running: { label: "Running", border: "border-blue-400", bg: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-700", hex: "#3B82F6" },
  waiting: { label: "Waiting", border: "border-violet-400", bg: "bg-violet-50", dot: "bg-violet-500", text: "text-violet-700", hex: "#7C3AED" },
  skipped: { label: "Skipped", border: "border-slate-300", bg: "bg-slate-50", dot: "bg-slate-400", text: "text-slate-500", hex: "#94A3B8" },
  cancelled: { label: "Cancelled", border: "border-amber-400", bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-700", hex: "#F59E0B" },
  unknown_outcome: { label: "Unknown Outcome", border: "border-orange-500", bg: "bg-orange-50", dot: "bg-orange-500", text: "text-orange-700", hex: "#F97316" },
  not_executed: { label: "Not Executed", border: "border-slate-200", bg: "bg-white", dot: "bg-slate-300", text: "text-slate-400", hex: "#CBD5E1" },
};

export const STATE_ORDER: TraceNodeState[] = ["successful", "failed", "running", "waiting", "skipped", "cancelled", "unknown_outcome", "not_executed"];

export function edgeVisual(state: TraceEdgeState, evidence: TraceEvidence): { stroke: string; width: number; dashed: boolean; opacity: number; animated: boolean } {
  if (state === "taken") return { stroke: evidence === "recorded" ? "#059669" : "#34D399", width: 2.5, dashed: evidence === "inferred", opacity: 1, animated: false };
  if (state === "not_taken") return { stroke: "#CBD5E1", width: 1.5, dashed: true, opacity: 0.8, animated: false };
  return { stroke: "#E2E8F0", width: 1.25, dashed: true, opacity: 0.7, animated: false };
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "Data Unavailable";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1000)} s`;
  return `${Math.floor(ms / 3_600_000)} h ${Math.round((ms % 3_600_000) / 60_000)} m`;
}

export function stateCounts(trace: Pick<RunTrace, "snapshot" | "nodes">): Record<TraceNodeState, number> {
  const counts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0])) as Record<TraceNodeState, number>;
  for (const node of trace.snapshot.nodes) counts[trace.nodes[node.id]?.state ?? "not_executed"] += 1;
  return counts;
}

export function eventsForNode(events: TraceEvent[], nodeId: string | null): TraceEvent[] {
  return nodeId ? events.filter((event) => event.nodeId === nodeId) : events;
}

/** Moves through the recorded timeline; clamps at both ends and never wraps. */
export function stepEvent(length: number, current: number | null, direction: "first" | "previous" | "next" | "last"): number | null {
  if (length <= 0) return null;
  if (direction === "first") return 0;
  if (direction === "last") return length - 1;
  if (current === null) return direction === "next" ? 0 : length - 1;
  return Math.min(length - 1, Math.max(0, current + (direction === "next" ? 1 : -1)));
}

export const EVENT_SOURCE_LABEL: Record<TraceEvent["source"], string> = {
  run: "Run", step: "Step", step_run: "Attempt", branch: "Branch", iteration: "Iteration", join: "Join", approval: "Approval", child_run: "Child Run",
};

export const EVENT_FILTERS = [
  { id: "all", label: "All Events", sources: null },
  { id: "steps", label: "Steps & Attempts", sources: ["step", "step_run"] },
  { id: "orchestration", label: "Branches & Iterations", sources: ["branch", "join", "iteration"] },
  { id: "human", label: "Approvals & Waits", sources: ["approval"] },
  { id: "children", label: "Child Runs", sources: ["child_run"] },
] as const;
export type EventFilterId = (typeof EVENT_FILTERS)[number]["id"];

export function filterEvents(events: TraceEvent[], filter: EventFilterId): TraceEvent[] {
  const entry = EVENT_FILTERS.find((candidate) => candidate.id === filter);
  if (!entry || !entry.sources) return events;
  const allowed = new Set<string>(entry.sources);
  return events.filter((event) => allowed.has(event.source) || (filter === "human" && event.kind.startsWith("step.waiting")));
}

export type SimNodeState = "planned" | "blocked" | "failed" | "not_visited";
export const SIM_STATE_STYLE: Record<SimNodeState, { label: string; border: string; bg: string; dot: string; text: string; hex: string }> = {
  planned: { label: "Planned", border: "border-sky-400", bg: "bg-sky-50", dot: "bg-sky-500", text: "text-sky-700", hex: "#0EA5E9" },
  blocked: { label: "Needs Outcome", border: "border-amber-400", bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-700", hex: "#F59E0B" },
  failed: { label: "Simulated Failure", border: "border-red-400", bg: "bg-red-50", dot: "bg-red-500", text: "text-red-700", hex: "#EF4444" },
  not_visited: { label: "Not Reached", border: "border-slate-200", bg: "bg-white", dot: "bg-slate-300", text: "text-slate-400", hex: "#CBD5E1" },
};

export function simulationStates(result: Pick<SimulationResult, "steps">): Record<string, SimNodeState> {
  const states: Record<string, SimNodeState> = {};
  const rank: Record<PlanStep["status"], SimNodeState> = { planned: "planned", skipped: "planned", blocked: "blocked", failed: "failed" };
  for (const step of result.steps) {
    const next = rank[step.status];
    const previous = states[step.nodeId];
    // A blocked or failed visit is never hidden by a later planned visit of the same node (e.g. loop iterations).
    if (!previous || previous === "planned") states[step.nodeId] = next;
  }
  return states;
}

export type JsonParse = { ok: true; value: Record<string, unknown> } | { ok: false; error: string };

/** Parses editor text as a JSON *object* (the only shape the diagnostics endpoints accept) with a readable error. */
export function parseJsonObject(text: string, maxBytes = 64 * 1024): JsonParse {
  if (!text.trim()) return { ok: true, value: {} };
  if (text.length > maxBytes) return { ok: false, error: "The JSON is larger than 64 KB." };
  try {
    const value = JSON.parse(text) as unknown;
    if (value === null || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Enter a JSON object, for example {\"name\": \"Asha\"}." };
    return { ok: true, value: value as Record<string, unknown> };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${error instanceof Error ? error.message : "could not be parsed"}` };
  }
}

export function metricText<T>(metric: Metric<T>, format: (value: T) => string): string {
  return metric.available ? format(metric.value) : "Data Unavailable";
}
