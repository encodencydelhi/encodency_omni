import type {
  AvailabilityPoint,
  DependencyRecord,
  HealthActivity,
  HealthEnvironment,
  HealthObservation,
  ImpactRecord,
  IncidentRecord,
  MaintenanceRecord,
  MonitoringSource,
  ServiceRecord,
  SystemHealthSnapshotV2,
} from "./types";

const now = new Date("2026-09-21T07:20:00.000Z");
const iso = (minutesOffset: number) => new Date(now.getTime() + minutesOffset * 60_000).toISOString();
const days = (day: number) => new Date(Date.UTC(2026, 8, day, 7, 0, 0)).toISOString();

export const MONITORING_SOURCES: MonitoringSource[] = [
  { id: "src-demo-service", name: "Shared Demo Monitoring Provider", kind: "demo_observation", freshnessThresholdMinutes: 15, backendConnected: false },
  { id: "src-api-summary", name: "API Monitoring Summary", kind: "api_summary", freshnessThresholdMinutes: 10, backendConnected: false },
  { id: "src-jobs-summary", name: "Jobs & Queues Summary", kind: "job_summary", freshnessThresholdMinutes: 20, backendConnected: false },
  { id: "src-integrations-summary", name: "Integrations Capability Summary", kind: "integration_summary", freshnessThresholdMinutes: 30, backendConnected: false },
  { id: "src-maintenance", name: "Global Settings Maintenance Schedule", kind: "maintenance_schedule", freshnessThresholdMinutes: 1440, backendConnected: false },
];

export const SERVICE_REGISTRY: ServiceRecord[] = [
  { id: "svc-core-api", name: "Core API Gateway", category: "Core Platform", criticality: "critical", ownerTeam: "Platform Engineering", ownerId: "stf_003", description: "Dashboard and tenant API routing layer.", dependencyIds: ["dep-primary-db", "dep-redis"], environments: ["development", "staging", "production"], capabilities: [{ id: "cap-api", label: "Authenticated dashboard requests", workflow: "User-facing navigation", diagnosticHref: "/super-admin/api-monitoring" }] },
  { id: "svc-auth", name: "Authentication & Sessions", category: "Authentication", criticality: "critical", ownerTeam: "Platform Engineering", ownerId: "stf_001", description: "Sign-in, MFA, session refresh and access gates.", dependencyIds: ["dep-primary-db", "dep-auth-provider"], environments: ["development", "staging", "production"], capabilities: [{ id: "cap-auth", label: "Staff and tenant sign-in", workflow: "Authentication", diagnosticHref: "/super-admin/users/security" }] },
  { id: "svc-publishing", name: "Publishing Orchestrator", category: "Publishing", criticality: "high", ownerTeam: "Platform Operations", ownerId: "stf_010", description: "Coordinates scheduled posts across social providers.", dependencyIds: ["dep-queue", "dep-meta", "dep-linkedin", "dep-storage"], environments: ["staging", "production"], capabilities: [{ id: "cap-schedule", label: "Scheduled publishing", workflow: "Calendar and Campaigns", diagnosticHref: "/super-admin/jobs" }] },
  { id: "svc-integrations", name: "Integration Capability Resolver", category: "Integrations", criticality: "high", ownerTeam: "Integrations", ownerId: "stf_006", description: "Normalizes provider authorization and resource capability state.", dependencyIds: ["dep-meta", "dep-linkedin", "dep-google"], environments: ["development", "staging", "production"], capabilities: [{ id: "cap-oauth", label: "Provider capability checks", workflow: "Integrations", diagnosticHref: "/super-admin/integrations" }] },
  { id: "svc-seo-crawler", name: "SEO Crawler Workers", category: "SEO & Reporting", criticality: "medium", ownerTeam: "Platform Engineering", ownerId: "stf_003", description: "Crawls client websites and produces audit observations.", dependencyIds: ["dep-queue", "dep-storage"], environments: ["staging", "production"], capabilities: [{ id: "cap-crawl", label: "SEO audit crawling", workflow: "SEO Audit", diagnosticHref: "/super-admin/jobs" }] },
  { id: "svc-analytics", name: "Analytics Sync", category: "SEO & Reporting", criticality: "medium", ownerTeam: "Data Operations", ownerId: "stf_011", description: "Scheduled metric imports for provider insights and reports.", dependencyIds: ["dep-queue", "dep-google", "dep-meta"], environments: ["production"], capabilities: [{ id: "cap-report", label: "Provider metrics sync", workflow: "Reporting", diagnosticHref: "/super-admin/jobs" }] },
  { id: "svc-billing", name: "Billing Ledger", category: "Billing", criticality: "high", ownerTeam: "Finance Operations", ownerId: "stf_008", description: "Subscription, invoice and payment event read model.", dependencyIds: ["dep-primary-db"], environments: ["staging", "production"], capabilities: [{ id: "cap-billing", label: "Billing account visibility", workflow: "Billing & Payments", diagnosticHref: "/super-admin/billing" }] },
  { id: "svc-notifications", name: "Notification Dispatcher", category: "Notifications", criticality: "medium", ownerTeam: "Support Operations", ownerId: "stf_005", description: "Email, in-app and workflow notification queueing.", dependencyIds: ["dep-queue", "dep-mail"], environments: ["development", "staging", "production"], capabilities: [{ id: "cap-notify", label: "Operational notifications", workflow: "Notifications", diagnosticHref: "/super-admin/notifications" }] },
];

