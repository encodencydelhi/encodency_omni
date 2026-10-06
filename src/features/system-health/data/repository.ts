import { apiClient } from "@/lib/api/client";
import { buildSystemHealthSnapshot } from "./mock-provider";
import type { HealthEnvironment, ImpactRecord, IncidentRecord, IncidentState, SystemHealthSnapshotV2 } from "./types";

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
  createIncident(input: CreateIncidentInput): Promise<IncidentRecord>;
  addIncidentUpdate(id: string, note: string): Promise<IncidentRecord>;
  changeIncidentState(id: string, state: IncidentState, resolution?: string): Promise<IncidentRecord>;
  addIncidentImpact(id: string, impact: Omit<ImpactRecord, "id" | "incidentId">): Promise<ImpactRecord>;
}

export class MockSystemHealthRepository implements SystemHealthRepository {
  async loadSnapshot(environment: HealthEnvironment) {
    return buildSystemHealthSnapshot(environment);
  }
  async createIncident(input: CreateIncidentInput) {
    return makeIncident(input, Date.now() % 1000);
  }
  async addIncidentUpdate(id: string, note: string) {
    const snapshot = buildSystemHealthSnapshot("production");
    const incident = snapshot.incidents.find((item) => item.id === id);
    if (!incident) throw new Error("Incident not found.");
    return { ...incident, currentFindings: note, timeline: [{ id: `${id}-${Date.now()}`, at: new Date().toISOString(), actor: incident.ownerName ?? "Super Admin", type: "update" as const, note }, ...incident.timeline] };
  }
  async changeIncidentState(id: string, state: IncidentState, resolution?: string) {
    const snapshot = buildSystemHealthSnapshot("production");
    const incident = snapshot.incidents.find((item) => item.id === id);
    if (!incident) throw new Error("Incident not found.");
    return { ...incident, state, resolvedAt: state === "resolved" ? new Date().toISOString() : incident.resolvedAt, recoveryEvidence: state === "resolved" ? resolution || "Resolved after evidence review." : incident.recoveryEvidence };
  }
  async addIncidentImpact(id: string, impact: Omit<ImpactRecord, "id" | "incidentId">) {
    return { ...impact, id: `imp-demo-${Date.now()}`, incidentId: id };
  }
}

export class LiveSystemHealthRepository implements SystemHealthRepository {
  async loadSnapshot(environment: HealthEnvironment) {
    return apiClient.request<SystemHealthSnapshotV2>({ method: "GET", path: "/super-admin/system-health/snapshot", query: { environment } });
  }
  async createIncident(input: CreateIncidentInput) {
    return apiClient.request<IncidentRecord>({ method: "POST", path: "/super-admin/system-health/incidents", body: input });
  }
  async addIncidentUpdate(id: string, note: string) {
    return apiClient.request<IncidentRecord>({ method: "POST", path: `/super-admin/system-health/incidents/${id}/updates`, body: { note } });
  }
  async changeIncidentState(id: string, state: IncidentState, resolution?: string) {
    return apiClient.request<IncidentRecord>({ method: "PATCH", path: `/super-admin/system-health/incidents/${id}/state`, body: { state, resolution } });
  }
  async addIncidentImpact(id: string, impact: Omit<ImpactRecord, "id" | "incidentId">) {
    return apiClient.request<ImpactRecord>({ method: "POST", path: `/super-admin/system-health/incidents/${id}/impacts`, body: impact });
  }
}

export const systemHealthRepository: SystemHealthRepository = process.env.NEXT_PUBLIC_SYSTEM_HEALTH_MOCK_MODE === "true" ? new MockSystemHealthRepository() : new LiveSystemHealthRepository();

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
  return state === "monitoring_recovery" ? "Monitoring Recovery" : state.charAt(0).toUpperCase() + state.slice(1);
}
