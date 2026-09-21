/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Deterministic demo dataset.
 *
 * Everything here is a fixture. Nothing was received from a provider, and nothing was delivered to a
 * customer endpoint. Incoming sources derive from the Integrations provider registry so that there is
 * one webhook ownership model, not two.
 */

import { buildInitialIntegrationsDataset } from "@/features/integrations/data/mock/dataset";
import { COMPANY_REFS } from "@/mocks/data/tenants";
import { createRng, type Rng } from "@/mocks/lib/random";
import { DEFAULT_SETTINGS, DEMO_CLOCK_ANCHOR, DEMO_TIMEZONE, MODULE_LINKS, RETRY_POLICIES } from "../config";
import type {
  AttemptResult,
  Delivery,
  DeliveryAttempt,
  DeliveryState,
  EventSubscription,
  FailureClass,
  IncomingEvent,
  IncomingProcessingState,
  IncomingSource,
  OutgoingEndpoint,
  OutgoingEvent,
  OutgoingEventType,
  RecoveryRequest,
  ResourceRef,
  VerificationMethod,
  WebhookActivity,
  WebhookEnvironment,
  WebhooksSnapshot,
} from "../types";
import { checkDestinationUrl } from "../validation";

const ANCHOR = Date.parse(DEMO_CLOCK_ANCHOR);
const isoAgo = (minutes: number): string => new Date(ANCHOR - minutes * 60_000).toISOString();
const isoAt = (ms: number): string => new Date(ms).toISOString();
const ENV_CODE: Record<WebhookEnvironment, string> = { development: "dev", staging: "stg", production: "prd" };
const pad = (n: number, width = 5): string => String(n).padStart(width, "0");

/* ------------------------------------------------------------------ */
/* Event catalogue                                                     */
/* ------------------------------------------------------------------ */

