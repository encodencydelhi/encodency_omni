/**
 * Deterministic demo metering: usage events, source status and missing windows.
 *
 * Everything is derived from the company bundles and a stable hash, never from
 * a random number or the wall clock, so a reload shows the same data. The events
 * are built to reconcile: for each company and metered resource, the counted
 * events inside the current billing period sum exactly to the usage total the
 * Companies module reports. Duplicates and failures are extra rows that are
 * flagged as not counted, which is what real ingestion would do.
 */
import { platformNow } from "@/features/companies/data/clock";
import type { CompanyBundle } from "@/features/companies/data/types";
import { RESOURCE_BY_KEY, METERED_RESOURCES } from "../catalogue";
import type { MeteringHealth, MeteringSource, MeteringStatus, ProcessingStatus, ResourceKey, UsageEvent } from "../types";

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

export function hash(text: string): number {
  let value = 5381;
  for (let index = 0; index < text.length; index += 1) value = ((value << 5) + value + text.charCodeAt(index)) | 0;
  return Math.abs(value);
}

const SERVICE: Partial<Record<ResourceKey, { id: string; name: string }>> = {
  aiCredits: { id: "ai-gateway", name: "AI Gateway" },
  automationRuns: { id: "automation-engine", name: "Automation Engine" },
  reports: { id: "report-service", name: "Report Service" },
  apiRequests: { id: "api-gateway", name: "API Gateway" },
  storage: { id: "storage-reconciler", name: "Storage Reconciler" },
};

/** Which resources' clients can be attributed at event level. */
const CLIENT_LEVEL: ReadonlySet<ResourceKey> = new Set(["aiCredits", "automationRuns", "reports"]);

/* ------------------------------------------------------------------ */
/* Sources and gaps                                                    */
/* ------------------------------------------------------------------ */

interface SourceSeed {
  id: string;
  name: string;
  resources: ResourceKey[];
  status: MeteringSource["status"];
  delayMinutes: number;
  expectedEveryMinutes: number;
  failureReason: string | null;
  relatedJob: string | null;
}

const SOURCE_SEEDS: readonly SourceSeed[] = [
  { id: "ai-gateway", name: "AI Gateway", resources: ["aiCredits"], status: "healthy", delayMinutes: 2, expectedEveryMinutes: 5, failureReason: null, relatedJob: null },
  { id: "automation-engine", name: "Automation Engine", resources: ["automationRuns"], status: "healthy", delayMinutes: 3, expectedEveryMinutes: 5, failureReason: null, relatedJob: null },
  { id: "report-service", name: "Report Service", resources: ["reports"], status: "healthy", delayMinutes: 6, expectedEveryMinutes: 15, failureReason: null, relatedJob: null },
  { id: "api-gateway", name: "API Gateway", resources: ["apiRequests"], status: "delayed", delayMinutes: 47, expectedEveryMinutes: 5, failureReason: "Counter roll-up is running behind the ingestion queue.", relatedJob: "metering-rollup-api" },
  { id: "storage-reconciler", name: "Storage Reconciler", resources: ["storage"], status: "failed", delayMinutes: 4320, expectedEveryMinutes: 1440, failureReason: "The reconciliation job timed out reading the media index.", relatedJob: "storage-reconcile-nightly" },
  { id: "record-counter", name: "Record Counter", resources: ["users", "clients", "connectedAccounts", "scheduledPosts"], status: "healthy", delayMinutes: 1, expectedEveryMinutes: 5, failureReason: null, relatedJob: null },
];

/** Companies whose reading for a resource is missing for a stretch. Chosen by hash, so it is stable. */
function gapFor(bundle: CompanyBundle, resource: ResourceKey): boolean {
  const id = bundle.company.id;
  if (resource === "aiCredits") return hash(`${id}:ai-gap`) % 13 === 0;
  if (resource === "automationRuns") return hash(`${id}:auto-gap`) % 19 === 0;
  return false;
}

export function meteringStatusFor(bundle: CompanyBundle, resource: ResourceKey): MeteringStatus {
  if (gapFor(bundle, resource)) return "missing";
  const source = SOURCE_SEEDS.find((item) => item.resources.includes(resource));
  return source && source.status !== "healthy" ? "delayed" : "ok";
}

export function buildMeteringHealth(bundles: readonly CompanyBundle[], now: number = platformNow()): MeteringHealth {
  const gaps = bundles.flatMap((bundle) =>
    (["aiCredits", "automationRuns"] as ResourceKey[])
      .filter((resource) => gapFor(bundle, resource))
      .map((resource) => ({ companyId: bundle.company.id, companyName: bundle.company.name, resource, sinceAt: new Date(now - (2 + (hash(`${bundle.company.id}:${resource}`) % 4)) * DAY_MS).toISOString() })),
  );
  const sources: MeteringSource[] = SOURCE_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    resources: seed.resources,
    status: seed.status,
    lastSuccessAt: new Date(now - seed.delayMinutes * MIN_MS).toISOString(),
    expectedEveryMinutes: seed.expectedEveryMinutes,
    delayMinutes: seed.delayMinutes,
    failureReason: seed.failureReason,
    affectedCompanies: bundles.length,
    relatedJob: seed.relatedJob,
  }));
  const events = buildEvents(bundles, now);
  return {
    healthy: sources.filter((item) => item.status === "healthy").length,
    delayed: sources.filter((item) => item.status === "delayed").length,
    failed: sources.filter((item) => item.status === "failed").length,
    missingWindows: gaps.length,
    duplicates: events.filter((event) => event.status === "duplicate").length,
    lastReconciliationAt: new Date(now - 7 * 60 * MIN_MS).toISOString(),
    sources,
    gaps,
  };
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** Splits `total` into `parts` positive integers that sum exactly to it. */
function split(total: number, parts: number, seed: string): number[] {
  if (total <= 0) return [];
  const count = Math.min(parts, total);
  const weights = Array.from({ length: count }, (_, index) => 1 + (hash(`${seed}:${index}`) % 9));
  const sum = weights.reduce((a, b) => a + b, 0);
  const quantities = weights.map((weight) => Math.max(1, Math.floor((weight / sum) * total)));
  const drift = total - quantities.reduce((a, b) => a + b, 0);
  quantities[quantities.length - 1] = (quantities[quantities.length - 1] ?? 0) + drift;
  return quantities.filter((value) => value > 0);
}