export const DEPENDENCIES: DependencyRecord[] = [
  { id: "dep-primary-db", name: "Primary Database", type: "Database", observedHealth: "healthy", freshness: "fresh", sourceId: "src-demo-service", lastObservedAt: iso(-4), impactSummary: "Required by core platform, auth and billing." },
  { id: "dep-redis", name: "Redis Cache", type: "Queue", observedHealth: "healthy", freshness: "fresh", sourceId: "src-demo-service", lastObservedAt: iso(-5), impactSummary: "Cache and queue coordination dependency." },
  { id: "dep-queue", name: "Background Queue", type: "Queue", observedHealth: "degraded", freshness: "fresh", sourceId: "src-jobs-summary", lastObservedAt: iso(-7), impactSummary: "Delayed publishing and crawling jobs may occur." },
  { id: "dep-storage", name: "Media Storage", type: "Storage", observedHealth: "healthy", freshness: "fresh", sourceId: "src-demo-service", lastObservedAt: iso(-6), impactSummary: "Media library and generated reports." },
  { id: "dep-meta", name: "Meta Provider APIs", type: "External Provider", observedHealth: "degraded", freshness: "stale", sourceId: "src-integrations-summary", lastObservedAt: iso(-46), impactSummary: "Potential effect on Meta publishing and insights only where connected." },
  { id: "dep-linkedin", name: "LinkedIn Provider APIs", type: "External Provider", observedHealth: "healthy", freshness: "fresh", sourceId: "src-integrations-summary", lastObservedAt: iso(-11), impactSummary: "Used by LinkedIn publishing workflows." },
  { id: "dep-google", name: "Google Business APIs", type: "External Provider", observedHealth: "unknown", freshness: "never_reported", sourceId: "src-integrations-summary", lastObservedAt: null, impactSummary: "Monitoring source not connected for this provider." },
  { id: "dep-auth-provider", name: "Password & MFA Provider", type: "Authentication Provider", observedHealth: "healthy", freshness: "fresh", sourceId: "src-demo-service", lastObservedAt: iso(-8), impactSummary: "Authentication backend dependency." },
  { id: "dep-mail", name: "Transactional Email", type: "Email/SMS", observedHealth: "healthy", freshness: "fresh", sourceId: "src-demo-service", lastObservedAt: iso(-9), impactSummary: "Notification delivery channel." },
];

