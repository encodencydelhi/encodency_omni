import { actionDef, actionLabel, priorityFor } from "./action-catalogue";
import { isSecretField, REDACTED, safeValue, scrubText } from "./redaction";
import type {
  ActorSnapshot,
  AuditCategory,
  AuditEvent,
  AuditOutcome,
  Environment,
  EventScope,
  FieldChange,
  RelatedRef,
  ReviewPriority,
  SensitiveCategory,
  TargetSnapshot,
  TechnicalContext,
  WorkflowStage,
} from "./types";

export interface RawChange {
  key: string;
  label: string;
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
  beforeList?: readonly string[];
  afterList?: readonly string[];
  force?: boolean;
}

const text = (value: RawChange["before"]): string | null => (value === null || value === undefined || value === "" ? null : String(value));

export function buildChanges(raw: readonly RawChange[]): FieldChange[] {
  const out: FieldChange[] = [];
  for (const item of raw) {
    if (item.beforeList || item.afterList) {
      const before = item.beforeList ?? [];
      const after = item.afterList ?? [];
      const added = after.filter((entry) => !before.includes(entry));
      const removed = before.filter((entry) => !after.includes(entry));
      if (added.length === 0 && removed.length === 0) continue;
      out.push({ key: item.key, label: item.label, kind: "changed", before: before.length ? before.join(", ") : "None", after: after.length ? after.join(", ") : "None", redacted: false, added, removed, unchangedCount: before.filter((entry) => after.includes(entry)).length });
      continue;
    }
    const before = text(item.before);
    const after = text(item.after);
    if (isSecretField(item.key) || isSecretField(item.label)) {
      if (before === null && after === null && !item.force) continue;
      out.push({ key: item.key, label: item.label, kind: "changed", before: REDACTED, after: REDACTED, redacted: true });
      continue;
    }
    if (before === after) continue;
    const safeBefore = safeValue(item.key, before);
    const safeAfter = safeValue(item.key, after);
    out.push({ key: item.key, label: item.label, kind: before === null ? "added" : after === null ? "removed" : "changed", before: safeBefore.text, after: safeAfter.text, redacted: safeBefore.redacted || safeAfter.redacted });
  }
  return out;
}

export interface EventInput {
  id: string;
  occurredAt: string;
  actionKey: string;
  actor: Partial<ActorSnapshot> & Pick<ActorSnapshot, "type" | "displayName">;
  target: TargetSnapshot;
  scope?: Partial<EventScope>;
  outcome?: AuditOutcome;
  changes?: readonly RawChange[];
  summary: string;
  reason?: string | null;
  environment?: Environment;
  requestId?: string | null;
  correlationId?: string | null;
  workflowStage?: WorkflowStage | null;
  related?: RelatedRef[];
  technical?: Partial<TechnicalContext> | null;
  followUp?: string | null;
  priority?: ReviewPriority;
  recordedDelaySec?: number;
  /** For an action that is not in the catalogue: the producing module decides these instead. */
  category?: AuditCategory;
  sourceModule?: string;
  /** Override the catalogue classification: null when this instance is not high-impact (a change outside production). */
  sensitive?: SensitiveCategory | null;
}

function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function makeEvent(input: EventInput): AuditEvent {
  const definition = actionDef(input.actionKey);
  const outcome = input.outcome ?? "success";
  const scope: EventScope = { level: "platform", companyId: null, companyName: null, clientId: null, clientName: null, ...input.scope };
  if (scope.clientId) scope.level = "client";
  else if (scope.companyId) scope.level = "company";
  const delay = input.recordedDelaySec ?? 4 + (hash(input.id) % 55);

  return {
    id: input.id,
    schemaVersion: 1,
    occurredAt: input.occurredAt,
    recordedAt: new Date(Date.parse(input.occurredAt) + delay * 1000).toISOString(),
    category: definition?.category ?? input.category ?? "support_operations",
    actionKey: input.actionKey,
    actionLabel: actionLabel(input.actionKey),
    actor: { id: null, email: null, roleAtEvent: null, scopeAtEvent: null, attemptedIdentifier: null, authContext: null, ...input.actor },
    target: input.target,
    scope,
    outcome,
    priority: input.priority ?? priorityFor(input.actionKey, outcome),
    sensitiveCategory: input.sensitive === undefined ? (definition?.sensitive ?? null) : input.sensitive,
    changes: buildChanges(input.changes ?? []),
    summary: scrubText(input.summary),
    reason: input.reason ? scrubText(input.reason) : null,
    environment: input.environment ?? "production",
    sourceModule: definition?.module ?? input.sourceModule ?? "Platform",
    producer: definition?.producer ?? "platform-service",
    requestId: input.requestId ?? null,
    correlationId: input.correlationId ?? null,
    workflowStage: input.workflowStage ?? null,
    securityView: definition?.securityView ?? null,
    related: input.related ?? [],
    technical: input.technical === null ? null : { ipAddress: null, userAgent: null, sessionRef: null, producerService: definition?.producer ?? "platform-service", ingestion: "Demo record. Not received through a real ingestion pipeline.", ...input.technical },
    integrity: { status: "demo_data", note: "Demo record. Presence in this frontend is not evidence of immutable or tamper-evident storage." },
    followUp: input.followUp ?? null,
  };
}
