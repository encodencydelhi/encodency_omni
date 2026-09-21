import { ROUTES } from "@/config/routes";
import { flagRoutes } from "@/features/feature-flags/data/config";
import type { FlagChange } from "@/features/feature-flags/data/types";
import { routes as settingsRoutes } from "@/features/global-settings/data/config";
import type { ConfigurationChange, EditableSectionKey, SettingValue } from "@/features/global-settings/data/types";
import type { SubscriptionEvent } from "@/features/plans-subscriptions/data/types";
import { canonicalKey } from "./action-catalogue";
import { makeEvent, type RawChange } from "./build";
import { outcomeOf, staffActor } from "./sources";
import type { AuditEvent, RelatedRef, TargetSnapshot } from "./types";
const FLAG_ACTION: Record<string, string> = {
  flag_created: "feature_flag.created",
  state_changed: "feature_flag.state_changed",
  rollout_updated: "feature_flag.rollout_changed",
  target_added: "feature_flag.rollout_changed",
  target_removed: "feature_flag.rollout_changed",
  dependency_updated: "feature_flag.dependency_updated",
  emergency_disabled: "feature_flag.emergency_disabled",
  emergency_restored: "feature_flag.emergency_restored",
  metadata_updated: "feature_flag.metadata_updated",
  flag_deprecated: "feature_flag.lifecycle_changed",
  flag_archived: "feature_flag.lifecycle_changed",
};

const STRATEGY_LABEL: Record<string, string> = { disabled: "Disabled", internal: "Internal Staff Only", selected: "Selected Companies", percentage: "Percentage Of Eligible Companies", all: "All Eligible Companies" };

function flagFields(change: FlagChange, companyName: (id: string) => string): RawChange[] {
  if (change.type === "flag_deprecated" || change.type === "flag_archived") {
    return [{ key: "flag.lifecycle", label: "Lifecycle", before: change.type === "flag_archived" ? "Not Archived" : "Active", after: change.type === "flag_archived" ? "Archived" : "Deprecated" }];
  }
  if (!change.after) return [];
  const before = change.before;
  const after = change.after;
  const state = (c: { enabled: boolean; emergencyOff: boolean }) => (c.emergencyOff ? "Emergency Off" : c.enabled ? "Enabled" : "Disabled");
  const names = (ids: readonly string[]) => ids.map(companyName);
  return [
    { key: "flag.state", label: "Platform State", before: before ? state(before) : null, after: state(after) },
    { key: "flag.strategy", label: "Rollout Strategy", before: before ? STRATEGY_LABEL[before.strategy] : null, after: STRATEGY_LABEL[after.strategy] },
    { key: "flag.percentage", label: "Rollout Percentage", before: before && before.strategy === "percentage" ? `${before.percentage}%` : null, after: after.strategy === "percentage" ? `${after.percentage}%` : null },
    { key: "flag.companies", label: "Selected Companies", beforeList: names(before?.selectedCompanyIds ?? []), afterList: names(after.selectedCompanyIds) },
    { key: "flag.prerequisites", label: "Prerequisite Flags", beforeList: before?.prerequisites ?? [], afterList: after.prerequisites },
  ];
}

function describeFlag(change: FlagChange): string {
  switch (change.type) {
    case "flag_created": return "was created";
    case "emergency_disabled": return "was emergency disabled";
    case "emergency_restored": return "was restored from emergency off";
    case "state_changed": return change.after?.enabled ? "was enabled" : "was disabled";
    case "dependency_updated": return "had its prerequisites changed";
    case "metadata_updated": return "had its details updated";
    case "flag_deprecated": return "was deprecated";
    case "flag_archived": return "was archived";
    default: return "had its rollout changed";
  }
}

