/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Pure derivations over a snapshot. No state, no I/O, safe to unit test.
 */

import { FAILURE_CLASS, RANGE_OPTIONS, WEBHOOK_ROUTES } from "./config";
import type {
  Delivery,
  DeliveryAttempt,
  FailureClass,
  IncomingEvent,
  IncomingSource,
  OutgoingEndpoint,
  OutgoingEventType,
  RecoveryRequest,
  RecoveryKind,
  WebhookTimeRange,
  WebhooksSnapshot,
} from "./types";

/* ------------------------------------------------------------------ */
/* Time windows                                                        */
/* ------------------------------------------------------------------ */

export interface TimeWindow {
  fromMs: number;
  toMs: number;
  hours: number;
}

export function resolveWindow(snapshot: WebhooksSnapshot, range: WebhookTimeRange, customHours: number): TimeWindow {
  const preset = RANGE_OPTIONS.find((option) => option.value === range)?.hours;
  const hours = preset ?? Math.min(720, Math.max(1, Math.round(customHours) || 24));
  const toMs = Date.parse(snapshot.generatedAt);
  return { fromMs: toMs - hours * 3_600_000, toMs, hours };
}

const inWindow = (iso: string, window: TimeWindow): boolean => {
  const ms = Date.parse(iso);
  return ms >= window.fromMs && ms <= window.toMs;
};

export const incomingInWindow = (snapshot: WebhooksSnapshot, window: TimeWindow): IncomingEvent[] =>
  snapshot.incomingEvents.filter((event) => inWindow(event.receivedAt, window));

/** A delivery belongs to a period by when it was created, not by each of its attempts. */
export const deliveriesInWindow = (snapshot: WebhooksSnapshot, window: TimeWindow): Delivery[] =>
  snapshot.deliveries.filter((delivery) => inWindow(delivery.createdAt, window));

export const attemptsInWindow = (snapshot: WebhooksSnapshot, window: TimeWindow): DeliveryAttempt[] =>
  snapshot.attempts.filter((attempt) => inWindow(attempt.startedAt, window));

/* ------------------------------------------------------------------ */
/* Classification helpers                                              */
/* ------------------------------------------------------------------ */

export const isIncomingProcessingFailure = (event: IncomingEvent): boolean =>
  event.verification.state === "verified" && event.processing.state === "failed";

export const isVerificationProblem = (event: IncomingEvent): boolean =>
  event.verification.state === "rejected" || event.verification.state === "unavailable";

export function httpStatusBucket(status: number | null): "none" | "2xx" | "4xx" | "429" | "5xx" | "other" {
  if (status === null) return "none";
  if (status === 429) return "429";
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500) return "5xx";
  return "other";
}

/* ------------------------------------------------------------------ */
/* Overview KPIs                                                       */
/* ------------------------------------------------------------------ */

export interface OverviewKpis {
  incomingEvents: number;
  verifiedIncoming: number;
  incomingProcessingFailures: number;
  outgoingDeliveries: number;
  delivered: number;
  failedDeliveries: number;
  retryScheduled: number;
  /** Current state, not period-based. */
  enabledEndpoints: number;
  totalEndpoints: number;
  attemptCount: number;
}

export function overviewKpis(snapshot: WebhooksSnapshot, window: TimeWindow): OverviewKpis {
  const incoming = incomingInWindow(snapshot, window);
  const deliveries = deliveriesInWindow(snapshot, window);
  return {
    incomingEvents: incoming.length,
    verifiedIncoming: incoming.filter((event) => event.verification.state === "verified").length,
    incomingProcessingFailures: incoming.filter(isIncomingProcessingFailure).length,
    outgoingDeliveries: deliveries.length,
    delivered: deliveries.filter((delivery) => delivery.state === "delivered").length,
    failedDeliveries: deliveries.filter((delivery) => delivery.state === "failed").length,
    retryScheduled: deliveries.filter((delivery) => delivery.state === "retry_scheduled").length,
    enabledEndpoints: snapshot.endpoints.filter((endpoint) => endpoint.state === "enabled").length,
    totalEndpoints: snapshot.endpoints.length,
    attemptCount: attemptsInWindow(snapshot, window).length,
  };
}

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */

