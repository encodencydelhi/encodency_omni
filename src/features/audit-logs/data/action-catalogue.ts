import type { AuditCategory, ReviewPriority, SecurityView, SensitiveCategory } from "./types";

export interface ActionDef {
  label: string;
  category: AuditCategory;
  module: string;
  producer: string;
  securityView?: SecurityView;
  sensitive?: SensitiveCategory;
  priority?: ReviewPriority;
}

const def = (label: string, category: AuditCategory, module: string, producer: string, extra: Partial<ActionDef> = {}): ActionDef => ({ label, category, module, producer, ...extra });

export const ACTIONS: Record<string, ActionDef> = {
  "auth.login_succeeded": def("Login Succeeded", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),
  "auth.login_failed": def("Login Failed", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),
  "auth.mfa_verification_succeeded": def("MFA Verification Succeeded", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),
  "auth.mfa_verification_failed": def("MFA Verification Failed", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),
  "auth.password_reset_requested": def("Password Reset Requested", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),
  "auth.password_reset_completed": def("Password Reset Completed", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),
  "auth.session_revoked": def("Session Revoked", "authentication", "Authentication", "auth-service", { securityView: "authentication", priority: "review_recommended" }),
  "auth.account_locked": def("Account Lockout Triggered", "authentication", "Authentication", "auth-service", { securityView: "authentication", priority: "review_recommended" }),
  "auth.security_challenge_denied": def("Security Challenge Denied", "authentication", "Authentication", "auth-service", { securityView: "authentication" }),

  "company.created": def("Company Created", "companies", "Companies", "companies-service"),
  "company.status_changed": def("Company Status Changed", "companies", "Companies", "companies-service", { sensitive: "privileged_access", priority: "review_recommended" }),
  "company.profile_updated": def("Company Profile Updated", "companies", "Companies", "companies-service"),
  "company.ownership_transferred": def("Company Ownership Transferred", "companies", "Companies", "companies-service", { sensitive: "privileged_access", priority: "review_recommended" }),
  "company.operational_owner_changed": def("Operational Company Assignment Changed", "companies", "Companies", "companies-service", { securityView: "staff" }),
  "report.exported": def("Report Exported", "companies", "Companies", "reports-service"),

  /* Users & access */
  "user.invited": def("User Invited", "users_access", "Users", "users-service", { securityView: "user_access" }),
  "user.invitation_resent": def("Invitation Resent", "users_access", "Users", "users-service", { securityView: "user_access" }),
  "user.company_role_changed": def("Company Role Changed", "users_access", "Users", "users-service", { securityView: "user_access", sensitive: "privileged_access", priority: "review_recommended" }),
  "user.suspended": def("User Suspended", "users_access", "Users", "users-service", { securityView: "user_access", sensitive: "privileged_access", priority: "review_recommended" }),
  "user.membership_added": def("Company Membership Added", "users_access", "Users", "users-service", { securityView: "user_access" }),
  "user.permission_updated": def("User Permission Updated", "users_access", "Users", "users-service", { securityView: "user_access", sensitive: "privileged_access", priority: "review_recommended" }),
  "user.mfa_requirement_changed": def("MFA Requirement Changed", "users_access", "Users", "users-service", { securityView: "user_access" }),
  "user.invitation_accepted": def("Invitation Accepted", "users_access", "Users", "users-service", { securityView: "user_access" }),
  "company.security_policy_changed": def("Company Security Policy Changed", "authentication", "Companies", "companies-service", { securityView: "policies", sensitive: "platform_security", priority: "review_recommended" }),

  /* Internal team */
  "staff.invited": def("Staff Invited", "internal_team", "Internal Team", "team-service", { securityView: "staff" }),
  "staff.platform_role_changed": def("Platform Role Changed", "internal_team", "Internal Team", "team-service", { securityView: "staff", sensitive: "privileged_access", priority: "review_recommended" }),
  "staff.suspended": def("Staff Suspended", "internal_team", "Internal Team", "team-service", { securityView: "staff", sensitive: "privileged_access", priority: "review_recommended" }),
  "staff.reactivated": def("Staff Reactivated", "internal_team", "Internal Team", "team-service", { securityView: "staff", sensitive: "privileged_access", priority: "review_recommended" }),
  "staff.deactivated": def("Staff Deactivated", "internal_team", "Internal Team", "team-service", { securityView: "staff", sensitive: "privileged_access" }),
  "staff.access_review_completed": def("Access Review Completed", "internal_team", "Internal Team", "team-service", { securityView: "staff" }),

  /* Clients */
  "client.created": def("Client Created", "clients", "Clients", "clients-service"),
  "client.updated": def("Client Updated", "clients", "Clients", "clients-service"),
  "client.paused": def("Client Paused", "clients", "Clients", "clients-service"),
  "client.resumed": def("Client Resumed", "clients", "Clients", "clients-service"),
  "client.archived": def("Client Archived", "clients", "Clients", "clients-service", { priority: "review_recommended" }),
  "client.access_granted": def("Client Access Granted", "clients", "Clients", "clients-service", { securityView: "user_access" }),
  "client.access_changed": def("Client Access Changed", "clients", "Clients", "clients-service", { securityView: "user_access" }),
  "client.access_revoked": def("Client Access Revoked", "clients", "Clients", "clients-service", { securityView: "user_access" }),
  "client.lead_changed": def("Client Lead Changed", "clients", "Clients", "clients-service"),
  "client.reviewer_changed": def("Client Reviewer Changed", "clients", "Clients", "clients-service"),
  "client.website_changed": def("Client Website Changed", "clients", "Clients", "clients-service"),

  /* Plans & subscriptions */
  "subscription.started": def("Subscription Started", "plans_subscriptions", "Plans & Subscriptions", "plans-service"),
  "subscription.trial_started": def("Trial Started", "plans_subscriptions", "Plans & Subscriptions", "plans-service"),
  "subscription.trial_extended": def("Trial Extended", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.trial_ended": def("Trial Ended", "plans_subscriptions", "Plans & Subscriptions", "plans-service"),
  "subscription.trial_converted": def("Trial Converted", "plans_subscriptions", "Plans & Subscriptions", "plans-service"),
  "subscription.change_requested": def("Subscription Change Requested", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.change_approved": def("Subscription Change Approved", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.change_applied": def("Subscription Change Applied", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements", priority: "review_recommended" }),
  "subscription.cycle_changed": def("Billing Cycle Changed", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.version_migrated": def("Plan Version Migrated", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.cancelled": def("Subscription Cancelled", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements", priority: "review_recommended" }),
  "subscription.cancellation_scheduled": def("Cancellation Scheduled", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.cancellation_reversed": def("Cancellation Reversed", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.reactivated": def("Subscription Reactivated", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "subscription.scheduled_change_updated": def("Scheduled Change Updated", "plans_subscriptions", "Plans & Subscriptions", "plans-service"),
  "plan.published": def("Plan Published", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements", priority: "review_recommended" }),
  "plan.updated": def("Plan Updated", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements" }),
  "plan.retired": def("Plan Retired", "plans_subscriptions", "Plans & Subscriptions", "plans-service", { sensitive: "subscription_entitlements", priority: "review_recommended" }),

  /* Billing */
  "billing.payment_received": def("Payment Received", "billing", "Billing & Payments", "billing-service"),
  "billing.payment_failed": def("Payment Failed", "billing", "Billing & Payments", "billing-service"),
  "billing.payment_allocated": def("Invoice Payment Allocated", "billing", "Billing & Payments", "billing-service", { sensitive: "billing_financial" }),
  "billing.refund_requested": def("Refund Requested", "billing", "Billing & Payments", "billing-service", { sensitive: "billing_financial", priority: "review_recommended" }),
  "billing.refund_approved": def("Refund Approved", "billing", "Billing & Payments", "billing-service", { sensitive: "billing_financial", priority: "review_recommended" }),
  "billing.refund_confirmed": def("Refund Confirmed", "billing", "Billing & Payments", "billing-service", { sensitive: "billing_financial", priority: "review_recommended" }),
  "billing.credit_note_issued": def("Credit Note Issued", "billing", "Billing & Payments", "billing-service", { sensitive: "billing_financial" }),
  "billing.adjustment_draft_created": def("Billing Adjustment Draft Created", "billing", "Billing & Payments", "billing-service", { sensitive: "billing_financial" }),

  /* Usage & limits */
  "usage.override_applied": def("Usage Override Applied", "usage_limits", "Usage & Limits", "usage-service", { sensitive: "subscription_entitlements", priority: "review_recommended" }),
  "usage.override_revoked": def("Usage Override Revoked", "usage_limits", "Usage & Limits", "usage-service", { sensitive: "subscription_entitlements" }),
  "usage.alert_acknowledged": def("Usage Alert Acknowledged", "usage_limits", "Usage & Limits", "usage-service"),

  /* Integrations */
  "integration.connected": def("Integration Connected", "integrations", "Integrations", "integrations-service"),
  "integration.disconnected": def("Integration Disconnected", "integrations", "Integrations", "integrations-service"),
  "integration.token_refreshed": def("Integration Token Refreshed", "integrations", "Integrations", "integrations-service"),
  "integration.provider_configuration_changed": def("Provider Configuration Updated", "integrations", "Integrations", "integrations-service", { sensitive: "integrations", priority: "review_recommended" }),
  "integration.reauthorization_requested": def("Reauthorization Requested", "integrations", "Integrations", "integrations-service", { sensitive: "integrations" }),

  /* Feature flags */
  "feature_flag.created": def("Feature Flag Created", "feature_flags", "Feature Flags", "flags-service"),
  "feature_flag.rollout_changed": def("Feature Rollout Changed", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags" }),
  "feature_flag.state_changed": def("Feature Flag State Changed", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags" }),
  "feature_flag.emergency_disabled": def("Feature Emergency Disabled", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags", priority: "high" }),
  "feature_flag.emergency_restored": def("Feature Restored From Emergency Off", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags", priority: "review_recommended" }),
  "feature_flag.change_requested": def("Feature Flag Change Requested", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags" }),
  "feature_flag.metadata_updated": def("Feature Flag Details Updated", "feature_flags", "Feature Flags", "flags-service"),
  "feature_flag.lifecycle_changed": def("Feature Flag Lifecycle Changed", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags" }),
  "feature_flag.dependency_updated": def("Feature Dependency Updated", "feature_flags", "Feature Flags", "flags-service", { sensitive: "feature_flags" }),

  /* Global settings */
  "global_settings.setting_changed": def("Platform Setting Changed", "global_settings", "Global Settings", "settings-service"),
  "global_settings.security_change_requested": def("Security Policy Change Requested", "global_settings", "Global Settings", "settings-service", { securityView: "policies", sensitive: "platform_security", priority: "review_recommended" }),
  "global_settings.security_change_applied": def("Security Policy Applied", "global_settings", "Global Settings", "settings-service", { securityView: "policies", sensitive: "platform_security", priority: "review_recommended" }),
  "global_settings.privacy_change_applied": def("Data & Privacy Policy Changed", "global_settings", "Global Settings", "settings-service", { sensitive: "data_privacy", priority: "review_recommended" }),
  "global_settings.maintenance_changed": def("Maintenance Setting Changed", "global_settings", "Global Settings", "settings-service", { sensitive: "maintenance_availability" }),
  "global_settings.governance_changed": def("Access Governance Changed", "global_settings", "Global Settings", "settings-service", { securityView: "policies", sensitive: "platform_security" }),

  /* Support & operations */
  "support.ticket_reassigned": def("Ticket Reassigned", "support_operations", "Support & Tickets", "support-service"),
  "queue.paused": def("Queue Paused", "support_operations", "Jobs & Queues", "jobs-service", { sensitive: "maintenance_availability", priority: "review_recommended" }),
  "maintenance.window_scheduled": def("Maintenance Window Scheduled", "support_operations", "System Health", "health-service", { sensitive: "maintenance_availability" }),
  "audit.export_generated": def("Audit Export Generated", "support_operations", "Audit Logs", "audit-frontend", { sensitive: "data_privacy", priority: "review_recommended" }),
  "audit.export_denied": def("Audit Export Denied", "support_operations", "Audit Logs", "audit-frontend", { sensitive: "data_privacy" }),
  "data.export_requested": def("Company Data Export Requested", "companies", "Companies", "privacy-service", { sensitive: "data_privacy", priority: "review_recommended" }),
};

/** Older and module-local keys, mapped to the one canonical key for the operation. */
const ALIASES: Record<string, string> = {
  "user.login_failed": "auth.login_failed",
  "user.login": "auth.login_succeeded",
  "company.suspended": "company.status_changed",
  "company.reactivated": "company.status_changed",
  "company.archived": "company.status_changed",
  "company.updated": "company.profile_updated",
  "company.internal_owner_changed": "company.operational_owner_changed",
  "user.role_changed": "user.company_role_changed",
  "owner.invited": "user.invited",
  "owner.invitation_resent": "user.invitation_resent",
  "user.two_factor_required": "user.mfa_requirement_changed",
  "payment.received": "billing.payment_received",
  "payment.failed": "billing.payment_failed",
  "payment.refunded": "billing.refund_confirmed",
  "billing.refund_issued": "billing.refund_confirmed",
  "team.member_assigned": "client.access_granted",
  "team.access_changed": "client.access_changed",
  "team.access_removed": "client.access_revoked",
  "website.added": "client.website_changed",
  "website.removed": "client.website_changed",
  "website.updated": "client.website_changed",
  "website.primary_changed": "client.website_changed",
  "channel.reconnection_requested": "integration.reauthorization_requested",
  "channel.connected": "integration.connected",
  "security.policy_changed": "company.security_policy_changed",
  "security.sessions_revocation_requested": "auth.session_revoked",
  "security.password_reset_requested": "auth.password_reset_requested",
  "subscription.scheduled_change_rescheduled": "subscription.scheduled_change_updated",
  "subscription.scheduled_change_cancelled": "subscription.scheduled_change_updated",
  "plan.created": "plan.updated",
  "plan.version_created": "plan.updated",
  "feature_flag.toggled": "feature_flag.state_changed",
  "settings.updated": "global_settings.setting_changed",
  "admin.permission_denied": "auth.security_challenge_denied",
};

export function canonicalKey(raw: string): string {
  return ALIASES[raw] ?? raw;
}

const titleWord = (word: string) => (word ? word[0]!.toUpperCase() + word.slice(1) : word);

/** A readable label for a key that is not in the catalogue, so an unfamiliar action is still legible. */
export function fallbackLabel(key: string): string {
  return key.split(/[._]/).filter(Boolean).map(titleWord).join(" ");
}

export function actionDef(key: string): ActionDef | null {
  return ACTIONS[key] ?? null;
}

export function actionLabel(key: string): string {
  return ACTIONS[key]?.label ?? fallbackLabel(key);
}

export const SENSITIVE_CLASSIFICATION: ReadonlyArray<{ category: SensitiveCategory; label: string; description: string }> = [
  { category: "privileged_access", label: "Privileged Access", description: "Changes to who holds elevated access: platform or company roles, suspensions, ownership and company status." },
  { category: "billing_financial", label: "Billing & Financial", description: "Money movement and its approval: refunds, credit notes, payment allocation and billing adjustments." },
  { category: "subscription_entitlements", label: "Subscription & Entitlements", description: "Changes to what a company is entitled to: plan changes, trials, cancellations, plan publication and usage overrides." },
  { category: "integrations", label: "Integrations", description: "Provider connection and configuration changes, disconnections and reauthorisation requests." },
  { category: "feature_flags", label: "Feature Flags", description: "Rollout, state and emergency changes to platform features." },
  { category: "platform_security", label: "Platform Security", description: "Security policy changes and their approval, including company security policy." },
  { category: "data_privacy", label: "Data & Privacy", description: "Exports, retention and privacy policy changes." },
  { category: "maintenance_availability", label: "Maintenance & Availability", description: "Queue, maintenance and access-restriction changes that affect availability." },
];

/** A failed or denied sensitive action is raised one level; a success keeps the catalogue priority. */
export function priorityFor(key: string, outcome: string): ReviewPriority {
  const definition = actionDef(key);
  const base: ReviewPriority = definition?.priority ?? "informational";
  if (!definition?.sensitive) return outcome === "denied" ? "review_recommended" : base;
  if (outcome === "failed" || outcome === "denied") return base === "informational" ? "review_recommended" : "high";
  if (outcome === "pending") return base === "informational" ? "review_recommended" : base;
  return base;
}
