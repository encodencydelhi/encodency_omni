export type HealthEnvironment = "development" | "staging" | "production";
export type ObservedHealth = "healthy" | "degraded" | "unavailable" | "unknown";
export type MonitoringFreshness = "fresh" | "stale" | "never_reported";
export type IncidentState = "investigating" | "identified" | "monitoring_recovery" | "resolved";
export type MaintenanceState = "scheduled" | "in_progress" | "completed";
export type OperationalControl = "running" | "paused" | "restricted" | "unknown";
export type IncidentPriority = "low" | "medium" | "high" | "critical";
export type ImpactConfidence = "confirmed" | "potential" | "unknown";

export interface MonitoringSource {
  id: string;
  name: string;
  kind: "demo_observation" | "api_summary" | "job_summary" | "integration_summary" | "maintenance_schedule";
  freshnessThresholdMinutes: number;
  backendConnected: boolean;
}

export interface ServiceCapability {
  id: string;
  label: string;
  workflow: string;
  diagnosticHref: string;
}

export interface ServiceRecord {
  id: string;
  name: string;
  category:
    | "Core Platform"
    | "Authentication"
    | "Publishing"
    | "Integrations"
    | "Content & AI"
    | "SEO & Reporting"
    | "Notifications"
    | "Billing"
    | "Infrastructure";
  criticality: "critical" | "high" | "medium" | "low";
  ownerTeam: string;
  ownerId: string;
  description: string;
  capabilities: ServiceCapability[];
  dependencyIds: string[];
  environments: HealthEnvironment[];
}

export interface HealthObservation {
  id: string;
  serviceId: string;
  environment: HealthEnvironment;
  observedHealth: ObservedHealth;
  operationalControl: OperationalControl;
  observedAt: string | null;
  sourceId: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
}

export interface DependencyRecord {
  id: string;
  name: string;
  type: "Database" | "Queue" | "Storage" | "External Provider" | "Authentication Provider" | "AI Processing" | "Email/SMS";
  observedHealth: ObservedHealth;
  freshness: MonitoringFreshness;
  sourceId: string;
  lastObservedAt: string | null;
  impactSummary: string;
}

export interface ImpactRecord {
  id: string;
  confidence: ImpactConfidence;
  area: string;
  companyId: string | null;
  companyName: string | null;
  clientName: string | null;
  workflow: string;
  evidence: string;
  serviceId: string;
  incidentId: string | null;
}

export interface IncidentTimelineEntry {
  id: string;
  at: string;
  actor: string;
  type: "created" | "update" | "state_change" | "owner_change" | "impact_update" | "resolution";
  note: string;
}

export interface IncidentRecord {
  id: string;
  reference: string;
  title: string;
  priority: IncidentPriority;
  state: IncidentState;
  primaryServiceId: string;
  affectedServiceIds: string[];
  startedAt: string;
  detectedAt: string;
  resolvedAt: string | null;
  ownerId: string | null;
  ownerName: string | null;
  summary: string;
  currentFindings: string;
  recoveryEvidence: string;
  impactIds: string[];
  timeline: IncidentTimelineEntry[];
}

export interface MaintenanceRecord {
  id: string;
  title: string;
  state: MaintenanceState;
  startsAt: string;
  endsAt: string;
  owner: string;
  scope: string;
  source: "global_settings";
}

export interface AvailabilityPoint {
  at: string;
  serviceId: string;
  observedAvailability: number | null;
  degradedMinutes: number;
  unavailableMinutes: number;
  unknownMinutes: number;
}

export interface HealthActivity {
  id: string;
  at: string;
  source: string;
  type: string;
  summary: string;
  serviceId: string | null;
  incidentId: string | null;
}

export interface SystemHealthSnapshotV2 {
  environment: HealthEnvironment;
  timezone: string;
  generatedAt: string;
  sources: MonitoringSource[];
  services: ServiceRecord[];
  observations: HealthObservation[];
  dependencies: DependencyRecord[];
  incidents: IncidentRecord[];
  impacts: ImpactRecord[];
  maintenance: MaintenanceRecord[];
  availability: AvailabilityPoint[];
  activity: HealthActivity[];
}