interface Slice {
  label: string;
  start: number;
  end: number;
  total: number;
}

function slicesFor(bundle: CompanyBundle, resource: ResourceKey, used: number, now: number): Slice[] {
  const baseline = bundle.usageBaseline[resource];
  const { subscription } = bundle;
  const periodStart = Date.parse(subscription.status === "trialing" ? subscription.startedAt : subscription.currentPeriodStart);
  const length = Math.max(DAY_MS * 7, Date.parse(subscription.renewsAt) - periodStart);
  const previous = baseline?.previousUsed ?? 0;
  return [
    { label: "current", start: Math.min(periodStart, now - DAY_MS), end: now, total: used },
    { label: "previous", start: periodStart - length, end: periodStart, total: previous },
    { label: "earlier", start: periodStart - 2 * length, end: periodStart - length, total: Math.round(previous * 0.92) },
  ];
}

const STATUS_CYCLE = (n: number): ProcessingStatus => (n % 53 === 7 ? "failed" : n % 41 === 5 ? "duplicate" : "processed");

export function buildEvents(bundles: readonly CompanyBundle[], now: number = platformNow()): UsageEvent[] {
  const events: UsageEvent[] = [];
  for (const bundle of bundles) {
    const companyId = bundle.company.id;
    for (const resource of METERED_RESOURCES) {
      const baseline = bundle.usageBaseline[resource];
      if (!baseline) continue;
      const def = RESOURCE_BY_KEY[resource];
      const service = SERVICE[resource];
      const source = SOURCE_SEEDS.find((item) => item.resources.includes(resource));
      const gap = gapFor(bundle, resource);
      const slices = slicesFor(bundle, resource, baseline.used, now);

      slices.forEach((slice, sliceIndex) => {
        const parts = split(slice.total, sliceIndex === 0 ? 8 : 6, `${companyId}:${resource}:${slice.label}`);
        parts.forEach((quantity, index) => {
          const span = Math.max(MIN_MS, slice.end - slice.start);
          const occurredAt = slice.start + Math.floor(((index + 0.5) / parts.length) * span) - (hash(`${companyId}:${resource}:${slice.label}:t:${index}`) % 3) * 3_600_000;
          // A missing window drops the most recent days of readings for that company and resource.
          if (gap && sliceIndex === 0 && occurredAt > now - 3 * DAY_MS) return;
          const attribute = CLIENT_LEVEL.has(resource) && bundle.clients.length > 0 && hash(`${companyId}:${resource}:${slice.label}:c:${index}`) % 7 !== 0;
          const client = attribute ? bundle.clients[hash(`${companyId}:${resource}:${slice.label}:k:${index}`) % bundle.clients.length] : undefined;
          const delayed = source?.status === "delayed" && sliceIndex === 0 && index === parts.length - 1;
          const n = events.length;
          const id = `evt_${hash(companyId).toString(36)}_${resource}_${slice.label[0]}${index}`;
          const receivedAt = occurredAt + (delayed ? 47 * MIN_MS : 40_000 + (n % 5) * 20_000);
          const status: ProcessingStatus = delayed ? "delayed" : "processed";
          events.push({
            id,
            companyId,
            companyName: bundle.company.name,
            clientId: client?.id ?? null,
            clientName: client?.name ?? null,
            resource,
            quantity,
            unit: def.unit,
            source: service?.name ?? "Metering",
            occurredAt: new Date(occurredAt).toISOString(),
            receivedAt: new Date(receivedAt).toISOString(),
            status,
            reference: `${service?.id ?? "meter"}/${id.slice(-8)}`,
            idempotencyKey: `${companyId}:${resource}:${slice.label}:${index}`,
            aggregationPeriod: slice.label === "current" ? "Current billing period" : slice.label === "previous" ? "Previous billing period" : "Earlier period",
            errorReason: null,
            counted: true,
          });
          // Extra rows: a re-delivered duplicate, and a failed attempt. Neither is counted.
          const extra = STATUS_CYCLE(hash(`${id}:x`) % 200);
          if (extra === "duplicate") {
            events.push({ ...events[events.length - 1]!, id: `${id}_dup`, status: "duplicate", counted: false, receivedAt: new Date(receivedAt + 90_000).toISOString(), errorReason: "Duplicate of an event already counted; ignored by idempotency key." });
          } else if (extra === "failed") {
            events.push({ ...events[events.length - 1]!, id: `${id}_err`, status: "failed", counted: false, errorReason: "The event could not be attributed to a billing period and was rejected.", quantity: Math.max(1, Math.round(quantity / 2)) });
          }
        });
      });
    }
  }
  return events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}