export const OBSERVATIONS: HealthObservation[] = [
  { id: "obs-api-prod", serviceId: "svc-core-api", environment: "production", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-4), sourceId: "src-api-summary", summary: "API request error rate remains within demo threshold.", metricLabel: "P95 latency", metricValue: "418 ms" },
  { id: "obs-auth-prod", serviceId: "svc-auth", environment: "production", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-8), sourceId: "src-demo-service", summary: "No active authentication incident in demo records.", metricLabel: "Session checks", metricValue: "Nominal" },
  { id: "obs-pub-prod", serviceId: "svc-publishing", environment: "production", observedHealth: "degraded", operationalControl: "running", observedAt: iso(-7), sourceId: "src-jobs-summary", summary: "Queue delay observed for Meta publishing operations.", metricLabel: "Queue delay", metricValue: "18 min" },
  { id: "obs-int-prod", serviceId: "svc-integrations", environment: "production", observedHealth: "degraded", operationalControl: "running", observedAt: iso(-46), sourceId: "src-integrations-summary", summary: "Provider capability data is stale for Meta and missing for Google Business.", metricLabel: "Stale sources", metricValue: "2" },
  { id: "obs-seo-prod", serviceId: "svc-seo-crawler", environment: "production", observedHealth: "unavailable", operationalControl: "paused", observedAt: iso(-12), sourceId: "src-jobs-summary", summary: "Crawler queue intentionally paused during investigation; service health remains unavailable for crawl starts.", metricLabel: "Paused queues", metricValue: "1" },
  { id: "obs-analytics-prod", serviceId: "svc-analytics", environment: "production", observedHealth: "unknown", operationalControl: "unknown", observedAt: null, sourceId: "src-demo-service", summary: "No current observation has been reported for this environment.", metricLabel: "Coverage", metricValue: "Never reported" },
  { id: "obs-billing-prod", serviceId: "svc-billing", environment: "production", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-6), sourceId: "src-demo-service", summary: "Billing read model has no active demo incident.", metricLabel: "Ledger lag", metricValue: "2 min" },
  { id: "obs-notif-prod", serviceId: "svc-notifications", environment: "production", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-9), sourceId: "src-demo-service", summary: "Notification queue is processing normally in demo data.", metricLabel: "Queue depth", metricValue: "42" },
  { id: "obs-api-stg", serviceId: "svc-core-api", environment: "staging", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-3), sourceId: "src-api-summary", summary: "Staging API demo monitor is fresh.", metricLabel: "P95 latency", metricValue: "360 ms" },
  { id: "obs-auth-stg", serviceId: "svc-auth", environment: "staging", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-3), sourceId: "src-demo-service", summary: "Staging auth demo monitor is fresh.", metricLabel: "Session checks", metricValue: "Nominal" },
  { id: "obs-pub-stg", serviceId: "svc-publishing", environment: "staging", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-14), sourceId: "src-jobs-summary", summary: "No staging queue delay in demo data.", metricLabel: "Queue delay", metricValue: "2 min" },
  { id: "obs-int-stg", serviceId: "svc-integrations", environment: "staging", observedHealth: "unknown", operationalControl: "running", observedAt: null, sourceId: "src-integrations-summary", summary: "Staging integration provider checks are not wired.", metricLabel: "Coverage", metricValue: "Never reported" },
  { id: "obs-seo-stg", serviceId: "svc-seo-crawler", environment: "staging", observedHealth: "degraded", operationalControl: "running", observedAt: iso(-18), sourceId: "src-jobs-summary", summary: "Crawler fixture indicates slower runs on large sites.", metricLabel: "Oldest job", metricValue: "24 min" },
  { id: "obs-billing-stg", serviceId: "svc-billing", environment: "staging", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-10), sourceId: "src-demo-service", summary: "Staging billing demo monitor fresh.", metricLabel: "Ledger lag", metricValue: "1 min" },
  { id: "obs-api-dev", serviceId: "svc-core-api", environment: "development", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-5), sourceId: "src-api-summary", summary: "Development API is represented by demo fixture only.", metricLabel: "P95 latency", metricValue: "290 ms" },
  { id: "obs-auth-dev", serviceId: "svc-auth", environment: "development", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-6), sourceId: "src-demo-service", summary: "Development auth fixture fresh.", metricLabel: "Session checks", metricValue: "Nominal" },
  { id: "obs-int-dev", serviceId: "svc-integrations", environment: "development", observedHealth: "unknown", operationalControl: "running", observedAt: null, sourceId: "src-integrations-summary", summary: "Provider status checks are not configured for development.", metricLabel: "Coverage", metricValue: "Never reported" },
  { id: "obs-notif-dev", serviceId: "svc-notifications", environment: "development", observedHealth: "healthy", operationalControl: "running", observedAt: iso(-7), sourceId: "src-demo-service", summary: "Development notification fixture fresh.", metricLabel: "Queue depth", metricValue: "8" },
];

