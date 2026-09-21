import { buildSystemHealthSnapshot } from "./mock-provider";
import type { HealthEnvironment, IncidentRecord, IncidentState, SystemHealthSnapshotV2 } from "./types";

export interface CreateIncidentInput {
  title: string;
  priority: IncidentRecord["priority"];
  primaryServiceId: string;
  affectedServiceIds: string[];
  ownerId: string;
  ownerName: string;
  summary: string;
}

export interface SystemHealthRepository {
  loadSnapshot(environment: HealthEnvironment): Promise<SystemHealthSnapshotV2>;
}

export class MockSystemHealthRepository implements SystemHealthRepository {
  async loadSnapshot(environment: HealthEnvironment) {
    return buildSystemHealthSnapshot(environment);
  }
}

export const systemHealthRepository = new MockSystemHealthRepository();

export function makeIncident(input: CreateIncidentInput, index: number): IncidentRecord {
  const at = new Date().toISOString();
  const id = `inc-demo-${index}`;
  return {
    id,
    reference: `DEMO-${String(index).padStart(3, "0")}`,
    title: input.title,
    priority: input.priority,
    state: "investigating",
    primaryServiceId: input.primaryServiceId,
    affectedServiceIds: Array.from(new Set([input.primaryServiceId, ...input.affectedServiceIds])),
    startedAt: at,
    detectedAt: at,
    resolvedAt: null,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    summary: input.summary,
    currentFindings: "New demo incident awaiting investigation update.",
    recoveryEvidence: "",
    impactIds: [],
    timeline: [{ id: `${id}-tl-1`, at, actor: input.ownerName, type: "created", note: "Created in frontend demo state. No production monitor was changed." }],
  };
}

export function transitionLabel(state: IncidentState) {
  return state === "monitoring_recovery" ? "Monitoring Recovery" : state[0].toUpperCase() + state.slice(1);
}