export interface TrendBucket {
  startMs: number;
  label: string;
  incoming: number;
  outgoing: number;
  failedIncoming: number;
  failedAttempts: number;
}

export function activityTrend(snapshot: WebhooksSnapshot, window: TimeWindow): { buckets: TrendBucket[]; grouping: string } {
  const hours = window.hours;
  const bucketMs = hours <= 1 ? 5 * 60_000 : hours <= 24 ? 3_600_000 : hours <= 168 ? 6 * 3_600_000 : 86_400_000;
  const grouping = hours <= 1 ? "5-minute" : hours <= 24 ? "hourly" : hours <= 168 ? "6-hour" : "daily";
  const count = Math.max(1, Math.ceil((window.toMs - window.fromMs) / bucketMs));
  const buckets: TrendBucket[] = Array.from({ length: count }, (_, index) => {
    const startMs = window.fromMs + index * bucketMs;
    const date = new Date(startMs);
    return {
      startMs,
      label: hours <= 24
        ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: snapshot.timezone })
        : date.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: snapshot.timezone }),
      incoming: 0, outgoing: 0, failedIncoming: 0, failedAttempts: 0,
    };
  });
  const place = (iso: string): TrendBucket | undefined => {
    const ms = Date.parse(iso);
    if (ms < window.fromMs || ms > window.toMs) return undefined;
    return buckets[Math.min(count - 1, Math.floor((ms - window.fromMs) / bucketMs))];
  };
  snapshot.incomingEvents.forEach((event) => {
    const bucket = place(event.receivedAt);
    if (!bucket) return;
    bucket.incoming += 1;
    if (isIncomingProcessingFailure(event)) bucket.failedIncoming += 1;
  });
  snapshot.deliveries.forEach((delivery) => {
    const bucket = place(delivery.createdAt);
    if (bucket) bucket.outgoing += 1;
  });
  snapshot.attempts.forEach((attempt) => {
    const bucket = place(attempt.startedAt);
    if (bucket && attempt.result !== null && attempt.result !== "succeeded") bucket.failedAttempts += 1;
  });
  return { buckets, grouping };
}

/* ------------------------------------------------------------------ */
/* Source / endpoint summaries                                         */
/* ------------------------------------------------------------------ */

export type MonitoringState = "observed" | "stale" | "no_observations" | "receiver_not_connected";

export interface SourceStat {
  source: IncomingSource;
  events: number;
  verificationFailures: number;
  processingFailures: number;
  lastReceivedAt: string | null;
  monitoring: MonitoringState;
}

export function sourceStats(snapshot: WebhooksSnapshot, window: TimeWindow): SourceStat[] {
  const stale = snapshot.settings.stalenessWarningMinutes * 60_000;
  return snapshot.sources.map((source) => {
    const all = snapshot.incomingEvents.filter((event) => event.sourceId === source.id);
    const inRange = all.filter((event) => inWindow(event.receivedAt, window));
    const last = all[0]?.receivedAt ?? null;
    let monitoring: MonitoringState = "observed";
    if (source.receiverStatus === "not_connected" && !last) monitoring = "receiver_not_connected";
    else if (!last) monitoring = "no_observations";
    else if (Date.parse(snapshot.generatedAt) - Date.parse(last) > stale) monitoring = "stale";
    return {
      source,
      events: inRange.length,
      verificationFailures: inRange.filter(isVerificationProblem).length,
      processingFailures: inRange.filter(isIncomingProcessingFailure).length,
      lastReceivedAt: last,
      monitoring,
    };
  });
}

export interface EndpointStat {
  endpoint: OutgoingEndpoint;
  subscribed: number;
  deliveries: number;
  delivered: number;
  failed: number;
  retryScheduled: number;
  lastDeliveryAt: string | null;
  latestResult: Delivery["state"] | null;
}