export const IMPACTS: ImpactRecord[] = [
  { id: "imp-1", confidence: "confirmed", area: "Meta publishing", companyId: "cmp_namo-gange-trust", companyName: "Namo Gange Trust", clientName: "Namo Gange Wellness", workflow: "Scheduled publishing", evidence: "Failed publishing jobs linked to Meta queue delay.", serviceId: "svc-publishing", incidentId: "inc-2026-021" },
  { id: "imp-2", confidence: "confirmed", area: "SEO audit", companyId: "cmp_blue-harbour-logistics", companyName: "Blue Harbour Logistics", clientName: "Harbour Freight", workflow: "SEO Audit", evidence: "Crawler queue pause prevented new scan starts.", serviceId: "svc-seo-crawler", incidentId: "inc-2026-020" },
  { id: "imp-3", confidence: "potential", area: "Meta insights", companyId: "cmp_meridian-digital", companyName: "Meridian Digital", clientName: "Meridian Studio", workflow: "Reporting", evidence: "Provider source stale; exact account effect is not confirmed.", serviceId: "svc-integrations", incidentId: "inc-2026-021" },
  { id: "imp-4", confidence: "unknown", area: "Google Business sync", companyId: null, companyName: null, clientName: null, workflow: "Integrations", evidence: "Google provider monitoring has never reported in demo data.", serviceId: "svc-integrations", incidentId: null },
];

export const INCIDENTS: IncidentRecord[] = [
  {
    id: "inc-2026-021",
    reference: "INC-2026-021",
    title: "Meta publishing queue delays",
    priority: "high",
    state: "identified",
    primaryServiceId: "svc-publishing",
    affectedServiceIds: ["svc-publishing", "svc-integrations"],
    startedAt: iso(-196),
    detectedAt: iso(-182),
    resolvedAt: null,
    ownerId: "stf_006",
    ownerName: "Tomas Novak",
    summary: "Publishing jobs for Meta-backed clients are delayed. The incident is tracked as a workflow degradation, not provider-wide outage proof.",
    currentFindings: "Queue workers are retrying Meta jobs and integration capability data is stale.",
    recoveryEvidence: "",
    impactIds: ["imp-1", "imp-3"],
    timeline: [
      { id: "tl-021-1", at: iso(-182), actor: "Monitoring fixture", type: "created", note: "Incident opened from demo queue delay observation." },
      { id: "tl-021-2", at: iso(-140), actor: "Tomas Novak", type: "update", note: "Identified retry concentration on Meta publishing queue." },
      { id: "tl-021-3", at: iso(-88), actor: "Tomas Novak", type: "impact_update", note: "Confirmed Namo Gange scheduled posts affected; Meridian impact remains potential." },
    ],
  },
  {
    id: "inc-2026-020",
    reference: "INC-2026-020",
    title: "SEO crawler queue paused for large-site review",
    priority: "medium",
    state: "investigating",
    primaryServiceId: "svc-seo-crawler",
    affectedServiceIds: ["svc-seo-crawler"],
    startedAt: iso(-260),
    detectedAt: iso(-248),
    resolvedAt: null,
    ownerId: "stf_003",
    ownerName: "Manish Sirohi",
    summary: "Crawler starts are paused while a fixture-backed queue backlog is reviewed.",
    currentFindings: "No tenant data has been inspected from this frontend-only workflow.",
    recoveryEvidence: "",
    impactIds: ["imp-2"],
    timeline: [
      { id: "tl-020-1", at: iso(-248), actor: "Monitoring fixture", type: "created", note: "Incident opened after crawler queue became unavailable." },
      { id: "tl-020-2", at: iso(-190), actor: "Manish Sirohi", type: "update", note: "Large-site crawl batch isolated in Jobs & Queues summary." },
    ],
  },
  {
    id: "inc-2026-018",
    reference: "INC-2026-018",
    title: "Billing ledger lag recovered",
    priority: "low",
    state: "resolved",
    primaryServiceId: "svc-billing",
    affectedServiceIds: ["svc-billing"],
    startedAt: days(18),
    detectedAt: days(18),
    resolvedAt: days(18),
    ownerId: "stf_008",
    ownerName: "Marcus Bennett",
    summary: "Historical demo incident retained for activity and availability reporting.",
    currentFindings: "Resolved in demo state.",
    recoveryEvidence: "Fresh billing observation followed after the lag window.",
    impactIds: [],
    timeline: [{ id: "tl-018-1", at: days(18), actor: "Marcus Bennett", type: "resolution", note: "Resolved with demo evidence review." }],
  },
];