export function flagEvents(changes: readonly FlagChange[], companyName: (id: string) => string): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const change of changes) {
    if (change.status === "draft") continue;
    const base = FLAG_ACTION[change.type] ?? "feature_flag.state_changed";
    const href = flagRoutes.flag(change.flagKey, change.environment);
    // Only production flag changes are high-impact; a change in development or staging is routine.
    const routine = change.environment !== "production";
    const common = {
      ...(routine ? { sensitive: null, priority: "informational" as const } : {}),
      actor: staffActor(change.requestedById, change.requestedBy),
      target: { type: "feature_flag", id: change.flagKey, displayName: change.flagName, parent: null, href } satisfies TargetSnapshot,
      reason: change.reason,
      environment: change.environment,
      correlationId: `wf_flag_${change.id}`,
      related: [{ type: "feature_flag", id: change.flagKey, label: change.flagName, href }] satisfies RelatedRef[],
      changes: flagFields(change, companyName),
    };

    if (change.status === "pending_approval" || change.status === "scheduled") {
      events.push(makeEvent({ ...common, id: `aud_flag_${change.id}`, occurredAt: change.requestedAt, actionKey: "feature_flag.change_requested", outcome: "pending", workflowStage: "requested", summary: `${change.requestedBy} requested a change to ${change.flagName} in ${change.environment}. It has not been applied.`, followUp: change.status === "pending_approval" ? "Awaiting approval. No approval service is connected." : "Planned. No scheduler applies it in this phase." }));
      continue;
    }
    if (change.status === "cancelled" || change.status === "rejected") {
      events.push(makeEvent({ ...common, id: `aud_flag_${change.id}`, occurredAt: change.requestedAt, actionKey: "feature_flag.change_requested", outcome: change.status === "rejected" ? "denied" : "cancelled", workflowStage: change.status === "rejected" ? "rejected" : "requested", summary: `A change to ${change.flagName} in ${change.environment} was ${change.status}.` }));
      continue;
    }
    if (change.approvalRequired) {
      events.push(makeEvent({ ...common, id: `aud_flag_${change.id}_req`, occurredAt: change.requestedAt, actionKey: "feature_flag.change_requested", workflowStage: "requested", summary: `${change.requestedBy} requested a change to ${change.flagName} in ${change.environment}.` }));
    }
    events.push(makeEvent({ ...common, id: `aud_flag_${change.id}`, occurredAt: change.appliedAt ?? change.requestedAt, actionKey: base, workflowStage: change.approvalRequired ? "applied" : null, summary: `${change.flagName} ${describeFlag(change)} in ${change.environment}.` }));
  }
  return events;
}
function settingText(value: SettingValue): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return "Updated";
  return String(value);
}

const SECTION_ACTION: Partial<Record<EditableSectionKey, string>> = {
  privacy: "global_settings.privacy_change_applied",
  maintenance: "global_settings.maintenance_changed",
  governance: "global_settings.governance_changed",
};

export function settingsEvents(changes: readonly ConfigurationChange[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const change of changes) {
    const href = settingsRoutes.section(change.section);
    const security = change.section === "security";
    const key = security ? "global_settings.security_change_applied" : (SECTION_ACTION[change.section] ?? "global_settings.setting_changed");
    const common = {
      actor: staffActor(change.actorId, change.actorName),
      target: { type: "platform_setting", id: change.key, displayName: change.settingName, parent: null, href } satisfies TargetSnapshot,
      reason: change.reason,
      changes: [{ key: change.key, label: change.settingName, before: settingText(change.previous), after: settingText(change.next) }] satisfies RawChange[],
      related: [{ type: "platform_setting", id: change.key, label: change.settingName, href }] satisfies RelatedRef[],
      correlationId: `wf_settings_${change.id}`,
    };
    const requestKey = security ? "global_settings.security_change_requested" : key;

    if (change.result === "pending_approval" || change.result === "scheduled") {
      events.push(makeEvent({ ...common, id: `aud_set_${change.id}`, occurredAt: change.at, actionKey: requestKey, outcome: "pending", workflowStage: "requested", summary: `${change.actorName} requested a change to ${change.settingName}. It has not taken effect.`, followUp: change.approvalNote || null }));
      continue;
    }
    if (change.result === "withdrawn") {
      events.push(makeEvent({ ...common, id: `aud_set_${change.id}`, occurredAt: change.at, actionKey: requestKey, outcome: "cancelled", workflowStage: "requested", summary: `A pending change to ${change.settingName} was withdrawn.` }));
      continue;
    }
    const governed = security && change.sensitivity !== "low";
    if (governed) {
      events.push(makeEvent({ ...common, id: `aud_set_${change.id}_req`, occurredAt: change.at, actionKey: "global_settings.security_change_requested", workflowStage: "requested", summary: `${change.actorName} requested a change to ${change.settingName}.` }));
    }
    events.push(makeEvent({ ...common, id: `aud_set_${change.id}`, occurredAt: change.effectiveAt ?? change.at, actionKey: key, workflowStage: governed ? "applied" : null, summary: `${change.settingName} was changed by ${change.actorName}.` }));
  }
  return events;
}
export function planEvents(events: readonly SubscriptionEvent[]): AuditEvent[] {
  return events
    .filter((event) => event.company === null && event.planId)
    .map((event) => {
      const planId = event.planId as string;
      const href = `${ROUTES.superAdmin.plans}/${planId}`;
      return makeEvent({
        id: `aud_plan_${event.id}`,
        occurredAt: event.at,
        actionKey: canonicalKey(event.action.startsWith("plan.") ? event.action : `plan.${event.action.split(".").pop()}`),
        actor: staffActor(null, event.actor),
        target: { type: "plan", id: planId, displayName: event.summary.split(":")[0] ?? "Plan", parent: null, href },
        outcome: outcomeOf(event.result),
        changes: event.previousValue !== null || event.newValue !== null ? [{ key: "plan.value", label: "Plan", before: event.previousValue, after: event.newValue }] : [],
        summary: event.summary,
        reason: event.reason,
        category: "plans_subscriptions",
        sourceModule: "Plans & Subscriptions",
        related: [{ type: "plan", id: planId, label: "Plan", href }],
      });
    });
}