export function endpointStats(snapshot: WebhooksSnapshot, window: TimeWindow): EndpointStat[] {
  return snapshot.endpoints.map((endpoint) => {
    const all = snapshot.deliveries.filter((delivery) => delivery.endpointId === endpoint.id);
    const inRange = all.filter((delivery) => inWindow(delivery.createdAt, window));
    return {
      endpoint,
      subscribed: snapshot.subscriptions.filter((sub) => sub.endpointId === endpoint.id).length,
      deliveries: inRange.length,
      delivered: inRange.filter((delivery) => delivery.state === "delivered").length,
      failed: inRange.filter((delivery) => delivery.state === "failed").length,
      retryScheduled: inRange.filter((delivery) => delivery.state === "retry_scheduled").length,
      lastDeliveryAt: all[0]?.latestAttemptAt ?? all[0]?.createdAt ?? null,
      latestResult: all[0]?.state ?? null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Failures requiring review                                           */
/* ------------------------------------------------------------------ */

export type IssueKind =
  | "signature_verification_failed"
  | "verification_unavailable"
  | "unsupported_event_type"
  | "missing_account_mapping"
  | "incoming_processing_failed"
  | "delivery_timed_out"
  | "endpoint_gone"
  | "repeated_5xx"
  | "rate_limited"
  | "attempts_exhausted"
  | "permanent_rejection"
  | "connection_or_tls"
  | "invalid_configuration"
  | "unknown_external_outcome";

export const ISSUE_LABEL: Record<IssueKind, string> = {
  signature_verification_failed: "Signature Verification Failed",
  verification_unavailable: "Verification Not Available",
  unsupported_event_type: "Unsupported Event Type",
  missing_account_mapping: "Missing Provider Account Mapping",
  incoming_processing_failed: "Incoming Processing Failed",
  delivery_timed_out: "Outgoing Delivery Timed Out",
  endpoint_gone: "Endpoint Returned HTTP 410",
  repeated_5xx: "Repeated HTTP 5xx",
  rate_limited: "Rate-Limited Destination",
  attempts_exhausted: "Attempts Exhausted",
  permanent_rejection: "Destination Rejected Delivery (4xx)",
  connection_or_tls: "Connection / TLS Failure",
  invalid_configuration: "Invalid Endpoint Configuration",
  unknown_external_outcome: "Unknown External Outcome",
};

export interface AttentionItem {
  id: string;
  direction: "incoming" | "outgoing";
  issue: IssueKind;
  subject: string;
  relatedId: string;
  relatedHref: string;
  company: string | null;
  lastSeenAt: string;
  severity: "danger" | "warning";
}

export function attentionItems(snapshot: WebhooksSnapshot, window: TimeWindow): AttentionItem[] {
  const items: AttentionItem[] = [];

  incomingInWindow(snapshot, window).forEach((event) => {
    let issue: IssueKind | null = null;
    if (event.verification.state === "rejected") issue = "signature_verification_failed";
    else if (event.verification.state === "unavailable") issue = "verification_unavailable";
    else if (event.processing.state === "failed") {
      issue =
        event.processing.errorCode === "unsupported_event_type" ? "unsupported_event_type"
          : event.processing.errorCode === "account_mapping_missing" ? "missing_account_mapping"
            : "incoming_processing_failed";
    }
    if (!issue) return;
    items.push({
      id: `att_${event.id}`, direction: "incoming", issue, subject: event.providerName, relatedId: event.id,
      relatedHref: WEBHOOK_ROUTES.incomingEvent(event.id), company: event.companyName, lastSeenAt: event.receivedAt,
      severity: issue === "signature_verification_failed" || issue === "incoming_processing_failed" ? "danger" : "warning",
    });
  });

  deliveriesInWindow(snapshot, window).forEach((delivery) => {
    const cls = delivery.latestFailureClass;
    if (!cls || delivery.state === "delivered" || delivery.state === "cancelled") return;
    const endpoint = snapshot.endpoints.find((item) => item.id === delivery.endpointId);
    const issue: IssueKind | null =
      delivery.unknownOutcome && cls !== "timeout" ? "unknown_external_outcome"
        : cls === "timeout" ? "delivery_timed_out"
          : cls === "endpoint_gone" ? "endpoint_gone"
            : cls === "http_5xx" ? "repeated_5xx"
              : cls === "http_429" ? "rate_limited"
                : cls === "attempts_exhausted" ? "attempts_exhausted"
                  : cls === "http_4xx_permanent" ? "permanent_rejection"
                    : cls === "connection_failure" || cls === "dns_tls_failure" ? "connection_or_tls"
                      : cls === "invalid_endpoint_configuration" ? "invalid_configuration"
                        : cls === "unknown_external_outcome" ? "unknown_external_outcome"
                          : null;
    if (!issue) return;
    items.push({
      id: `att_${delivery.id}`, direction: "outgoing", issue, subject: endpoint?.name ?? delivery.endpointId, relatedId: delivery.id,
      relatedHref: WEBHOOK_ROUTES.delivery(delivery.id), company: delivery.companyName,
      lastSeenAt: delivery.latestAttemptAt ?? delivery.createdAt,
      severity: delivery.state === "failed" ? "danger" : "warning",
    });
  });

  return items.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

/* ------------------------------------------------------------------ */
/* Recovery eligibility                                                */
/* ------------------------------------------------------------------ */

export type FactorStatus = "pass" | "warn" | "block" | "info";
export interface EligibilityFactor {
  id: string;
  label: string;
  status: FactorStatus;
  detail: string;
}
export interface EligibilityAssessment {
  level: "eligible" | "review_required" | "not_eligible";
  suggestedKind: RecoveryKind | null;
  duplicateRisk: "none" | "possible" | "high";
  summary: string;
  factors: EligibilityFactor[];
}

function finalise(factors: EligibilityFactor[], kind: RecoveryKind | null, duplicateRisk: EligibilityAssessment["duplicateRisk"]): EligibilityAssessment {
  const blocks = factors.filter((factor) => factor.status === "block");
  const warns = factors.filter((factor) => factor.status === "warn");
  const level = blocks.length ? "not_eligible" : warns.length ? "review_required" : "eligible";
  return {
    level,
    suggestedKind: level === "not_eligible" ? null : kind,
    duplicateRisk,
    summary:
      level === "not_eligible" ? `Not eligible: ${blocks[0]!.detail}`
        : level === "review_required" ? `Human review required: ${warns[0]!.detail}`
          : "No blocking factors found. A recovery request still needs review approval.",
    factors,
  };
}

export function evaluateDeliveryRecovery(input: {
  delivery: Delivery;
  endpoint: OutgoingEndpoint | undefined;
  attempts: DeliveryAttempt[];
  eventType: OutgoingEventType | undefined;
  siblingDeliveries: Delivery[];
}): EligibilityAssessment {
  const { delivery, endpoint, eventType, siblingDeliveries } = input;
  const cls = delivery.latestFailureClass;
  const policyRetryable = endpoint ? classIsPolicyRetryable(cls, endpoint.policy.retryPolicyRef) : false;
  const remaining = Math.max(0, delivery.maxAttempts - delivery.attemptsUsed);
  const existingSuccess = siblingDeliveries.some((item) => item.id !== delivery.id && item.state === "delivered");
  const factors: EligibilityFactor[] = [];

  factors.push({ id: "authenticity", label: "Original event authenticity", status: "info", detail: "Outgoing platform events originate inside OmniPlatform. Incoming authenticity checks do not apply." });

  const stateStatus: FactorStatus =
    delivery.state === "cancelled" ? "block" : delivery.state === "pending" || delivery.state === "attempting" ? "block"
      : delivery.state === "retry_scheduled" ? "warn" : delivery.state === "delivered" ? "warn" : "pass";
  factors.push({
    id: "state", label: "Current delivery state", status: stateStatus,
    detail:
      delivery.state === "pending" || delivery.state === "attempting" ? "The delivery is still in progress. Wait for it to settle."
        : delivery.state === "cancelled" ? "The delivery was cancelled. Create a new delivery through redelivery governance instead."
          : delivery.state === "retry_scheduled" ? "An automatic retry is already scheduled. A manual request may duplicate it."
            : delivery.state === "delivered" ? "The endpoint already accepted this delivery."
              : "The delivery is in a terminal failed state.",
  });

  const cfg = cls ? FAILURE_CLASS[cls] : null;
  // Exhausted attempts are a retry-policy limit, not a verdict on the destination: a governed redelivery may still be reviewed.
  const failureStatus: FactorStatus = !cfg ? "info" : cls === "attempts_exhausted" ? "warn" : cfg.retryable === "no" ? "block" : cfg.retryable === "conditional" ? "warn" : "pass";
  factors.push({
    id: "failure", label: "Failure classification", status: failureStatus,
    detail: cfg ? `${cfg.label}. ${cfg.note}` : "No failure is recorded for this delivery.",
  });

  factors.push({
    id: "attempts", label: "Attempts remaining", status: remaining > 0 ? "pass" : "warn",
    detail: remaining > 0 ? `${remaining} of ${delivery.maxAttempts} attempts remain under ${delivery.retryPolicyRef}.` : `All ${delivery.maxAttempts} attempts are used. Only a governed redelivery can add another.`,
  });

  factors.push({
    id: "policy", label: "Retry policy", status: cls === null ? "info" : policyRetryable ? "pass" : "warn",
    detail: cls === null ? "No failure to evaluate." : policyRetryable ? "This failure class is retryable under the endpoint's policy." : "This failure class is not automatically retryable under the endpoint's policy.",
  });

  factors.push({
    id: "endpoint-config", label: "Endpoint configuration",
    status: !endpoint ? "block" : endpoint.security.urlValidationState === "failed" ? "block" : endpoint.security.urlValidationState === "warnings" ? "warn" : "pass",
    detail: !endpoint ? "The endpoint no longer exists." : endpoint.security.urlValidationState === "failed" ? "The destination failed validation." : endpoint.security.urlValidationState === "warnings" ? "The destination has validation warnings." : "Destination passed the preliminary frontend check. Backend enforcement is still required.",
  });

  factors.push({
    id: "endpoint-state", label: "Endpoint current state",
    status: !endpoint ? "block" : endpoint.state === "enabled" ? "pass" : "block",
    detail: !endpoint ? "The endpoint is missing." : endpoint.state === "enabled" ? "The endpoint is enabled." : `The endpoint is ${endpoint.state}. No delivery can be requested until it is enabled.`,
  });

  factors.push({
    id: "schema", label: "Event schema compatibility",
    status: !eventType ? "warn" : eventType.availability === "deprecated" ? "warn" : "pass",
    detail: !eventType ? "The event type is not in the current catalogue." : eventType.availability === "deprecated" ? "The event type is deprecated. Confirm that the subscriber still accepts this schema." : `Schema ${eventType.schemaVersion} is current for ${eventType.key}.`,
  });

  const scopeOk = !endpoint || endpoint.ownerScope === "platform" || endpoint.companyId === delivery.companyId;
  factors.push({ id: "scope", label: "Company / scope eligibility", status: scopeOk ? "pass" : "block", detail: scopeOk ? "The event's company matches the endpoint scope." : "The event's company does not match the endpoint's owning company." });

  factors.push({
    id: "existing-success", label: "Existing successful delivery", status: existingSuccess ? "warn" : "pass",
    detail: existingSuccess ? "Another delivery of this event to this endpoint was already accepted. Redelivery would duplicate it." : "No successful delivery of this event to this endpoint exists.",
  });

  factors.push({
    id: "unknown-outcome", label: "Unknown external outcome", status: delivery.unknownOutcome ? "warn" : "pass",
    detail: delivery.unknownOutcome ? "A timeout may have occurred after the recipient accepted the event. Blind redelivery may duplicate downstream side effects." : "No uncertain outcome is recorded.",
  });

  factors.push({ id: "idempotency", label: "Idempotency / event ID stability", status: "info", detail: `Recipients can deduplicate on ${delivery.idempotencyRef}. The reference is stable across attempts.` });
  factors.push({ id: "approval", label: "Required capability / approval", status: "info", detail: "A super-admin recovery capability and review approval are required. The frontend cannot approve requests." });

  const duplicateRisk: EligibilityAssessment["duplicateRisk"] = existingSuccess || delivery.state === "delivered" ? "high" : delivery.unknownOutcome ? "possible" : "none";
  const kind: RecoveryKind | null = remaining > 0 && policyRetryable && delivery.state !== "delivered" ? "retry" : "redelivery";
  return finalise(factors, kind, duplicateRisk);
}

function classIsPolicyRetryable(cls: FailureClass | null, policyRef: string): boolean {
  if (!cls) return false;
  const policyRetryable: Record<string, FailureClass[]> = {
    "retry-policy/standard-v1": ["connection_failure", "http_429", "http_5xx"],
    "retry-policy/conservative-v1": ["http_429", "http_5xx"],
    "retry-policy/no-retry-v1": [],
  };
  return (policyRetryable[policyRef] ?? []).includes(cls);
}

export function evaluateIncomingReprocess(event: IncomingEvent, source: IncomingSource | undefined): EligibilityAssessment {
  const factors: EligibilityFactor[] = [];
  const v = event.verification.state;

  factors.push({
    id: "authenticity", label: "Original event authenticity",
    status: v === "verified" ? "pass" : "block",
    detail:
      v === "verified" ? "The original event carries a verified record. Replay reuses that record and never re-runs authenticity."
        : v === "rejected" ? "Signature verification was rejected. A rejected event can never be processed by a retry."
          : v === "pending" ? "Verification has not completed. Only a verified event can be processed."
            : "Authenticity could not be established. Unverified events cannot be processed.",
  });
  const ps = event.processing.state;
  factors.push({
    id: "state", label: "Current processing state", status: ps === "failed" ? "pass" : ps === "processed" ? "warn" : ps === "ignored_duplicate" ? "block" : ps === "rejected" ? "block" : "block",
    detail:
      ps === "failed" ? "Processing failed after its automatic attempts."
        : ps === "processed" ? "The event already processed. Reprocessing may repeat business side effects."
          : ps === "ignored_duplicate" ? "This was ignored as a duplicate HTTP delivery. Reprocess the original event instead."
            : ps === "rejected" ? "The event was rejected."
              : "Processing is still in progress or has not started.",
  });
  const code = event.processing.errorCode;
  factors.push({
    id: "error", label: "Failure classification", status: code === "unsupported_event_type" ? "block" : code === "account_mapping_missing" ? "warn" : code ? "pass" : "info",
    detail: code === "unsupported_event_type" ? "The event type is unsupported. Reprocessing cannot succeed until the receiver supports it."
      : code === "account_mapping_missing" ? "Fix the account mapping in Integrations first, otherwise reprocessing will fail again."
        : code ? "The failure looks transient (dependency timeout)." : "No processing error is recorded.",
  });
  factors.push({ id: "mapping", label: "Company / account mapping", status: event.accountMapping === "mapped" ? "pass" : "warn", detail: event.accountMapping === "mapped" ? "The provider account maps to a connected company account." : "The company could not be established from a trusted mapping. Company identity is never taken from the payload alone." });
  factors.push({ id: "source", label: "Source configuration", status: source?.verificationConfigured ? "pass" : "block", detail: source?.verificationConfigured ? "The source has a verification policy defined." : "The source has no verification policy defined." });
  factors.push({ id: "dedup", label: "Deduplication", status: event.dedup.result === "duplicate_http_delivery" ? "block" : "pass", detail: event.dedup.result === "duplicate_http_delivery" ? "This is a duplicate HTTP delivery of an earlier event." : "The provider event ID is unique in the deduplication store." });
  factors.push({ id: "approval", label: "Required capability / approval", status: "info", detail: "A super-admin replay capability and review approval are required. The frontend cannot approve requests." });

  return finalise(factors, "reprocess", ps === "processed" ? "possible" : "none");
}

export const recoveryRequestsFor = (requests: RecoveryRequest[], targetId: string): RecoveryRequest[] =>
  requests.filter((request) => request.targetId === targetId);

/* ------------------------------------------------------------------ */
/* Delivery timeline                                                   */
/* ------------------------------------------------------------------ */

export interface TimelineEntry {
  id: string;
  at: string;
  actor: string;
  title: string;
  result: string | null;
  tone: "success" | "danger" | "warning" | "info" | "neutral";
  attemptNumber: number | null;
}

export function buildDeliveryTimeline(input: {
  delivery: Delivery;
  eventOccurredAt: string | null;
  attempts: DeliveryAttempt[];
  recoveryRequests: RecoveryRequest[];
}): TimelineEntry[] {
  const { delivery, eventOccurredAt, attempts, recoveryRequests } = input;
  const entries: TimelineEntry[] = [];
  const add = (entry: Omit<TimelineEntry, "id">) => entries.push({ ...entry, id: `${delivery.id}-tl-${entries.length}` });

  if (eventOccurredAt) add({ at: eventOccurredAt, actor: "Platform", title: "Event produced", result: delivery.eventKey, tone: "neutral", attemptNumber: null });
  add({ at: delivery.createdAt, actor: "Delivery scheduler", title: "Delivery created", result: `Endpoint ${delivery.endpointId}`, tone: "neutral", attemptNumber: null });

  const sorted = [...attempts].sort((a, b) => a.number - b.number);
  sorted.forEach((attempt, index) => {
    add({ at: attempt.startedAt, actor: "Delivery worker", title: index === 0 ? "Attempt started" : "Attempt started again", result: `Attempt ${attempt.number}`, tone: "info", attemptNumber: attempt.number });
    if (attempt.result === null || !attempt.completedAt) return;
    const label = attempt.result === "succeeded" ? "Accepted by endpoint" : attempt.result === "timed_out" ? "Attempt timed out" : attempt.result === "rejected" ? "Attempt rejected" : "Attempt failed";
    add({ at: attempt.completedAt, actor: "Delivery worker", title: label, result: attempt.httpStatus ? `HTTP ${attempt.httpStatus}` : attempt.failureClass ? FAILURE_CLASS[attempt.failureClass].label : null, tone: attempt.result === "succeeded" ? "success" : "danger", attemptNumber: attempt.number });
    const next = sorted[index + 1];
    if (attempt.result !== "succeeded" && next) add({ at: attempt.completedAt, actor: "Retry policy", title: "Retry scheduled", result: `Attempt ${next.number} starts ${new Date(next.startedAt).toISOString().slice(11, 16)} UTC`, tone: "warning", attemptNumber: attempt.number });
  });

  if (delivery.state === "retry_scheduled" && delivery.nextRetryAt) {
    const last = sorted[sorted.length - 1];
    add({ at: last?.completedAt ?? delivery.createdAt, actor: "Retry policy", title: "Retry scheduled", result: `Next attempt at ${new Date(delivery.nextRetryAt).toISOString().slice(11, 16)} UTC`, tone: "warning", attemptNumber: last?.number ?? null });
  }
  if (delivery.state === "delivered") {
    const last = sorted[sorted.length - 1];
    add({ at: last?.completedAt ?? delivery.createdAt, actor: "Delivery worker", title: "Delivered (accepted by endpoint)", result: "Downstream processing is not confirmed.", tone: "success", attemptNumber: last?.number ?? null });
  }
  if (delivery.state === "failed" && delivery.latestFailureClass === "attempts_exhausted") {
    const last = sorted[sorted.length - 1];
    add({ at: last?.completedAt ?? delivery.createdAt, actor: "Retry policy", title: "Attempts exhausted", result: `${delivery.attemptsUsed} of ${delivery.maxAttempts} used`, tone: "danger", attemptNumber: last?.number ?? null });
  }
  if (delivery.state === "cancelled") add({ at: delivery.createdAt, actor: "Delivery scheduler", title: "Delivery cancelled", result: delivery.failureSummary, tone: "neutral", attemptNumber: null });

  recoveryRequests.forEach((request) => {
    add({ at: request.createdAt, actor: request.createdBy, title: `${request.kind === "retry" ? "Manual retry" : "Manual redelivery"} requested (demo, not sent)`, result: request.state.replaceAll("_", " "), tone: "neutral", attemptNumber: null });
  });

  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

/* ------------------------------------------------------------------ */
/* Security                                                            */
/* ------------------------------------------------------------------ */

export interface SecuritySummary {
  registeredSources: number;
  sourcesWithVerification: number;
  verificationFailures: number;
  rejectedEvents: number;
  endpointsSigned: number;
  totalEndpoints: number;
  endpointsNeedingReview: number;
  rotationReviewsDue: number;
}

export function securitySummary(snapshot: WebhooksSnapshot, window: TimeWindow): SecuritySummary {
  const incoming = incomingInWindow(snapshot, window);
  return {
    registeredSources: snapshot.sources.length,
    sourcesWithVerification: snapshot.sources.filter((source) => source.verificationConfigured).length,
    verificationFailures: incoming.filter(isVerificationProblem).length,
    rejectedEvents: incoming.filter((event) => event.verification.state === "rejected").length,
    endpointsSigned: snapshot.endpoints.filter((endpoint) => endpoint.signing.state === "configured_reference").length,
    totalEndpoints: snapshot.endpoints.length,
    endpointsNeedingReview: snapshot.endpoints.filter((endpoint) => endpointSecurityWarnings(endpoint).length > 0).length,
    rotationReviewsDue: snapshot.endpoints.filter((endpoint) => endpoint.signing.reviewStatus === "review_due").length,
  };
}

export function endpointSecurityWarnings(endpoint: OutgoingEndpoint): string[] {
  const warnings: string[] = [];
  if (endpoint.signing.state === "not_configured") warnings.push("Signing is not configured. Recipients cannot verify events came from OmniPlatform.");
  if (endpoint.signing.state === "demo_reference") warnings.push("Signing uses a demo reference only. No real signing implementation exists.");
  if (endpoint.security.httpsState !== "https") warnings.push("The destination does not use HTTPS.");
  if (endpoint.security.urlValidationState === "warnings") warnings.push("The destination URL has validation warnings.");
  if (endpoint.security.urlValidationState === "failed") warnings.push("The destination URL failed validation.");
  if (endpoint.signing.reviewStatus === "review_due") warnings.push("A secret rotation review is due.");
  if (endpoint.signing.reviewStatus === "action_required") warnings.push("Security review requires action.");
  if (endpoint.hadQueryString) warnings.push("The submitted URL contained a query string, which is not stored or displayed.");
  return warnings;
}

/* ------------------------------------------------------------------ */
/* Freshness                                                           */
/* ------------------------------------------------------------------ */

export interface Freshness {
  lastRecordedAt: string | null;
  state: "fresh" | "stale" | "no_data";
  ageMinutes: number | null;
}

export function freshness(snapshot: WebhooksSnapshot): Freshness {
  const times = snapshot.monitoring.map((item) => item.lastObservedAt).filter((value): value is string => Boolean(value)).sort();
  const last = times[times.length - 1] ?? null;
  if (!last) return { lastRecordedAt: null, state: "no_data", ageMinutes: null };
  const age = Math.round((Date.parse(snapshot.generatedAt) - Date.parse(last)) / 60_000);
  return { lastRecordedAt: last, ageMinutes: age, state: age > snapshot.settings.stalenessWarningMinutes ? "stale" : "fresh" };
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export const subscriptionsFor = (snapshot: WebhooksSnapshot, endpointId: string) =>
  snapshot.subscriptions.filter((sub) => sub.endpointId === endpointId);

export const subscribersOf = (snapshot: WebhooksSnapshot, eventKey: string) =>
  snapshot.subscriptions.filter((sub) => sub.eventKey === eventKey);

export const attemptsFor = (snapshot: WebhooksSnapshot, deliveryId: string) =>
  snapshot.attempts.filter((attempt) => attempt.deliveryId === deliveryId).sort((a, b) => a.number - b.number);