export const MAINTENANCE: MaintenanceRecord[] = [
  { id: "mnt-1", title: "Provider capability cache cleanup", state: "scheduled", startsAt: "2026-09-22T18:30:00.000Z", endsAt: "2026-09-22T19:00:00.000Z", owner: "Global Settings", scope: "Integrations read model only", source: "global_settings" },
  { id: "mnt-2", title: "SEO crawler worker review", state: "in_progress", startsAt: "2026-09-21T06:30:00.000Z", endsAt: "2026-09-21T08:30:00.000Z", owner: "Global Settings", scope: "Crawler starts restricted; dashboard access unaffected", source: "global_settings" },
];

export const AVAILABILITY: AvailabilityPoint[] = SERVICE_REGISTRY.flatMap((service, serviceIndex) =>
  Array.from({ length: 14 }, (_, index) => {
    const unknown = service.id === "svc-analytics" && index > 8 ? 1440 : service.id === "svc-integrations" && index === 12 ? 80 : 0;
    const unavailable = service.id === "svc-seo-crawler" && index > 10 ? 120 : 0;
    const degraded = service.id === "svc-publishing" && index > 10 ? 180 : service.id === "svc-integrations" && index > 9 ? 70 : 0;
    const availability = unknown >= 1440 ? null : Number((100 - ((degraded * 0.35 + unavailable) / 1440) * 100 - serviceIndex * 0.02).toFixed(2));
    return { at: days(8 + index), serviceId: service.id, observedAvailability: availability, degradedMinutes: degraded, unavailableMinutes: unavailable, unknownMinutes: unknown };
  }),
);

export const ACTIVITY: HealthActivity[] = [
  { id: "act-1", at: iso(-7), source: "Jobs & Queues Summary", type: "Observation Changed", summary: "Publishing Orchestrator changed to degraded.", serviceId: "svc-publishing", incidentId: "inc-2026-021" },
  { id: "act-2", at: iso(-12), source: "Jobs & Queues Summary", type: "Dependency Became Unavailable", summary: "SEO crawler queue reported unavailable while maintenance review is active.", serviceId: "svc-seo-crawler", incidentId: "inc-2026-020" },
  { id: "act-3", at: iso(-46), source: "Integrations Capability Summary", type: "Monitor Became Stale", summary: "Meta provider summary exceeded freshness threshold.", serviceId: "svc-integrations", incidentId: "inc-2026-021" },
  { id: "act-4", at: iso(-140), source: "Incident Timeline", type: "Incident Updated", summary: "Owner recorded current findings for Meta publishing delays.", serviceId: "svc-publishing", incidentId: "inc-2026-021" },
  { id: "act-5", at: days(18), source: "Incident Timeline", type: "Incident Resolved", summary: "Billing ledger lag demo incident resolved.", serviceId: "svc-billing", incidentId: "inc-2026-018" },
];

export function buildSystemHealthSnapshot(environment: HealthEnvironment): SystemHealthSnapshotV2 {
  return {
    environment,
    timezone: "Asia/Calcutta",
    generatedAt: now.toISOString(),
    sources: MONITORING_SOURCES,
    services: SERVICE_REGISTRY.filter((service) => service.environments.includes(environment)),
    observations: OBSERVATIONS.filter((observation) => observation.environment === environment),
    dependencies: DEPENDENCIES,
    incidents: INCIDENTS,
    impacts: IMPACTS,
    maintenance: MAINTENANCE,
    availability: AVAILABILITY,
    activity: ACTIVITY,
  };
}
