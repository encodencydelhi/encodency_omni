import type {
  DependencyRecord,
  HealthEnvironment,
  HealthObservation,
  IncidentRecord,
  MonitoringFreshness,
  ObservedHealth,
  ServiceRecord,
  SystemHealthSnapshotV2,
} from "./types";

const severity: Record<ObservedHealth, number> = { healthy: 0, unknown: 1, degraded: 2, unavailable: 3 };

export function observationFor(snapshot: SystemHealthSnapshotV2, serviceId: string): HealthObservation | undefined {
  return snapshot.observations.find((observation) => observation.serviceId === serviceId);
}

export function sourceFreshness(snapshot: SystemHealthSnapshotV2, observation: HealthObservation | undefined): MonitoringFreshness {
  if (!observation?.observedAt) return "never_reported";
  const source = snapshot.sources.find((item) => item.id === observation.sourceId);
  const ageMinutes = (Date.parse(snapshot.generatedAt) - Date.parse(observation.observedAt)) / 60_000;
  return ageMinutes > (source?.freshnessThresholdMinutes ?? 15) ? "stale" : "fresh";
}

export function serviceHealth(snapshot: SystemHealthSnapshotV2, service: ServiceRecord): ObservedHealth {
  return observationFor(snapshot, service.id)?.observedHealth ?? "unknown";
}

export function activeIncidents(snapshot: SystemHealthSnapshotV2): IncidentRecord[] {
  return snapshot.incidents.filter((incident) => incident.state !== "resolved");
}

export function incidentsForService(snapshot: SystemHealthSnapshotV2, serviceId: string): IncidentRecord[] {
  return snapshot.incidents.filter((incident) => incident.affectedServiceIds.includes(serviceId));
}

export function dependenciesForService(snapshot: SystemHealthSnapshotV2, service: ServiceRecord): DependencyRecord[] {
  return service.dependencyIds.map((id) => snapshot.dependencies.find((dependency) => dependency.id === id)).filter(Boolean) as DependencyRecord[];
}

export function derivePlatformState(snapshot: SystemHealthSnapshotV2): "Operational" | "Degraded" | "Partial Outage" | "Major Outage" | "Unknown" {
  const states = snapshot.services.map((service) => serviceHealth(snapshot, service));
  const criticalUnavailable = snapshot.services.some((service) => service.criticality === "critical" && serviceHealth(snapshot, service) === "unavailable");
  const criticalUnknown = snapshot.services.some((service) => service.criticality === "critical" && sourceFreshness(snapshot, observationFor(snapshot, service.id)) !== "fresh");
  if (criticalUnavailable) return "Major Outage";
  if (states.includes("unavailable")) return "Partial Outage";
  if (states.includes("degraded")) return "Degraded";
  if (states.includes("unknown") || criticalUnknown) return "Unknown";
  return "Operational";
}

export function summaryKpis(snapshot: SystemHealthSnapshotV2) {
  const active = activeIncidents(snapshot);
  const counts = { healthy: 0, degraded: 0, unavailable: 0, unknown: 0 } satisfies Record<ObservedHealth, number>;
  let stale = 0;
  for (const service of snapshot.services) {
    counts[serviceHealth(snapshot, service)] += 1;
    const freshness = sourceFreshness(snapshot, observationFor(snapshot, service.id));
    if (freshness !== "fresh") stale += 1;
  }
  const affectedCompanies = new Set(snapshot.impacts.filter((impact) => impact.incidentId && active.some((incident) => incident.id === impact.incidentId) && impact.companyId).map((impact) => impact.companyId));
  return {
    monitoredServices: snapshot.services.length,
    healthy: counts.healthy,
    degraded: counts.degraded,
    unavailable: counts.unavailable,
    unknown: counts.unknown,
    activeIncidents: active.length,
    affectedCompanies: affectedCompanies.size,
    staleMonitors: stale,
  };
}

export function sortServicesByAttention(snapshot: SystemHealthSnapshotV2) {
  return [...snapshot.services].sort((a, b) => severity[serviceHealth(snapshot, b)] - severity[serviceHealth(snapshot, a)]);
}

export function environmentLabel(environment: HealthEnvironment) {
  return environment.charAt(0).toUpperCase() + environment.slice(1);
}
