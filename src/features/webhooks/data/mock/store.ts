/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * In-memory demo store.
 *
 * Holds the demo configuration for the lifetime of the browser session so that the wizard, endpoint
 * settings and recovery drafts are visible across routes. It never creates deliveries, attempts,
 * incoming events or "executed" recovery states: mutating configuration cannot rewrite history.
 */

import { DEMO_ACTOR, RETRY_POLICIES } from "../config";
import type {
  ActivityType,
  CreateEndpointInput,
  CreateRecoveryInput,
  EndpointState,
  EventSubscription,
  MutationResult,
  OutgoingEndpoint,
  RecoveryRequest,
  RecoveryState,
  UpdateEndpointInput,
  WebhookActivity,
  WebhookEnvironment,
  WebhookSettings,
  WebhooksSnapshot,
} from "../types";
import { checkDestinationUrl, hasErrors, validateEndpointDraft } from "../validation";
import { evaluateDeliveryRecovery, evaluateIncomingReprocess } from "../selectors";
import { buildWebhooksSnapshot } from "./dataset";

const snapshots = new Map<WebhookEnvironment, WebhooksSnapshot>();
let sequence = 0;

const nowIso = (): string => new Date().toISOString();
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_demo_${Date.now().toString(36)}${sequence}`;
}

function current(environment: WebhookEnvironment): WebhooksSnapshot {
  let snapshot = snapshots.get(environment);
  if (!snapshot) {
    snapshot = buildWebhooksSnapshot(environment);
    snapshots.set(environment, snapshot);
  }
  return snapshot;
}

function commit(environment: WebhookEnvironment, next: WebhooksSnapshot): void {
  snapshots.set(environment, next);
}

export function getSnapshot(environment: WebhookEnvironment): WebhooksSnapshot {
  return { ...current(environment) };
}

export function resetDemo(environment: WebhookEnvironment): void {
  snapshots.delete(environment);
}

function activityEntry(
  type: ActivityType,
  message: string,
  extra: Partial<Pick<WebhookActivity, "entityType" | "entityId" | "endpointId" | "auditReferenced">> = {},
): WebhookActivity {
  return {
    id: nextId("wact"),
    at: nowIso(),
    type,
    actorName: DEMO_ACTOR.name,
    actorType: "staff",
    entityType: extra.entityType ?? "endpoint",
    entityId: extra.entityId ?? null,
    endpointId: extra.endpointId ?? null,
    message,
    auditReferenced: extra.auditReferenced ?? false,
    evidence: "demo_fixture",
  };
}

const fail = <T,>(error: string): MutationResult<T> => ({ ok: false, error });

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export function createEndpoint(environment: WebhookEnvironment, input: CreateEndpointInput): MutationResult<OutgoingEndpoint> {
  const snapshot = current(environment);
  const errors = validateEndpointDraft(input, "review", { existingNames: snapshot.endpoints.map((endpoint) => endpoint.name) });
  if (hasErrors(errors)) return fail(Object.values(errors).find(Boolean) ?? "The endpoint configuration is invalid.");

  const url = checkDestinationUrl(input.destinationUrl, input.environment);
  if (!url.ok || !url.sanitizedUrl || !url.host) return fail(url.errors[0] ?? "The destination URL is invalid.");

  const company = input.ownerScope === "company" ? snapshot.companies.find((item) => item.id === input.companyId) : null;
  if (input.ownerScope === "company" && !company) return fail("The selected company is not in the company registry.");

  const disallowed = input.eventKeys.filter((key) => {
    const type = snapshot.eventTypes.find((item) => item.key === key);
    if (!type || type.availability === "deprecated") return true;
    return input.ownerScope === "company" && (!type.customerSubscribable || type.audience === "platform");
  });
  if (disallowed.length) return fail(`These event types cannot be subscribed to by this endpoint: ${disallowed.join(", ")}.`);

  const now = nowIso();
  const policy = RETRY_POLICIES.find((item) => item.ref === input.retryPolicyRef) ?? RETRY_POLICIES[0]!;
  const id = nextId("wep");
  const endpoint: OutgoingEndpoint = {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    environment: input.environment,
    ownerScope: input.ownerScope,
    companyId: company?.id ?? null,
    companyName: company?.name ?? null,
    destinationUrl: url.sanitizedUrl,
    destinationHost: url.host,
    hadQueryString: url.hadQueryString,
    state: input.state,
    signing: { method: "hmac_sha256", state: "demo_reference", secretVersionRef: "demo-ref/not-a-real-secret", lastRotationAt: null, reviewStatus: "not_reviewed" },
    policy: { timeoutMs: input.timeoutMs, retryPolicyRef: policy.ref, maxAttempts: policy.maxAttempts, schemaVersion: "latest-compatible", payloadPrivacy: input.payloadPrivacy },
    allowedAudience: input.allowedAudience.trim() || (company ? "Company-scoped events for the owning company only" : "Platform and cross-company operational events"),
    contactRef: input.contactRef?.trim() || null,
    security: { httpsState: url.scheme, urlValidationState: url.warnings.length ? "warnings" : "passed_preliminary", lastSecurityReviewAt: null },
    createdAt: now,
    updatedAt: now,
    demoCreated: true,
  };
  const subscriptions: EventSubscription[] = input.eventKeys.map((key, index) => {
    const type = snapshot.eventTypes.find((item) => item.key === key)!;
    return { id: `wsb_${id}_${index + 1}`, endpointId: id, eventKey: key, schemaVersion: type.schemaVersion, state: input.state === "draft" ? "pending_review" : "active", createdAt: now, updatedAt: now };
  });

  commit(environment, {
    ...snapshot,
    endpoints: [endpoint, ...snapshot.endpoints],
    subscriptions: [...subscriptions, ...snapshot.subscriptions],
    activity: [
      activityEntry("endpoint_created", `Demo endpoint "${endpoint.name}" created with ${subscriptions.length} subscription(s).`, { entityId: id, endpointId: id, auditReferenced: true }),
      ...snapshot.activity,
    ],
  });
  return { ok: true, data: endpoint };
}

export function updateEndpoint(environment: WebhookEnvironment, input: UpdateEndpointInput): MutationResult<OutgoingEndpoint> {
  const snapshot = current(environment);
  const existing = snapshot.endpoints.find((endpoint) => endpoint.id === input.endpointId);
  if (!existing) return fail("Endpoint not found.");

  const changes: string[] = [];
  const entries: WebhookActivity[] = [];
  const next: OutgoingEndpoint = { ...existing, security: { ...existing.security }, policy: { ...existing.policy } };

  if (input.name !== undefined && input.name.trim() !== existing.name) {
    const name = input.name.trim();
    if (!name) return fail("Endpoint name is required.");
    if (snapshot.endpoints.some((endpoint) => endpoint.id !== existing.id && endpoint.name.toLowerCase() === name.toLowerCase())) return fail("An endpoint with this name already exists.");
    next.name = name;
    changes.push("name");
  }
  if (input.description !== undefined && input.description.trim() !== existing.description) {
    next.description = input.description.trim();
    changes.push("description");
  }
  if (input.allowedAudience !== undefined && input.allowedAudience.trim() !== existing.allowedAudience) {
    next.allowedAudience = input.allowedAudience.trim();
    changes.push("allowed audience");
  }
  if (input.contactRef !== undefined && (input.contactRef?.trim() || null) !== existing.contactRef) {
    next.contactRef = input.contactRef?.trim() || null;
    changes.push("owner contact");
  }
  if (input.destinationUrl !== undefined && input.destinationUrl.trim() !== "") {
    const url = checkDestinationUrl(input.destinationUrl, existing.environment);
    if (!url.ok || !url.sanitizedUrl || !url.host) return fail(url.errors[0] ?? "The destination URL is invalid.");
    if (url.sanitizedUrl !== existing.destinationUrl) {
      next.destinationUrl = url.sanitizedUrl;
      next.destinationHost = url.host;
      next.hadQueryString = url.hadQueryString;
      next.security = { ...next.security, httpsState: url.scheme, urlValidationState: url.warnings.length ? "warnings" : "passed_preliminary" };
      changes.push("destination");
      entries.push(activityEntry("destination_changed", `Destination changed from ${existing.destinationHost} to ${url.host}. Reason: ${input.reason?.trim() || "not provided"}.`, { entityId: existing.id, endpointId: existing.id, auditReferenced: true }));
    }
  }
  if (input.timeoutMs !== undefined && input.timeoutMs !== existing.policy.timeoutMs) {
    if (input.timeoutMs < 1_000 || input.timeoutMs > 30_000) return fail("Timeout must be between 1,000 and 30,000 ms.");
    next.policy.timeoutMs = input.timeoutMs;
    changes.push("timeout");
  }
  if (input.retryPolicyRef !== undefined && input.retryPolicyRef !== existing.policy.retryPolicyRef) {
    const policy = RETRY_POLICIES.find((item) => item.ref === input.retryPolicyRef);
    if (!policy) return fail("Unknown retry policy reference.");
    next.policy.retryPolicyRef = policy.ref;
    next.policy.maxAttempts = policy.maxAttempts;
    changes.push("retry policy");
  }
  if (!changes.length) return fail("No changes to save.");

  next.updatedAt = nowIso();
  const policyChanged = changes.includes("timeout") || changes.includes("retry policy");
  if (policyChanged) entries.push(activityEntry("delivery_policy_updated", `Delivery policy updated (${changes.filter((c) => c === "timeout" || c === "retry policy").join(", ")}). Historical deliveries keep the policy they used.`, { entityId: existing.id, endpointId: existing.id, auditReferenced: true }));
  if (changes.some((c) => !["destination", "timeout", "retry policy"].includes(c))) entries.push(activityEntry("endpoint_updated", `Endpoint details updated (${changes.filter((c) => !["destination", "timeout", "retry policy"].includes(c)).join(", ")}).`, { entityId: existing.id, endpointId: existing.id }));

  commit(environment, {
    ...snapshot,
    endpoints: snapshot.endpoints.map((endpoint) => (endpoint.id === existing.id ? next : endpoint)),
    activity: [...entries, ...snapshot.activity],
  });
  return { ok: true, data: next };
}

export function setEndpointState(environment: WebhookEnvironment, endpointId: string, state: Extract<EndpointState, "enabled" | "disabled">, reason: string): MutationResult<OutgoingEndpoint> {
  const snapshot = current(environment);
  const existing = snapshot.endpoints.find((endpoint) => endpoint.id === endpointId);
  if (!existing) return fail("Endpoint not found.");
  if (existing.state === state) return fail(`The endpoint is already ${state}.`);
  if (existing.state === "suspended") return fail("Suspended endpoints require a backend security review before they can be changed.");
  if (state === "enabled" && existing.security.urlValidationState === "failed") return fail("The destination failed validation. Fix it before enabling.");
  if (!reason.trim()) return fail("Enter a reason for this change.");

  const next: OutgoingEndpoint = { ...existing, state, updatedAt: nowIso() };
  commit(environment, {
    ...snapshot,
    endpoints: snapshot.endpoints.map((endpoint) => (endpoint.id === endpointId ? next : endpoint)),
    activity: [
      activityEntry(state === "enabled" ? "endpoint_enabled" : "endpoint_disabled", `Endpoint ${state === "enabled" ? "enabled" : "disabled"} in demo configuration. Reason: ${reason.trim()}`, { entityId: endpointId, endpointId, auditReferenced: true }),
      ...snapshot.activity,
    ],
  });
  return { ok: true, data: next };
}

export function saveSubscriptions(environment: WebhookEnvironment, endpointId: string, eventKeys: string[], reason: string): MutationResult<EventSubscription[]> {
  const snapshot = current(environment);
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId);
  if (!endpoint) return fail("Endpoint not found.");
  if (!eventKeys.length) return fail("An endpoint must keep at least one subscription. Disable the endpoint instead.");

  const existing = snapshot.subscriptions.filter((sub) => sub.endpointId === endpointId);
  const existingKeys = new Set(existing.map((sub) => sub.eventKey));
  const added = eventKeys.filter((key) => !existingKeys.has(key));
  const removed = existing.filter((sub) => !eventKeys.includes(sub.eventKey));

  for (const key of added) {
    const type = snapshot.eventTypes.find((item) => item.key === key);
    if (!type || type.availability === "deprecated") return fail(`${key} is not available for new subscriptions.`);
    if (endpoint.ownerScope === "company" && (!type.customerSubscribable || type.audience === "platform")) return fail(`${type.name} is platform-only and cannot be subscribed to by a company-scoped endpoint.`);
  }
  if (!added.length && !removed.length) return fail("No subscription changes to save.");
  if (!reason.trim()) return fail("Enter a reason for this change.");

  const now = nowIso();
  const created: EventSubscription[] = added.map((key, index) => ({
    id: `wsb_${endpointId}_${Date.now().toString(36)}${index}`, endpointId, eventKey: key,
    schemaVersion: snapshot.eventTypes.find((item) => item.key === key)!.schemaVersion,
    state: endpoint.state === "draft" ? "pending_review" : "active", createdAt: now, updatedAt: now,
  }));
  const kept = snapshot.subscriptions.filter((sub) => sub.endpointId !== endpointId || eventKeys.includes(sub.eventKey));

  commit(environment, {
    ...snapshot,
    subscriptions: [...created, ...kept],
    endpoints: snapshot.endpoints.map((item) => (item.id === endpointId ? { ...item, updatedAt: now } : item)),
    activity: [
      ...added.map((key) => activityEntry("subscription_added", `Subscribed to ${key}. Reason: ${reason.trim()}`, { entityId: endpointId, endpointId })),
      ...removed.map((sub) => activityEntry("subscription_removed", `Unsubscribed from ${sub.eventKey}. Existing delivery history is unchanged. Reason: ${reason.trim()}`, { entityId: endpointId, endpointId })),
      ...snapshot.activity,
    ],
  });
  return { ok: true, data: created };
}

export function requestSecretRotationReview(environment: WebhookEnvironment, endpointId: string): MutationResult<WebhookActivity> {
  const snapshot = current(environment);
  const endpoint = snapshot.endpoints.find((item) => item.id === endpointId);
  if (!endpoint) return fail("Endpoint not found.");
  const entry = activityEntry("secret_rotation_requested", "Secret rotation review requested. No secret was generated or changed: key management is not connected.", { entityId: endpointId, endpointId, auditReferenced: true });
  commit(environment, {
    ...snapshot,
    endpoints: snapshot.endpoints.map((item) => item.id === endpointId ? { ...item, signing: { ...item.signing, reviewStatus: "review_due" } } : item),
    activity: [entry, ...snapshot.activity],
  });
  return { ok: true, data: entry };
}

/* ------------------------------------------------------------------ */
/* Recovery requests                                                   */
/* ------------------------------------------------------------------ */

export function createRecoveryRequest(environment: WebhookEnvironment, input: CreateRecoveryInput): MutationResult<RecoveryRequest> {
  const snapshot = current(environment);
  if (!input.reason.trim()) return fail("Enter a reason for this recovery request.");

  let counterpart = "";
  const label = input.targetId;
  let companyName: string | null = null;

  if (input.direction === "outgoing") {
    const delivery = snapshot.deliveries.find((item) => item.id === input.targetId);
    if (!delivery) return fail("Delivery not found.");
    const endpoint = snapshot.endpoints.find((item) => item.id === delivery.endpointId);
    const type = snapshot.eventTypes.find((item) => item.key === delivery.eventKey);
    if (!endpoint) return fail("The delivery's endpoint no longer exists.");
    const assessment = evaluateDeliveryRecovery({ delivery, endpoint, attempts: snapshot.attempts.filter((a) => a.deliveryId === delivery.id), eventType: type, siblingDeliveries: snapshot.deliveries.filter((d) => d.eventId === delivery.eventId && d.endpointId === delivery.endpointId) });
    if (assessment.level === "not_eligible") return fail("This delivery is not eligible for a recovery request. Review the blocking factors.");
    if (assessment.duplicateRisk !== "none" && !input.duplicateRiskAcknowledged) return fail("Acknowledge the potential duplicate side effects to continue.");
    counterpart = endpoint.name;
    companyName = delivery.companyName;
  } else {
    const event = snapshot.incomingEvents.find((item) => item.id === input.targetId);
    if (!event) return fail("Incoming event not found.");
    const source = snapshot.sources.find((item) => item.id === event.sourceId);
    const assessment = evaluateIncomingReprocess(event, source);
    if (assessment.level === "not_eligible") return fail("This incoming event cannot be reprocessed. Replay never bypasses original authenticity requirements.");
    counterpart = event.providerName;
    companyName = event.companyName;
  }

  const now = nowIso();
  const state: RecoveryState = input.submit ? "pending_review" : "draft";
  const request: RecoveryRequest = {
    id: nextId("wrr"), direction: input.direction, kind: input.kind, targetId: input.targetId, targetLabel: label,
    counterpartLabel: counterpart, companyName, state, reason: input.reason.trim(),
    duplicateRiskAcknowledged: input.duplicateRiskAcknowledged, createdAt: now, updatedAt: now,
    createdBy: DEMO_ACTOR.name, executionEvidence: null, demo: true,
  };

  commit(environment, {
    ...snapshot,
    recoveryRequests: [request, ...snapshot.recoveryRequests],
    activity: [
      activityEntry("recovery_request_created", `Demo ${input.kind} request ${input.submit ? "submitted for review" : "saved as draft"} for ${input.targetId}. Nothing was sent to a backend.`, { entityType: "recovery_request", entityId: request.id, auditReferenced: input.submit }),
      ...snapshot.activity,
    ],
  });
  return { ok: true, data: request };
}

export function updateRecoveryRequest(environment: WebhookEnvironment, requestId: string, state: Extract<RecoveryState, "cancelled" | "pending_review">): MutationResult<RecoveryRequest> {
  const snapshot = current(environment);
  const existing = snapshot.recoveryRequests.find((item) => item.id === requestId);
  if (!existing) return fail("Recovery request not found.");
  if (["executed", "rejected", "accepted_by_backend", "approved", "cancelled"].includes(existing.state)) return fail(`A ${existing.state.replaceAll("_", " ")} request cannot be changed here.`);
  if (state === "pending_review" && existing.state !== "draft") return fail("Only drafts can be submitted.");
  const next: RecoveryRequest = { ...existing, state, updatedAt: nowIso() };
  commit(environment, {
    ...snapshot,
    recoveryRequests: snapshot.recoveryRequests.map((item) => (item.id === requestId ? next : item)),
    activity: [activityEntry("recovery_request_updated", `Demo recovery request ${requestId} moved to ${state.replaceAll("_", " ")}.`, { entityType: "recovery_request", entityId: requestId }), ...snapshot.activity],
  });
  return { ok: true, data: next };
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function updateSettings(environment: WebhookEnvironment, settings: WebhookSettings): MutationResult<WebhookSettings> {
  const snapshot = current(environment);
  if (settings.defaultTimeoutMs < 1_000 || settings.defaultTimeoutMs > 30_000) return fail("Default timeout must be between 1,000 and 30,000 ms.");
  if (settings.stalenessWarningMinutes < 5 || settings.stalenessWarningMinutes > 1_440) return fail("Staleness warning must be between 5 and 1,440 minutes.");
  const policy = RETRY_POLICIES.find((item) => item.ref === settings.defaultRetryPolicyRef);
  if (!policy) return fail("Unknown retry policy reference.");
  const next = { ...settings, defaultMaxAttempts: policy.maxAttempts };
  commit(environment, {
    ...snapshot,
    settings: next,
    activity: [activityEntry("settings_updated", "Demo webhook settings saved locally. Backend enforcement comes later.", { entityType: "settings", auditReferenced: true }), ...snapshot.activity],
  });
  return { ok: true, data: next };
}
