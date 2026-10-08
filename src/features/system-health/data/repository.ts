import { apiClient } from "@/lib/api/client";
import { buildSystemHealthSnapshot } from "./mock-provider";
import type { HealthEnvironment, ImpactRecord, IncidentRecord, IncidentState, SystemHealthSnapshotV2 } from "./types";

export interface CreateIncidentInput {
  title: string;
  priority: IncidentRecord["priority"];
  primaryServiceId: string;
  affectedServiceIds: string[];
  ownerId: string;
  summary: string;
}

/** Companies and clients are picked from the platform, never typed: the backend resolves their names. */
export interface AddImpactInput {
  confidence: ImpactRecord["confidence"];
  area: string;
  companyId: string | null;
  clientId: string | null;
  workflow: string;
  evidence: string;
  serviceId?: string;
}

export interface IncidentOwner {
  id: string;
  name: string;
  role: string;
}

export interface ImpactTargets {
  companies: Array<{ id: string; name: string; clients: Array<{ id: string; name: string }> }>;
}

export interface SystemHealthRepository {
  /** Without an environment the backend answers for the one it is running in. */
  loadSnapshot(environment?: HealthEnvironment): Promise<SystemHealthSnapshotV2>;
  listOwners(): Promise<IncidentOwner[]>;
  getImpactTargets(): Promise<ImpactTargets>;
  createIncident(input: CreateIncidentInput): Promise<IncidentRecord>;
  addIncidentUpdate(id: string, note: string): Promise<IncidentRecord>;
  changeIncidentState(id: string, state: IncidentState, resolution?: string): Promise<IncidentRecord>;
  addIncidentImpact(id: string, impact: AddImpactInput): Promise<ImpactRecord>;
}

export class MockSystemHealthRepository implements SystemHealthRepository {
  async loadSnapshot(environment: HealthEnvironment = "production") {
    return buildSystemHealthSnapshot(environment);
  }
  async listOwners() {
    return [{ id: "demo-owner", name: "Demo Owner", role: "Super Admin" }];
  }
  async getImpactTargets() {
    return { companies: [] };
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
  async addIncidentImpact(id: string, impact: AddImpactInput) {
    return { id: `imp-demo-${Date.now()}`, incidentId: id, confidence: impact.confidence, area: impact.area, companyId: impact.companyId, companyName: null, clientName: null, workflow: impact.workflow, evidence: impact.evidence, serviceId: impact.serviceId ?? "svc-core-api" };
  }
}

export class LiveSystemHealthRepository implements SystemHealthRepository {
  async loadSnapshot(environment?: HealthEnvironment) {
    return apiClient.request<SystemHealthSnapshotV2>({ method: "GET", path: "/super-admin/system-health/snapshot", query: environment ? { environment } : undefined });
  }
  async listOwners() {
    return apiClient.request<IncidentOwner[]>({ method: "GET", path: "/super-admin/system-health/owners" });
  }
  async getImpactTargets() {
    return apiClient.request<ImpactTargets>({ method: "GET", path: "/super-admin/system-health/impact-targets" });
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
  async addIncidentImpact(id: string, impact: AddImpactInput) {
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
    ownerName: "Demo Owner",
    summary: input.summary,
    currentFindings: "New demo incident awaiting investigation update.",
    recoveryEvidence: "",
    impactIds: [],
    timeline: [{ id: `${id}-tl-1`, at, actor: "Demo Owner", type: "created", note: "Created in frontend demo state. No production monitor was changed." }],
  };
}

export function transitionLabel(state: IncidentState) {
  return state === "monitoring_recovery" ? "Monitoring Recovery" : state.charAt(0).toUpperCase() + state.slice(1);
}