function catalogue(): OutgoingEventType[] {
  return [
    {
      key: "post.published",
      name: "Post Published",
      description: "A scheduled or manual post was accepted by its publishing provider.",
      category: "publishing",
      schemaVersion: "1.2",
      versions: [
        { version: "1.2", lifecycle: "current", backwardCompatible: true, changeNote: "Adds optional scheduledFor." },
        { version: "1.1", lifecycle: "supported", backwardCompatible: true, changeNote: "Adds channel object." },
        { version: "1.0", lifecycle: "deprecated", backwardCompatible: false, changeNote: "Uses legacyChannelCode. Removal requires subscriber migration." },
      ],
      producer: "Content Studio publishing pipeline",
      relatedModule: "Content Studio / Calendar",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "postId", "channel", "status"],
      optionalFields: ["publishedUrl", "scheduledFor", "clientId"],
      deprecatedFields: ["legacyChannelCode"],
      sensitiveFields: [
        { field: "publishedUrl", classification: "operational", handling: "Public post URL. Included." },
        { field: "caption", classification: "business_confidential", handling: "Excluded. Only a length is included." },
      ],
      lastProducedAt: null,
    },
    {
      key: "post.publishing_failed",
      name: "Publishing Failed",
      description: "A post could not be published after the provider rejected or failed the request.",
      category: "publishing",
      schemaVersion: "1.1",
      versions: [
        { version: "1.1", lifecycle: "current", backwardCompatible: true, changeNote: "Adds sanitized reasonCode." },
        { version: "1.0", lifecycle: "supported", backwardCompatible: true, changeNote: "Initial version." },
      ],
      producer: "Content Studio publishing pipeline",
      relatedModule: "Content Studio / Calendar",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "postId", "channel", "reasonCode"],
      optionalFields: ["providerErrorCategory", "retryable"],
      deprecatedFields: [],
      sensitiveFields: [{ field: "providerErrorMessage", classification: "restricted", handling: "Excluded. Only a sanitized reasonCode is included." }],
      lastProducedAt: null,
    },
    {
      key: "campaign.updated",
      name: "Campaign Updated",
      description: "A campaign's schedule, status or channel plan changed.",
      category: "campaigns",
      schemaVersion: "1.0",
      versions: [{ version: "1.0", lifecycle: "current", backwardCompatible: true, changeNote: "Initial version." }],
      producer: "Campaigns service",
      relatedModule: "Campaigns",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "campaignId", "changeType"],
      optionalFields: ["previousStatus", "newStatus", "clientId"],
      deprecatedFields: [],
      sensitiveFields: [{ field: "budget", classification: "business_confidential", handling: "Excluded from the default payload." }],
      lastProducedAt: null,
    },
    {
      key: "campaign.status_changed",
      name: "Campaign Status Changed",
      description: "Superseded by campaign.updated. Kept for existing subscribers only.",
      category: "campaigns",
      schemaVersion: "0.9",
      versions: [{ version: "0.9", lifecycle: "deprecated", backwardCompatible: false, changeNote: "Replaced by campaign.updated 1.0. No new subscriptions." }],
      producer: "Campaigns service",
      relatedModule: "Campaigns",
      audience: "company",
      customerSubscribable: false,
      availability: "deprecated",
      requiredFields: ["eventId", "occurredAt", "companyId", "campaignId", "status"],
      optionalFields: [],
      deprecatedFields: ["status"],
      sensitiveFields: [],
      lastProducedAt: null,
    },
    {
      key: "seo_audit.completed",
      name: "SEO Audit Completed",
      description: "A site audit finished and a summary is available.",
      category: "seo_audits",
      schemaVersion: "1.0",
      versions: [{ version: "1.0", lifecycle: "current", backwardCompatible: true, changeNote: "Initial version." }],
      producer: "SEO audit runner",
      relatedModule: "SEO Audit",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "auditId", "score", "issueCounts"],
      optionalFields: ["previousScore", "clientId"],
      deprecatedFields: [],
      sensitiveFields: [{ field: "crawledUrls", classification: "operational", handling: "Excluded. Only counts are included." }],
      lastProducedAt: null,
    },
    {
      key: "report.generated",
      name: "Report Generated",
      description: "A scheduled or on-demand report finished generating.",
      category: "reports",
      schemaVersion: "1.1",
      versions: [
        { version: "1.1", lifecycle: "current", backwardCompatible: true, changeNote: "Adds reportType." },
        { version: "1.0", lifecycle: "supported", backwardCompatible: true, changeNote: "Initial version." },
      ],
      producer: "Reporting service",
      relatedModule: "Reports",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "reportId", "reportType"],
      optionalFields: ["periodStart", "periodEnd", "clientId"],
      deprecatedFields: [],
      sensitiveFields: [{ field: "downloadUrl", classification: "restricted", handling: "Excluded. Recipients must fetch through an authenticated API." }],
      lastProducedAt: null,
    },
    {
      key: "subscription.updated",
      name: "Subscription Updated",
      description: "A company's plan, status or renewal state changed.",
      category: "billing",
      schemaVersion: "1.0",
      versions: [{ version: "1.0", lifecycle: "current", backwardCompatible: true, changeNote: "Initial version." }],
      producer: "Subscriptions service",
      relatedModule: "Plans & Subscriptions / Billing",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "subscriptionId", "status", "planKey"],
      optionalFields: ["renewalDate", "previousPlanKey"],
      deprecatedFields: [],
      sensitiveFields: [
        { field: "amount", classification: "business_confidential", handling: "Excluded from the default payload." },
        { field: "paymentInstrument", classification: "restricted", handling: "Never included." },
      ],
      lastProducedAt: null,
    },
    {
      key: "integration.reauthorization_required",
      name: "Integration Reauthorization Required",
      description: "A connected provider account needs to be reauthorised.",
      category: "integrations",
      schemaVersion: "1.0",
      versions: [{ version: "1.0", lifecycle: "current", backwardCompatible: true, changeNote: "Initial version." }],
      producer: "Integrations connection monitor",
      relatedModule: "Integrations",
      audience: "company",
      customerSubscribable: true,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "companyId", "providerId", "connectionId", "reason"],
      optionalFields: ["expiresAt"],
      deprecatedFields: [],
      sensitiveFields: [{ field: "accessToken", classification: "restricted", handling: "Never included." }],
      lastProducedAt: null,
    },
    {
      key: "integration.provider_degraded",
      name: "Integration Provider Degraded",
      description: "Platform-wide provider degradation affecting multiple companies.",
      category: "integrations",
      schemaVersion: "1.0",
      versions: [{ version: "1.0", lifecycle: "current", backwardCompatible: true, changeNote: "Initial version." }],
      producer: "Integrations health monitor",
      relatedModule: "Integrations / System Health",
      audience: "platform",
      customerSubscribable: false,
      availability: "available",
      requiredFields: ["eventId", "occurredAt", "providerId", "severity"],
      optionalFields: ["affectedCompanyCount"],
      deprecatedFields: [],
      sensitiveFields: [],
      lastProducedAt: null,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Incoming sources                                                    */
/* ------------------------------------------------------------------ */

interface SourceProfile {
  method: VerificationMethod;
  policyRef: string;
  configured: boolean;
  events: string[];
  mapping: string;
  resource: (n: number) => ResourceRef | null;
  notes: string;
}

const SOURCE_PROFILES: Record<string, SourceProfile> = {
  meta: {
    method: "hmac_signature",
    policyRef: "verification-policy/meta-hmac-v1",
    configured: true,
    events: ["leadgen", "feed.comment", "page.mention"],
    mapping: "Provider page/account ID resolved through Integrations connection mapping",
    resource: (n) => ({ type: "lead", id: `lead_${pad(n, 4)}`, label: "Lead form submission" }),
    notes: "Signature scheme and handshake requirements follow Meta's webhook documentation. To be confirmed at implementation.",
  },
  google_business: {
    method: "provider_signature",
    policyRef: "verification-policy/gbp-provider-v1",
    configured: true,
    events: ["review.created", "review.updated"],
    mapping: "Location resource name resolved through Integrations resource mapping",
    resource: (n) => ({ type: "review", id: `rev_${pad(n, 4)}`, label: "Location review" }),
    notes: "Delivery mechanism and verification depend on the provider's notification channel. To be confirmed at implementation.",
  },
  whatsapp: {
    method: "shared_token",
    policyRef: "verification-policy/aisensy-token-v1",
    configured: true,
    events: ["messages.status", "messages.received", "template.status_update"],
    mapping: "Business number resolved through Integrations connection mapping",
    resource: (n) => ({ type: "message", id: `msg_${pad(n, 5)}`, label: "Outbound message" }),
    notes: "AiSensy verification requirements must be confirmed against provider documentation before implementation.",
  },
  cloudinary: {
    method: "not_defined",
    policyRef: "verification-policy/not-defined",
    configured: false,
    events: ["upload.completed", "asset.moderation_result"],
    mapping: "Cloud name resolved through Integrations configuration",
    resource: (n) => ({ type: "media_asset", id: `asset_${pad(n, 4)}`, label: "Media library asset" }),
    notes: "No verification policy has been defined. Events from this source cannot be treated as authentic.",
  },
};

function buildSources(environment: WebhookEnvironment): IncomingSource[] {
  const { providers, configurations } = buildInitialIntegrationsDataset();
  const wanted: Record<WebhookEnvironment, string[]> = {
    production: ["meta", "google_business", "whatsapp", "cloudinary"],
    staging: ["meta", "whatsapp"],
    development: ["meta"],
  };

  return configurations
    .filter((config) => config.enableWebhooks && wanted[environment].includes(config.providerId))
    .map((config): IncomingSource => {
      const profile = SOURCE_PROFILES[config.providerId] ?? SOURCE_PROFILES.meta!;
      const provider = providers.find((item) => item.id === config.providerId);
      const code = ENV_CODE[environment];
      return {
        id: `wsrc_${config.providerId}_${code}`,
        name: `${provider?.name ?? config.providerId} Events`,
        providerId: config.providerId,
        providerName: provider?.name ?? config.providerId,
        environment,
        receiverId: `rcv_${config.providerId}_${code}`,
        receiverName: `${provider?.name ?? config.providerId} Receiver (${environment})`,
        receiverStatus: "not_connected",
        readiness: profile.configured ? "contract_defined" : "not_implemented",
        configurationState: profile.configured ? "configured" : "draft",
        verificationMethod: profile.method,
        verificationPolicyRef: profile.policyRef,
        verificationConfigured: profile.configured,
        supportedEventTypes: profile.events,
        accountMappingStrategy: profile.mapping,
        dedupStrategyRef: `dedup-policy/${config.providerId}-provider-event-id-v1`,
        queueRef: `queue/webhook-processing/${config.providerId}`,
        integrationHref: MODULE_LINKS.provider(config.providerId),
        notes: profile.notes,
      };
    });
}

/* ------------------------------------------------------------------ */
/* Incoming events                                                     */
/* ------------------------------------------------------------------ */

const COMPANY_POOL = [
  "cmp_namo-gange-trust",
  "cmp_meridian-digital",
  "cmp_blue-harbour-logistics",
  "cmp_cobalt-fintech",
  "cmp_vantage-realty",
  "cmp_amberline-cosmetics",
  "cmp_kaveri-institute",
  "cmp_nordwind-studios",
];

function companyName(id: string | null): string | null {
  if (!id) return null;
  return COMPANY_REFS.find((company) => company.id === id)?.name ?? id;
}

type IncomingScenario =
  | "normal"
  | "duplicate"
  | "similar"
  | "unmapped"
  | "handler_error"
  | "unsupported"
  | "sig_rejected"
  | "pending"
  | "queued"
  | "processing";

function buildIncomingEvents(environment: WebhookEnvironment, sources: IncomingSource[], rng: Rng): IncomingEvent[] {
  const code = ENV_CODE[environment];
  const total = environment === "production" ? 72 : environment === "staging" ? 26 : 12;

  const ages: number[] = Array.from({ length: total }, (_, i) => {
    if (i < 7) return rng.int(2, 55);
    if (i < Math.round(total * 0.4)) return rng.int(60, 1_380);
    if (i < Math.round(total * 0.7)) return rng.int(1_440, 9_900);
    return rng.int(10_080, 42_000);
  });
  ages.sort((a, b) => b - a); // oldest first, so duplicates can reference earlier events

  const events: IncomingEvent[] = [];
  const lastNormalBySource = new Map<string, IncomingEvent>();

  ages.forEach((age, index) => {
    const n = index + 1;
    const source = sources[index % sources.length]!;
    const profile = SOURCE_PROFILES[source.providerId] ?? SOURCE_PROFILES.meta!;
    const recent = age < 60;

    let scenario: IncomingScenario;
    if (!source.verificationConfigured) scenario = "pending";
    else if (recent && age < 6) scenario = "processing";
    else if (recent && age < 20) scenario = "queued";
    else {
      scenario = rng.weighted<IncomingScenario>({
        normal: 66,
        duplicate: 7,
        similar: 4,
        unmapped: 6,
        handler_error: 6,
        unsupported: 3,
        sig_rejected: 5,
        pending: 0,
        queued: 0,
        processing: 0,
      });
      if (scenario === "duplicate" && !lastNormalBySource.has(source.id)) scenario = "normal";
    }

    const companyId = scenario === "unmapped" ? null : rng.pick(COMPANY_POOL);
    const eventType = scenario === "unsupported" ? "legacy.unrecognised_topic" : rng.pick(profile.events);
    const receivedAtMs = ANCHOR - age * 60_000;
    const original = scenario === "duplicate" ? lastNormalBySource.get(source.id) : undefined;
    const providerEventId = original ? original.dedup.providerEventId : `pev_${source.providerId}_${1000 + n * 7}`;
    const id = `iev_${code}_${pad(n)}`;

    const verificationState =
      scenario === "sig_rejected" ? "rejected" : scenario === "pending" ? (source.verificationConfigured ? "pending" : "unavailable") : "verified";

    const verified = verificationState === "verified";
    const processingState: IncomingProcessingState =
      scenario === "sig_rejected"
        ? "rejected"
        : scenario === "pending"
          ? "received"
          : scenario === "queued"
            ? "queued"
            : scenario === "processing"
              ? "processing"
              : scenario === "duplicate"
                ? "ignored_duplicate"
                : scenario === "unmapped" || scenario === "handler_error" || scenario === "unsupported"
                  ? "failed"
                  : "processed";

    const errorMap: Partial<Record<IncomingScenario, [string, string]>> = {
      unmapped: ["account_mapping_missing", "No connected account mapping matches this provider account. Review the Integrations resource mapping."],
      handler_error: ["downstream_write_timeout", "The downstream business-resource update timed out after 3 processing attempts."],
      unsupported: ["unsupported_event_type", "The event type is not in the source's supported event list."],
    };
    const error = errorMap[scenario];
    const started = processingState === "received" || processingState === "rejected" || processingState === "queued" ? null : isoAt(receivedAtMs + 2_000);
    const finished = ["processed", "failed", "ignored_duplicate"].includes(processingState) ? isoAt(receivedAtMs + rng.int(3, 40) * 1_000) : null;

    const event: IncomingEvent = {
      id,
      environment,
      sourceId: source.id,
      providerId: source.providerId,
      providerName: source.providerName,
      providerEventRef: providerEventId,
      eventType,
      receivedAt: isoAt(receivedAtMs),
      companyId,
      companyName: companyName(companyId),
      accountRef: companyId ? `acct_${source.providerId}_${1200 + (n % 9) * 13}` : null,
      accountMapping: scenario === "unmapped" ? "unmapped" : scenario === "sig_rejected" || scenario === "pending" ? "not_applicable" : "mapped",
      verification: {
        state: verificationState,
        method: source.verificationMethod,
        recordedAt: verificationState === "pending" || verificationState === "unavailable" ? null : isoAt(receivedAtMs + 400),
        failureReason:
          verificationState === "rejected"
            ? "The signature did not match the value expected by the verification policy (demo record)."
            : verificationState === "unavailable"
              ? "No verification policy is defined for this source, so authenticity cannot be established."
              : null,
        signatureHeaderPresent: source.verificationMethod === "not_defined" ? null : verificationState !== "rejected" || n % 2 === 0,
        timestampCheck: source.verificationMethod === "hmac_signature" ? (verificationState === "rejected" ? "not_recorded" : "passed") : "not_applicable",
        replayWindowCheck: source.verificationMethod === "hmac_signature" ? (verificationState === "rejected" ? "not_recorded" : "passed") : "not_applicable",
        policyRef: source.verificationPolicyRef,
        evidence: "demo_fixture",
      },
      processing: {
        recordId: `ipr_${code}_${pad(n)}`,
        state: processingState,
        queueRef: source.queueRef,
        jobId: verified && processingState !== "ignored_duplicate" && processingState !== "received" ? `job_wh_${code}_${pad(n)}` : null,
        attemptsUsed: processingState === "failed" ? 3 : processingState === "processed" ? (n % 11 === 0 ? 2 : 1) : processingState === "processing" ? 1 : 0,
        startedAt: started,
        completedAt: finished,
        errorCode: error?.[0] ?? null,
        errorSummary: error?.[1] ?? null,
        resourceUpdate:
          processingState === "processed" ? "applied" : processingState === "failed" ? (scenario === "handler_error" ? "partial" : "not_applied") : "not_attempted",
        receiptHttpStatus: scenario === "sig_rejected" ? 401 : 200,
      },
      dedup: {
        providerEventId,
        keyRef: `dedup:${source.providerId}:${providerEventId}`,
        firstSeenAt: original ? original.receivedAt : isoAt(receivedAtMs),
        occurrenceCount: original ? 2 : 1,
        originalEventId: original ? original.id : null,
        result: scenario === "duplicate" ? "duplicate_http_delivery" : scenario === "similar" ? "similar_new_event" : "unique",
        note:
          scenario === "duplicate"
            ? "Same provider event ID delivered again over HTTP. Treated as a duplicate delivery."
            : scenario === "similar"
              ? "Payload resembles a recent event but the provider event ID differs. Processed as a distinct event."
              : "First occurrence of this provider event ID.",
      },
      relatedResource: verified && processingState !== "ignored_duplicate" ? profile.resource(n) : null,
      technical: {
        receiverId: source.receiverId,
        requestId: `req_${code}_in_${pad(n)}`,
        correlationId: n % 4 === 0 ? `corr_in_${code}_${pad(n)}` : null,
        safeHeaders: {
          "content-type": "application/json",
          "user-agent": "[provider user agent, redacted]",
          "signature-header-present": String(source.verificationMethod !== "not_defined"),
        },
        sanitizedPayloadSummary: { objectType: source.providerId, fieldCount: 6 + (n % 9), containsPersonalData: "redacted", sanitized: true },
        payloadSchemaVersion: "provider-v1",
      },
    };

    events.push(event);
    if (scenario === "normal") lastNormalBySource.set(source.id, event);
  });

  return events.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/* ------------------------------------------------------------------ */
/* Outgoing endpoints & subscriptions                                  */
/* ------------------------------------------------------------------ */

interface EndpointSpec {
  id: string;
  name: string;
  description: string;
  companyId: string | null;
  url: string;
  state: OutgoingEndpoint["state"];
  events: string[];
  signing: OutgoingEndpoint["signing"];
  policyRef: string;
  timeoutMs: number;
  privacy: OutgoingEndpoint["policy"]["payloadPrivacy"];
  createdDaysAgo: number;
  envs: WebhookEnvironment[];
  contact: string | null;
  review: { lastDaysAgo: number | null };
}

const SIGNED = (version: string, rotatedDaysAgo: number, review: OutgoingEndpoint["signing"]["reviewStatus"]): OutgoingEndpoint["signing"] => ({
  method: "hmac_sha256",
  state: "configured_reference",
  secretVersionRef: `kms-ref/webhook-signing/${version}`,
  lastRotationAt: isoAgo(rotatedDaysAgo * 1_440),
  reviewStatus: review,
});
const DEMO_SIGNED: OutgoingEndpoint["signing"] = {
  method: "hmac_sha256",
  state: "demo_reference",
  secretVersionRef: "demo-ref/not-a-real-secret",
  lastRotationAt: null,
  reviewStatus: "not_reviewed",
};
const UNSIGNED: OutgoingEndpoint["signing"] = { method: "none", state: "not_configured", secretVersionRef: null, lastRotationAt: null, reviewStatus: "action_required" };

const ENDPOINT_SPECS: EndpointSpec[] = [
  { id: "wep_001", name: "Namo Gange - CMS Publish Hook", description: "Mirrors published posts into the trust's own CMS.", companyId: "cmp_namo-gange-trust", url: "https://hooks.namogange.org/omniplatform/events", state: "enabled", events: ["post.published", "post.publishing_failed", "campaign.updated"], signing: SIGNED("v3", 41, "reviewed"), policyRef: "retry-policy/standard-v1", timeoutMs: 10_000, privacy: "operational", createdDaysAgo: 96, envs: ["development", "staging", "production"], contact: "web-team@namogange.org", review: { lastDaysAgo: 41 } },
  { id: "wep_002", name: "Meridian Digital - Client Reporting Sync", description: "Feeds finished reports and audits into the agency's client portal.", companyId: "cmp_meridian-digital", url: "https://api.meridiandigital.co.uk/webhooks/omniplatform", state: "enabled", events: ["report.generated", "seo_audit.completed", "campaign.updated", "post.published"], signing: SIGNED("v2", 118, "review_due"), policyRef: "retry-policy/standard-v1", timeoutMs: 8_000, privacy: "business_confidential", createdDaysAgo: 143, envs: ["staging", "production"], contact: "platform@meridiandigital.co.uk", review: { lastDaysAgo: 118 } },
  { id: "wep_003", name: "Blue Harbour - Billing Notifications", description: "Pushes subscription changes into the customer's ERP inbox.", companyId: "cmp_blue-harbour-logistics", url: "https://erp.blueharbour.sg/inbound/omniplatform", state: "enabled", events: ["subscription.updated"], signing: UNSIGNED, policyRef: "retry-policy/conservative-v1", timeoutMs: 5_000, privacy: "business_confidential", createdDaysAgo: 61, envs: ["production"], contact: null, review: { lastDaysAgo: null } },
  { id: "wep_004", name: "Cobalt Fintech - Compliance Archive", description: "Archives report and publishing events for compliance retention.", companyId: "cmp_cobalt-fintech", url: "https://compliance.cobaltfintech.io/hooks/omniplatform", state: "enabled", events: ["report.generated", "post.published"], signing: SIGNED("v4", 12, "reviewed"), policyRef: "retry-policy/standard-v1", timeoutMs: 10_000, privacy: "business_confidential", createdDaysAgo: 210, envs: ["staging", "production"], contact: "secops@cobaltfintech.io", review: { lastDaysAgo: 12 } },
  { id: "wep_005", name: "Platform - Ops Alert Relay", description: "Relays platform-level integration events to the operations chat bridge.", companyId: null, url: "https://ops-relay.encodency.com/hooks/platform", state: "enabled", events: ["integration.provider_degraded", "integration.reauthorization_required", "subscription.updated"], signing: SIGNED("v1", 29, "reviewed"), policyRef: "retry-policy/standard-v1", timeoutMs: 6_000, privacy: "operational", createdDaysAgo: 180, envs: ["development", "staging", "production"], contact: "platform-ops@encodency.com", review: { lastDaysAgo: 29 } },
  { id: "wep_006", name: "Vantage Realty - Listing Publisher", description: "Disabled while the customer migrates their listing site.", companyId: "cmp_vantage-realty", url: "https://vantagerealty.com/api/hooks/omniplatform", state: "disabled", events: ["post.published"], signing: DEMO_SIGNED, policyRef: "retry-policy/standard-v1", timeoutMs: 10_000, privacy: "operational", createdDaysAgo: 75, envs: ["production"], contact: "dev@vantagerealty.com", review: { lastDaysAgo: null } },
  { id: "wep_007", name: "Amberline - Campaign Tracker", description: "Tracks campaign changes in the brand's planning tool.", companyId: "cmp_amberline-cosmetics", url: "https://hooks.amberline.fr/omniplatform/campaigns", state: "enabled", events: ["campaign.updated", "campaign.status_changed"], signing: SIGNED("v1", 205, "review_due"), policyRef: "retry-policy/standard-v1", timeoutMs: 10_000, privacy: "operational", createdDaysAgo: 230, envs: ["production"], contact: "it@amberline.fr", review: { lastDaysAgo: 205 } },
  { id: "wep_008", name: "Kaveri - Admissions SEO Feed", description: "Suspended after repeated TLS failures.", companyId: "cmp_kaveri-institute", url: "https://kaveri.edu.in/hooks/seo", state: "suspended", events: ["seo_audit.completed"], signing: DEMO_SIGNED, policyRef: "retry-policy/standard-v1", timeoutMs: 10_000, privacy: "operational", createdDaysAgo: 54, envs: ["production"], contact: null, review: { lastDaysAgo: null } },
  { id: "wep_009", name: "Nordwind - Draft Endpoint", description: "Draft. Not yet enabled.", companyId: "cmp_nordwind-studios", url: "https://nordwind.de/hooks/omniplatform", state: "draft", events: ["post.published"], signing: UNSIGNED, policyRef: "retry-policy/no-retry-v1", timeoutMs: 10_000, privacy: "operational", createdDaysAgo: 3, envs: ["staging", "production"], contact: null, review: { lastDaysAgo: null } },
];

function buildEndpoints(environment: WebhookEnvironment): { endpoints: OutgoingEndpoint[]; subscriptions: EventSubscription[] } {
  const specs = ENDPOINT_SPECS.filter((spec) => spec.envs.includes(environment));
  const hostPrefix = environment === "production" ? "" : environment === "staging" ? "staging." : "dev.";
  const endpoints: OutgoingEndpoint[] = [];
  const subscriptions: EventSubscription[] = [];

  specs.forEach((spec) => {
    const withHost = spec.url.replace("://", `://${hostPrefix}`);
    const check = checkDestinationUrl(withHost, environment);
    const created = isoAgo(spec.createdDaysAgo * 1_440);
    endpoints.push({
      id: spec.id,
      name: spec.name,
      description: spec.description,
      environment,
      ownerScope: spec.companyId ? "company" : "platform",
      companyId: spec.companyId,
      companyName: companyName(spec.companyId),
      destinationUrl: check.sanitizedUrl ?? withHost,
      destinationHost: check.host ?? "unknown",
      hadQueryString: false,
      state: spec.state,
      signing: spec.signing,
      policy: {
        timeoutMs: spec.timeoutMs,
        retryPolicyRef: spec.policyRef,
        maxAttempts: RETRY_POLICIES.find((policy) => policy.ref === spec.policyRef)?.maxAttempts ?? 5,
        schemaVersion: "latest-compatible",
        payloadPrivacy: spec.privacy,
      },
      allowedAudience: spec.companyId ? "Company-scoped events for the owning company only" : "Platform and cross-company operational events",
      contactRef: spec.contact,
      security: {
        httpsState: check.scheme,
        urlValidationState: check.ok ? (check.warnings.length ? "warnings" : "passed_preliminary") : "failed",
        lastSecurityReviewAt: spec.review.lastDaysAgo === null ? null : isoAgo(spec.review.lastDaysAgo * 1_440),
      },
      createdAt: created,
      updatedAt: isoAgo(Math.max(1, Math.round(spec.createdDaysAgo / 3)) * 1_440),
      demoCreated: false,
    });

    spec.events.forEach((key, index) => {
      subscriptions.push({
        id: `wsb_${spec.id.slice(4)}_${index + 1}`,
        endpointId: spec.id,
        eventKey: key,
        schemaVersion: key === "post.published" ? "1.2" : key === "post.publishing_failed" ? "1.1" : key === "report.generated" ? "1.1" : key === "campaign.status_changed" ? "0.9" : "1.0",
        state: spec.state === "draft" ? "pending_review" : "active",
        createdAt: isoAgo((spec.createdDaysAgo - index) * 1_440),
        updatedAt: isoAgo(Math.max(1, Math.round(spec.createdDaysAgo / 4)) * 1_440),
      });
    });
  });

  return { endpoints, subscriptions };
}

/* ------------------------------------------------------------------ */
/* Deliveries                                                          */
/* ------------------------------------------------------------------ */

type ScenarioId =
  | "delivered"
  | "retry_delivered"
  | "retry_5xx_scheduled"
  | "exhausted_5xx"
  | "timeout_scheduled"
  | "timeout_unknown"
  | "r429_scheduled"
  | "r429_delivered"
  | "conn_scheduled"
  | "gone"
  | "perm_4xx"
  | "tls_failed"
  | "invalid_config"
  | "attempting"
  | "pending"
  | "cancelled";

interface AttemptSpec {
  status: number | null;
  result: AttemptResult | null;
  cls: FailureClass | null;
  summary: string;
  durationMs: number | null;
  retryAfter?: number;
}

const ATTEMPT = {
  ok: (ms = 220): AttemptSpec => ({ status: 200, result: "succeeded", cls: null, summary: "Endpoint returned HTTP 200. This confirms receipt only, not downstream processing.", durationMs: ms }),
  s503: (ms = 1_400): AttemptSpec => ({ status: 503, result: "failed", cls: "http_5xx", summary: "Destination returned HTTP 503 Service Unavailable.", durationMs: ms }),
  s502: (ms = 900): AttemptSpec => ({ status: 502, result: "failed", cls: "http_5xx", summary: "Destination returned HTTP 502 Bad Gateway.", durationMs: ms }),
  timeout: (ms: number): AttemptSpec => ({ status: null, result: "timed_out", cls: "timeout", summary: `No response within the ${ms} ms timeout. The destination may still have accepted the event.`, durationMs: ms }),
  conn: (): AttemptSpec => ({ status: null, result: "failed", cls: "connection_failure", summary: "Connection refused by the destination host.", durationMs: 140 }),
  tls: (): AttemptSpec => ({ status: null, result: "failed", cls: "dns_tls_failure", summary: "TLS handshake failed: certificate does not match the destination host.", durationMs: 310 }),
  r429: (): AttemptSpec => ({ status: 429, result: "failed", cls: "http_429", summary: "Destination returned HTTP 429 Too Many Requests.", durationMs: 180, retryAfter: 120 }),
  gone: (): AttemptSpec => ({ status: 410, result: "rejected", cls: "endpoint_gone", summary: "Destination returned HTTP 410 Gone.", durationMs: 160 }),
  r401: (): AttemptSpec => ({ status: 401, result: "rejected", cls: "http_4xx_permanent", summary: "Destination returned HTTP 401 Unauthorized. The recipient rejected the request.", durationMs: 150 }),
  invalid: (): AttemptSpec => ({ status: null, result: "rejected", cls: "invalid_endpoint_configuration", summary: "The request was not sent: the destination failed configuration checks at send time.", durationMs: null }),
  inflight: (): AttemptSpec => ({ status: null, result: null, cls: null, summary: "Attempt in progress. No result recorded yet.", durationMs: null }),
};

/** Minutes after creation at which attempt n starts. The gap to the next entry is the backoff. */
const BACKOFF_OFFSETS_MIN = [0, 2, 12, 42, 162];

interface Slot {
  endpointId: string;
  eventKey: string;
  ageMin: number;
  scenario: ScenarioId | null;
  companyId?: string | null;
}

const FORCED_SLOTS: Array<Slot & { envs: WebhookEnvironment[] }> = [
  { endpointId: "wep_001", eventKey: "post.published", ageMin: 2, scenario: "attempting", envs: ["production", "staging", "development"] },
  { endpointId: "wep_002", eventKey: "campaign.updated", ageMin: 1, scenario: "pending", envs: ["production", "staging"] },
  { endpointId: "wep_002", eventKey: "post.published", ageMin: 9, scenario: "retry_5xx_scheduled", envs: ["production", "staging"] },
  { endpointId: "wep_004", eventKey: "report.generated", ageMin: 25, scenario: "r429_scheduled", envs: ["production", "staging"] },
  { endpointId: "wep_003", eventKey: "subscription.updated", ageMin: 8, scenario: "timeout_scheduled", envs: ["production"] },
  { endpointId: "wep_003", eventKey: "subscription.updated", ageMin: 700, scenario: "timeout_unknown", envs: ["production"] },
  { endpointId: "wep_007", eventKey: "campaign.updated", ageMin: 300, scenario: "gone", envs: ["production"] },
  { endpointId: "wep_007", eventKey: "campaign.updated", ageMin: 900, scenario: "gone", envs: ["production"] },
  { endpointId: "wep_001", eventKey: "post.publishing_failed", ageMin: 1_600, scenario: "perm_4xx", envs: ["production", "staging", "development"] },
  { endpointId: "wep_008", eventKey: "seo_audit.completed", ageMin: 500, scenario: "tls_failed", envs: ["production"] },
  { endpointId: "wep_008", eventKey: "seo_audit.completed", ageMin: 800, scenario: "invalid_config", envs: ["production"] },
  { endpointId: "wep_002", eventKey: "report.generated", ageMin: 3_000, scenario: "exhausted_5xx", envs: ["production", "staging"] },
  { endpointId: "wep_002", eventKey: "seo_audit.completed", ageMin: 5_200, scenario: "exhausted_5xx", envs: ["production", "staging"] },
  { endpointId: "wep_004", eventKey: "report.generated", ageMin: 4_000, scenario: "r429_delivered", envs: ["production", "staging"] },
  { endpointId: "wep_006", eventKey: "post.published", ageMin: 20, scenario: "cancelled", envs: ["production"] },
  { endpointId: "wep_006", eventKey: "post.published", ageMin: 45, scenario: "cancelled", envs: ["production"] },
  { endpointId: "wep_005", eventKey: "integration.provider_degraded", ageMin: 10, scenario: "conn_scheduled", envs: ["production", "staging", "development"] },
  { endpointId: "wep_005", eventKey: "integration.provider_degraded", ageMin: 340, scenario: "delivered", envs: ["production", "staging", "development"] },
  { endpointId: "wep_003", eventKey: "subscription.updated", ageMin: 2_400, scenario: "retry_delivered", envs: ["production"] },
];

const PRODUCED: Record<string, string> = {};

function buildOutgoing(
  environment: WebhookEnvironment,
  endpoints: OutgoingEndpoint[],
  subscriptions: EventSubscription[],
  rng: Rng,
): { events: OutgoingEvent[]; deliveries: Delivery[]; attempts: DeliveryAttempt[] } {
  const code = ENV_CODE[environment];
  const slots: Slot[] = FORCED_SLOTS.filter((slot) => slot.envs.includes(environment) && endpoints.some((endpoint) => endpoint.id === slot.endpointId));

  const generic = environment === "production" ? 38 : environment === "staging" ? 14 : 6;
  const activeEndpoints = endpoints.filter((endpoint) => endpoint.state === "enabled");
  for (let i = 0; i < generic; i += 1) {
    const endpoint = rng.pick(activeEndpoints);
    const keys = subscriptions.filter((sub) => sub.endpointId === endpoint.id && sub.eventKey !== "campaign.status_changed").map((sub) => sub.eventKey);
    if (!keys.length) continue;
    const age = i < 4 ? rng.int(65, 1_300) : i < 18 ? rng.int(200, 9_000) : rng.int(10_080, 42_000);
    slots.push({ endpointId: endpoint.id, eventKey: rng.pick(keys), ageMin: age, scenario: null });
  }
  slots.sort((a, b) => b.ageMin - a.ageMin);

  const eventIndex = new Map<string, OutgoingEvent>();
  const events: OutgoingEvent[] = [];
  const deliveries: Delivery[] = [];
  const attempts: DeliveryAttempt[] = [];
  let deliverySeq = 0;

  slots.forEach((slot, slotIndex) => {
    const sourceEndpoint = endpoints.find((endpoint) => endpoint.id === slot.endpointId)!;
    const eventDef = catalogue().find((type) => type.key === slot.eventKey)!;
    const companyId = eventDef.audience === "platform" ? null : sourceEndpoint.companyId ?? rng.pick(COMPANY_POOL);
    const occurredMs = ANCHOR - slot.ageMin * 60_000;
    const eventId = `oev_${code}_${pad(slotIndex + 1)}`;
    const event: OutgoingEvent = {
      id: eventId,
      environment,
      eventKey: slot.eventKey,
      schemaVersion: eventDef.schemaVersion,
      occurredAt: isoAt(occurredMs),
      companyId,
      companyName: companyName(companyId),
      scope: eventDef.audience,
      payloadSummary: `${eventDef.name}${companyId ? ` for ${companyName(companyId)}` : " (platform)"}`,
      resourceRefs: [{ type: eventDef.category, id: `${eventDef.category}_${pad(slotIndex + 1, 4)}`, label: eventDef.name }],
      redactedFields: eventDef.sensitiveFields.map((field) => field.field),
      payloadSizeBytes: 620 + (slotIndex % 9) * 84,
      sanitizedPreview: {
        eventId,
        eventType: slot.eventKey,
        schemaVersion: eventDef.schemaVersion,
        occurredAt: isoAt(occurredMs),
        companyId,
        resourceId: `${eventDef.category}_${pad(slotIndex + 1, 4)}`,
        redacted: true,
      },
    };
    events.push(event);
    eventIndex.set(eventId, event);
    PRODUCED[`${environment}:${slot.eventKey}`] = PRODUCED[`${environment}:${slot.eventKey}`] && PRODUCED[`${environment}:${slot.eventKey}`]! > event.occurredAt ? PRODUCED[`${environment}:${slot.eventKey}`]! : event.occurredAt;

    // Every active subscription whose scope allows this event receives its own delivery.
    const targets = subscriptions
      .filter((sub) => sub.eventKey === slot.eventKey && sub.state !== "paused")
      .map((sub) => endpoints.find((endpoint) => endpoint.id === sub.endpointId)!)
      .filter((endpoint) => endpoint.state !== "draft")
      .filter((endpoint) => endpoint.ownerScope === "platform" || endpoint.companyId === companyId);

    targets.forEach((endpoint) => {
      deliverySeq += 1;
      const isForcedTarget = endpoint.id === slot.endpointId;
      const scenario: ScenarioId =
        isForcedTarget && slot.scenario
          ? slot.scenario
          : endpoint.state === "disabled" || endpoint.state === "suspended"
            ? "cancelled"
            : rng.weighted<ScenarioId>({
              delivered: endpoint.id === "wep_002" ? 68 : 84,
              retry_delivered: 16,
              retry_5xx_scheduled: 0, exhausted_5xx: 0, timeout_scheduled: 0, timeout_unknown: 0, r429_scheduled: 0,
              r429_delivered: 0, conn_scheduled: 0, gone: 0, perm_4xx: 0, tls_failed: 0, invalid_config: 0,
              attempting: 0, pending: 0, cancelled: 0,
            });

      const built = buildDelivery({ environment, seq: deliverySeq, event, endpoint, scenario, rng });
      deliveries.push(built.delivery);
      attempts.push(...built.attempts);
    });
  });

  return { events: events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), deliveries, attempts };
}

function buildDelivery(input: {
  environment: WebhookEnvironment;
  seq: number;
  event: OutgoingEvent;
  endpoint: OutgoingEndpoint;
  scenario: ScenarioId;
  rng: Rng;
}): { delivery: Delivery; attempts: DeliveryAttempt[] } {
  const { environment, seq, event, endpoint, scenario, rng } = input;
  const code = ENV_CODE[environment];
  const id = `dlv_${code}_${pad(seq)}`;
  const createdMs = Date.parse(event.occurredAt) + rng.int(2, 18) * 1_000;
  const timeout = endpoint.policy.timeoutMs;
  const max = endpoint.policy.maxAttempts;

  let specs: AttemptSpec[];
  let state: DeliveryState;
  let nextRetryOffset: number | null = null;
  let unknownOutcome = false;
  let finalClass: FailureClass | null = null;

  switch (scenario) {
    case "delivered": specs = [ATTEMPT.ok(rng.int(120, 640))]; state = "delivered"; break;
    case "retry_delivered": specs = [ATTEMPT.s503(), ATTEMPT.ok(rng.int(120, 500))]; state = "delivered"; break;
    case "r429_delivered": specs = [ATTEMPT.r429(), ATTEMPT.ok()]; state = "delivered"; break;
    case "retry_5xx_scheduled": specs = [ATTEMPT.s503(), ATTEMPT.s502()]; state = "retry_scheduled"; break;
    case "r429_scheduled": specs = [ATTEMPT.r429(), ATTEMPT.r429(), ATTEMPT.r429()]; state = "retry_scheduled"; break;
    case "timeout_scheduled": specs = [ATTEMPT.timeout(timeout), ATTEMPT.timeout(timeout)]; state = "retry_scheduled"; unknownOutcome = true; break;
    case "conn_scheduled": specs = [ATTEMPT.conn(), ATTEMPT.conn()]; state = "retry_scheduled"; break;
    case "exhausted_5xx": specs = Array.from({ length: max }, (_, i) => (i % 2 ? ATTEMPT.s502() : ATTEMPT.s503())); state = "failed"; finalClass = "attempts_exhausted"; break;
    case "timeout_unknown": specs = [ATTEMPT.timeout(timeout)]; state = "failed"; unknownOutcome = true; finalClass = "unknown_external_outcome"; break;
    case "gone": specs = [ATTEMPT.gone()]; state = "failed"; break;
    case "perm_4xx": specs = [ATTEMPT.r401()]; state = "failed"; break;
    case "tls_failed": specs = [ATTEMPT.tls(), ATTEMPT.tls()]; state = "failed"; break;
    case "invalid_config": specs = [ATTEMPT.invalid()]; state = "failed"; break;
    case "attempting": specs = [ATTEMPT.inflight()]; state = "attempting"; break;
    case "pending": specs = []; state = "pending"; break;
    case "cancelled": specs = []; state = "cancelled"; break;
  }

  // A scheduled retry always has an attempt left, and its backoff slot follows the attempts already made.
  if (state === "retry_scheduled") {
    specs = specs.slice(0, Math.max(1, max - 1));
    nextRetryOffset = BACKOFF_OFFSETS_MIN[specs.length] ?? null;
  }

  const attempts: DeliveryAttempt[] = specs.map((spec, index) => {
    const startedMs = createdMs + (BACKOFF_OFFSETS_MIN[index] ?? 0) * 60_000 + 3_000;
    const completedMs = spec.durationMs === null ? null : startedMs + spec.durationMs;
    return {
      id: `att_${code}_${pad(seq)}_${index + 1}`,
      deliveryId: id,
      number: index + 1,
      startedAt: isoAt(startedMs),
      completedAt: completedMs === null ? null : isoAt(completedMs),
      durationMs: spec.durationMs,
      httpMethod: "POST",
      destinationHost: endpoint.destinationHost,
      httpStatus: spec.status,
      result: spec.result,
      failureClass: spec.cls,
      responseSummary: spec.summary,
      retryAfterSeconds: spec.retryAfter ?? null,
      workerJobRef: `job_dlv_${code}_${pad(seq)}_${index + 1}`,
      apiRequestRef: spec.status === null ? null : `req_${code}_out_${pad(seq)}_${index + 1}`,
    };
  });

  const last = attempts[attempts.length - 1] ?? null;
  const lastStartMs = last ? Date.parse(last.startedAt) : null;
  const nextRetryAt =
    state === "retry_scheduled" && lastStartMs !== null && nextRetryOffset !== null
      ? isoAt(createdMs + nextRetryOffset * 60_000 + 3_000)
      : null;
  const failureClass = state === "delivered" || state === "cancelled" || state === "pending" || state === "attempting" ? null : finalClass ?? last?.failureClass ?? null;

  const failureSummary =
    state === "cancelled"
      ? `Cancelled: the endpoint is ${endpoint.state}. No delivery was attempted.`
      : failureClass
        ? last?.responseSummary ?? null
        : null;

  return {
    delivery: {
      id,
      environment,
      eventId: event.id,
      eventKey: event.eventKey,
      endpointId: endpoint.id,
      companyId: event.companyId,
      companyName: event.companyName,
      state,
      createdAt: isoAt(createdMs),
      attemptsUsed: attempts.length,
      maxAttempts: max,
      latestAttemptAt: last ? last.completedAt ?? last.startedAt : null,
      nextRetryAt,
      latestHttpStatus: last?.httpStatus ?? null,
      latestResult: last?.result ?? null,
      latestFailureClass: failureClass,
      failureSummary,
      unknownOutcome,
      retryPolicyRef: endpoint.policy.retryPolicyRef,
      signingVersionRef: endpoint.signing.secretVersionRef,
      relatedJobId: state === "cancelled" || state === "pending" ? null : `job_dlv_${code}_${pad(seq)}`,
      relatedApiRequestRef: last?.apiRequestRef ?? null,
      requestId: `req_${code}_dlv_${pad(seq)}`,
      correlationId: seq % 3 === 0 ? `corr_dlv_${code}_${pad(seq)}` : null,
      idempotencyRef: `idem_${event.id}`,
    },
    attempts,
  };
}

/* ------------------------------------------------------------------ */
/* Recovery requests, activity, monitoring                             */
/* ------------------------------------------------------------------ */

function buildRecoveryRequests(deliveries: Delivery[], incoming: IncomingEvent[], endpoints: OutgoingEndpoint[]): RecoveryRequest[] {
  const requests: RecoveryRequest[] = [];
  const gone = deliveries.find((delivery) => delivery.latestFailureClass === "endpoint_gone");
  const exhausted = deliveries.find((delivery) => delivery.latestFailureClass === "attempts_exhausted");
  const failedIncoming = incoming.find((event) => event.processing.state === "failed" && event.verification.state === "verified");

  if (gone) {
    requests.push({
      id: "wrr_001", direction: "outgoing", kind: "redelivery", targetId: gone.id, targetLabel: gone.id,
      counterpartLabel: endpoints.find((endpoint) => endpoint.id === gone.endpointId)?.name ?? gone.endpointId,
      companyName: gone.companyName, state: "rejected",
      reason: "Requested redelivery after HTTP 410. Rejected in demo review: the destination reports the resource is gone and the endpoint must be fixed first.",
      duplicateRiskAcknowledged: false, createdAt: isoAgo(240), updatedAt: isoAgo(200), createdBy: "Platform Admin (Demo Fixture)",
      executionEvidence: null, demo: true,
    });
  }
  if (exhausted) {
    requests.push({
      id: "wrr_002", direction: "outgoing", kind: "redelivery", targetId: exhausted.id, targetLabel: exhausted.id,
      counterpartLabel: endpoints.find((endpoint) => endpoint.id === exhausted.endpointId)?.name ?? exhausted.endpointId,
      companyName: exhausted.companyName, state: "pending_review",
      reason: "Destination recovered after a provider outage. Requesting one controlled redelivery.",
      duplicateRiskAcknowledged: true, createdAt: isoAgo(95), updatedAt: isoAgo(95), createdBy: "Platform Admin (Demo Fixture)",
      executionEvidence: null, demo: true,
    });
  }
  if (failedIncoming) {
    requests.push({
      id: "wrr_003", direction: "incoming", kind: "reprocess", targetId: failedIncoming.id, targetLabel: failedIncoming.id,
      counterpartLabel: failedIncoming.providerName, companyName: failedIncoming.companyName, state: "draft",
      reason: "Draft: downstream write timed out. Awaiting confirmation that the dependency has recovered.",
      duplicateRiskAcknowledged: false, createdAt: isoAgo(50), updatedAt: isoAgo(50), createdBy: "Platform Admin (Demo Fixture)",
      executionEvidence: null, demo: true,
    });
  }
  return requests;
}

function buildActivity(endpoints: OutgoingEndpoint[], subscriptions: EventSubscription[], sources: IncomingSource[], latestObserved: string): WebhookActivity[] {
  const activity: WebhookActivity[] = [];
  let n = 0;
  const push = (entry: Omit<WebhookActivity, "id" | "evidence" | "auditReferenced"> & { audit?: boolean }) => {
    n += 1;
    const { audit, ...rest } = entry;
    activity.push({ ...rest, id: `wact_${pad(n, 4)}`, evidence: "demo_fixture", auditReferenced: audit ?? false });
  };

  endpoints.forEach((endpoint) => {
    push({ at: endpoint.createdAt, type: "endpoint_created", actorName: "Platform Admin (Demo Fixture)", actorType: "staff", entityType: "endpoint", entityId: endpoint.id, endpointId: endpoint.id, message: `Endpoint "${endpoint.name}" created as a demo configuration.`, audit: true });
    subscriptions.filter((sub) => sub.endpointId === endpoint.id).slice(0, 2).forEach((sub) => {
      push({ at: sub.createdAt, type: "subscription_added", actorName: "Platform Admin (Demo Fixture)", actorType: "staff", entityType: "endpoint", entityId: endpoint.id, endpointId: endpoint.id, message: `Subscribed to ${sub.eventKey} (schema ${sub.schemaVersion}).` });
    });
    if (endpoint.signing.lastRotationAt) {
      push({ at: endpoint.signing.lastRotationAt, type: "secret_rotation_requested", actorName: "Platform Admin (Demo Fixture)", actorType: "staff", entityType: "endpoint", entityId: endpoint.id, endpointId: endpoint.id, message: `Signing secret reference moved to ${endpoint.signing.secretVersionRef}. The secret value is never shown.`, audit: true });
    }
    if (endpoint.state === "disabled" || endpoint.state === "suspended") {
      push({ at: isoAgo(600), type: endpoint.state === "disabled" ? "endpoint_disabled" : "security_policy_updated", actorName: endpoint.state === "disabled" ? "Platform Admin (Demo Fixture)" : "Platform Delivery Monitor", actorType: endpoint.state === "disabled" ? "staff" : "system", entityType: "endpoint", entityId: endpoint.id, endpointId: endpoint.id, message: endpoint.state === "disabled" ? "Endpoint disabled during customer migration." : "Endpoint suspended after repeated TLS failures.", audit: true });
    }
  });
  sources.forEach((source) => {
    push({ at: isoAgo(180), type: "source_observed", actorName: "Webhook Monitoring", actorType: "system", entityType: "source", entityId: source.id, endpointId: null, message: `${source.name}: receiver is not connected. Configuration contract reviewed.` });
  });
  push({ at: latestObserved, type: "monitoring_gap", actorName: "Webhook Monitoring", actorType: "system", entityType: "settings", entityId: null, endpointId: null, message: "No live ingestion or delivery telemetry is connected. All records are demo fixtures." });

  return activity.sort((a, b) => b.at.localeCompare(a.at));
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

export function buildWebhooksSnapshot(environment: WebhookEnvironment): WebhooksSnapshot {
  const seed = environment === "production" ? 9_100 : environment === "staging" ? 9_200 : 9_300;
  const rng = createRng(seed);
  const sources = buildSources(environment);
  const incomingEvents = buildIncomingEvents(environment, sources, createRng(seed + 1));
  const { endpoints, subscriptions } = buildEndpoints(environment);
  const outgoing = buildOutgoing(environment, endpoints, subscriptions, rng);

  const eventTypes = catalogue().map((type) => ({ ...type, lastProducedAt: PRODUCED[`${environment}:${type.key}`] ?? null }));

  const allTimes = [
    ...incomingEvents.map((event) => event.receivedAt),
    ...outgoing.attempts.map((attempt) => attempt.startedAt),
  ].sort();
  const lastObserved = allTimes[allTimes.length - 1] ?? null;
  const lastIncoming = incomingEvents[0]?.receivedAt ?? null;
  const lastAttempt = outgoing.attempts.map((attempt) => attempt.startedAt).sort().at(-1) ?? null;

  return {
    environment,
    generatedAt: DEMO_CLOCK_ANCHOR,
    timezone: DEMO_TIMEZONE,
    evidence: "demo_fixture",
    companies: COMPANY_REFS.map((company) => ({ id: company.id, name: company.name })),
    sources,
    incomingEvents,
    eventTypes,
    endpoints,
    subscriptions,
    outgoingEvents: outgoing.events,
    deliveries: outgoing.deliveries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    attempts: outgoing.attempts,
    recoveryRequests: buildRecoveryRequests(outgoing.deliveries, incomingEvents, endpoints),
    activity: buildActivity(endpoints, subscriptions, sources, lastObserved ?? DEMO_CLOCK_ANCHOR),
    monitoring: [
      { id: "mon_incoming", name: "Incoming receiver ingestion", freshnessThresholdMinutes: 60, backendConnected: false, lastObservedAt: lastIncoming },
      { id: "mon_delivery", name: "Outgoing delivery worker", freshnessThresholdMinutes: 60, backendConnected: false, lastObservedAt: lastAttempt },
      { id: "mon_attempts", name: "Delivery attempt recorder", freshnessThresholdMinutes: 60, backendConnected: false, lastObservedAt: lastAttempt },
    ],
    retryPolicies: RETRY_POLICIES,
    settings: { ...DEFAULT_SETTINGS },
  };
}
