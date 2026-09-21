import { ROUTES } from "@/config/routes";
import { STAFF } from "@/features/companies/data/mock/dataset";
import type { CompanyActivity, CompanyBundle } from "@/features/companies/data/types";
import { canonicalKey, actionDef, fallbackLabel } from "./action-catalogue";
import { makeEvent, type RawChange } from "./build";
import type { ActorSnapshot, AuditCategory, AuditEvent, AuditOutcome, RelatedRef, TargetSnapshot } from "./types";

const staffById = new Map(STAFF.map((member) => [member.id, member]));
const staffByName = new Map(STAFF.map((member) => [member.name, member]));

export const outcomeOf = (result: string): AuditOutcome => (result === "failure" || result === "failed" ? "failed" : result === "denied" ? "denied" : result === "pending" ? "pending" : "success");

export function staffActor(id: string | null, name: string): ActorSnapshot {
  const known = (id ? staffById.get(id) : undefined) ?? staffByName.get(name);
  return { type: "staff", id: known?.id ?? id, displayName: name, email: known?.email ?? null, roleAtEvent: null, scopeAtEvent: null, attemptedIdentifier: null, authContext: null };
}

const SYSTEM_ACTOR: ActorSnapshot = { type: "system", id: "system", displayName: "Platform Scheduler", email: null, roleAtEvent: null, scopeAtEvent: null, attemptedIdentifier: null, authContext: null };

const MODULE_CATEGORY: Record<string, AuditCategory> = {
  company: "companies",
  users: "users_access",
  clients: "clients",
  billing: "billing",
  subscription: "plans_subscriptions",
  integrations: "integrations",
  security: "authentication",
  usage: "usage_limits",
};

const FIELD: Record<string, string> = {
  "company.status_changed": "Company Status",
  "company.profile_updated": "Company Profile",
  "company.operational_owner_changed": "Operational Owner",
  "company.ownership_transferred": "Company Owner",
  "user.company_role_changed": "Company Role",
  "user.mfa_requirement_changed": "MFA Requirement",
  "company.security_policy_changed": "Security Policy",
  "client.access_changed": "Client Access",
  "client.access_granted": "Client Access",
  "client.access_revoked": "Client Access",
  "client.lead_changed": "Client Lead",
  "client.reviewer_changed": "Client Reviewer",
  "client.website_changed": "Client Website",
  "subscription.cycle_changed": "Billing Cycle",
  "subscription.version_migrated": "Plan Version",
  "usage.override_applied": "Usage Allowance",
  "usage.override_revoked": "Usage Allowance",
  "billing.refund_confirmed": "Payment Status",
  "billing.payment_failed": "Payment Status",
  "billing.payment_received": "Payment Status",
};

const STATUS_AFTER: Record<string, string> = { "company.suspended": "Suspended", "company.reactivated": "Active", "company.archived": "Archived" };

const MODULE_NAME: Record<string, string> = { company: "Companies", users: "Users", clients: "Clients", billing: "Billing & Payments", subscription: "Plans & Subscriptions", integrations: "Integrations", security: "Authentication", usage: "Usage & Limits" };

const fieldLabel = (key: string, action: string) => FIELD[key] ?? (action.startsWith("subscription.") ? "Subscription" : "Value");

export function companyActivityEvents(bundles: readonly CompanyBundle[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const bundle of bundles) {
    const company = bundle.company;
    const users = new Map(bundle.users.map((user) => [user.id, user]));
    const clients = new Map(bundle.clients.map((client) => [client.id, client]));
    for (const a of bundle.activity) events.push(fromActivity(a, company.id, company.name, users, clients));
  }
  return events;
}

function fromActivity(a: CompanyActivity, companyId: string, companyName: string, users: ReadonlyMap<string, CompanyBundle["users"][number]>, clients: ReadonlyMap<string, CompanyBundle["clients"][number]>): AuditEvent {
  const key = canonicalKey(a.action);
  const definition = actionDef(key);
  const category = definition?.category ?? MODULE_CATEGORY[a.module] ?? "support_operations";
  const failedSignIn = key === "auth.login_failed";
  const user = users.get(a.actor.id);

  let actor: ActorSnapshot;
  if (failedSignIn) {
    actor = { type: "anonymous", id: null, displayName: "Unauthenticated Attempt", email: null, roleAtEvent: null, scopeAtEvent: null, attemptedIdentifier: user?.email ?? a.actor.name, authContext: "Password sign-in" };
  } else if (a.actor.type === "staff") actor = staffActor(a.actor.id, a.actor.name);
  else if (a.actor.type === "customer") actor = { type: "company_user", id: a.actor.id, displayName: a.actor.name, email: user?.email ?? null, roleAtEvent: null, scopeAtEvent: companyName, attemptedIdentifier: null, authContext: null };
  else actor = { ...SYSTEM_ACTOR, displayName: a.actor.name };

  const client = a.entity.type === "client" || a.entity.type === "website" ? clients.get(a.entity.id) : undefined;
  const isCompanyEntity = a.entity.type === "company";
  const target: TargetSnapshot = {
    type: a.entity.type,
    id: a.entity.id,
    displayName: a.entity.label,
    parent: isCompanyEntity ? null : { type: "company", id: companyId, name: companyName },
    href: isCompanyEntity ? ROUTES.superAdmin.company(companyId) : client ? ROUTES.superAdmin.client(client.id) : a.entity.type === "user" && users.has(a.entity.id) ? ROUTES.superAdmin.user(a.entity.id) : null,
  };
  const related: RelatedRef[] = [
    { type: "company", id: companyId, label: companyName, href: ROUTES.superAdmin.company(companyId) },
    { type: "company_activity", id: companyId, label: `${companyName} activity`, href: `${ROUTES.superAdmin.company(companyId)}/activity` },
  ];
  const changes: RawChange[] = a.previousValue !== null || a.newValue !== null ? [{ key: `${key}.value`, label: fieldLabel(key, a.action), before: a.previousValue, after: a.newValue }] : STATUS_AFTER[a.action] ? [{ key: `${key}.value`, label: fieldLabel(key, a.action), before: null, after: STATUS_AFTER[a.action] }] : [];
  const isRequest = /^req_/.test(a.correlationId ?? "");

  return makeEvent({
    id: `aud_${a.id}`,
    occurredAt: a.at,
    actionKey: key,
    actor,
    target,
    scope: { companyId, companyName, clientId: client?.id ?? null, clientName: client?.name ?? null },
    outcome: outcomeOf(a.result),
    changes,
    summary: a.summary,
    reason: a.reason,
    requestId: isRequest ? (a.correlationId as string) : null,
    correlationId: !isRequest && a.correlationId ? a.correlationId : null,
    related,
    category,
    sourceModule: definition?.module ?? MODULE_NAME[a.module] ?? "Platform",
  });
}
