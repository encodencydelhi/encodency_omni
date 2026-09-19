/**
 * The one entitlement catalogue.
 *
 * Every screen that names a feature or a limit reads it from here: the plan
 * editor, plan comparison, subscription entitlements, company usage and the
 * client-creation check. Nothing else declares keys, units or reset periods.
 */
import { QUOTA_METRICS } from "@/types/domain/plan";
import type { EntitlementCategory, FeatureDef, LimitKind, LimitRule, ResourceDef, ResourceKey } from "./types";

export const ENTITLEMENT_CATEGORIES: readonly EntitlementCategory[] = [
  "Organization",
  "Marketing",
  "AI & Automation",
  "Website & SEO",
  "Team & Governance",
  "Platform/API",
];

const CAPACITY: LimitKind[] = ["none", "fixed", "unlimited", "custom"];

/**
 * Measurable allowances. Only resources the platform can actually measure are
 * listed - each one maps to a limit the company usage views already report on.
 */
export const RESOURCES: readonly ResourceDef[] = [
  { key: "Clients", name: "Max Clients", description: "Client workspaces a company may operate at the same time.", category: "Organization", kind: "capacity", unit: "clients", resetPeriod: "none", usageResource: "clients", supportedKinds: CAPACITY },
  { key: "users", name: "Max Users", description: "Company members who may be active at the same time.", category: "Team & Governance", kind: "capacity", unit: "users", resetPeriod: "none", usageResource: "users", supportedKinds: CAPACITY },
  { key: "channels", name: "Connected Accounts", description: "Social, search and messaging accounts connected across all clients.", category: "Marketing", kind: "capacity", unit: "accounts", resetPeriod: "none", usageResource: "connectedAccounts", supportedKinds: CAPACITY },
  { key: "storageGb", name: "Media Storage", description: "Stored media and files.", category: "Marketing", kind: "capacity", unit: "GB", resetPeriod: "none", usageResource: "storage", supportedKinds: CAPACITY },
  { key: "reports", name: "Reports Generated", description: "Reports generated in the period.", category: "Marketing", kind: "metered", unit: "reports", resetPeriod: "billing_cycle", usageResource: "reports", supportedKinds: CAPACITY },
  { key: "whatsappMessages", name: "WhatsApp Messages", description: "Business messages sent through the connected WhatsApp account.", category: "Marketing", kind: "metered", unit: "messages", resetPeriod: "monthly", usageResource: null, supportedKinds: CAPACITY },
  { key: "aiCredits", name: "AI Credits", description: "Credits consumed by AI generation and optimisation.", category: "AI & Automation", kind: "metered", unit: "credits", resetPeriod: "billing_cycle", usageResource: "aiCredits", supportedKinds: CAPACITY },
  { key: "automationRuns", name: "Automation Runs", description: "Workflow executions in the period.", category: "AI & Automation", kind: "metered", unit: "runs", resetPeriod: "billing_cycle", usageResource: "automationRuns", supportedKinds: CAPACITY },
  { key: "seoPages", name: "SEO Pages Crawled", description: "Pages crawled and audited for SEO in the period.", category: "Website & SEO", kind: "metered", unit: "pages", resetPeriod: "monthly", usageResource: null, supportedKinds: CAPACITY },
  { key: "apiCalls", name: "API Requests", description: "Requests made to the platform API in the period.", category: "Platform/API", kind: "metered", unit: "requests", resetPeriod: "billing_cycle", usageResource: "apiRequests", supportedKinds: CAPACITY },
];

export const RESOURCE_BY_KEY: Readonly<Record<ResourceKey, ResourceDef>> = Object.fromEntries(RESOURCES.map((item) => [item.key, item])) as Record<ResourceKey, ResourceDef>;

/** Boolean capabilities. Only things the product actually ships are listed. */
export const FEATURES: readonly FeatureDef[] = [
  { key: "multiple_clients", name: "Multiple client workspaces", description: "Operate more than one client under the company.", category: "Organization", dependencies: [] },
  { key: "custom_branding", name: "Custom branding", description: "White-label reports and workspaces.", category: "Organization", dependencies: [] },

  { key: "omnichannel_publisher", name: "Omnichannel publisher", description: "Compose and schedule posts across connected channels.", category: "Marketing", dependencies: [] },
  { key: "approval_workflows", name: "Approval workflows", description: "Review and approve content before it publishes.", category: "Marketing", dependencies: ["omnichannel_publisher"] },
  { key: "campaign_attribution", name: "Campaign attribution", description: "Attribute leads and results to campaigns.", category: "Marketing", dependencies: [] },
  { key: "lead_inbox", name: "Lead inbox", description: "Collect and triage inbound leads.", category: "Marketing", dependencies: [] },
  { key: "channel_meta", name: "Meta / Instagram", description: "Facebook and Instagram connections.", category: "Marketing", dependencies: [] },
  { key: "channel_linkedin", name: "LinkedIn", description: "LinkedIn page connections.", category: "Marketing", dependencies: [] },
  { key: "channel_google_business", name: "Google Business Profile", description: "Google Business Profile connections.", category: "Marketing", dependencies: [] },
  { key: "channel_whatsapp", name: "WhatsApp", description: "WhatsApp business messaging.", category: "Marketing", dependencies: [] },
  { key: "channel_youtube", name: "YouTube", description: "YouTube channel connections.", category: "Marketing", dependencies: [] },

  { key: "ai_assistant", name: "AI marketing assistant", description: "AI content and insight assistance.", category: "AI & Automation", dependencies: [] },
  { key: "automation_engine", name: "Automation builder", description: "Build and run workflow automations.", category: "AI & Automation", dependencies: [] },
  { key: "advanced_conditions", name: "Advanced automation conditions", description: "Branching, filters and multi-step conditions.", category: "AI & Automation", dependencies: ["automation_engine"] },

  { key: "seo_audit", name: "SEO site audit", description: "Crawl and audit client websites.", category: "Website & SEO", dependencies: [] },
  { key: "website_monitoring", name: "Website monitoring", description: "Uptime and health monitoring for client websites.", category: "Website & SEO", dependencies: [] },
  { key: "keyword_tracking", name: "Keyword tracking", description: "Track keyword positions over time.", category: "Website & SEO", dependencies: ["seo_audit"] },
  { key: "gsc_reporting", name: "Search Console reporting", description: "Reporting from Google Search Console.", category: "Website & SEO", dependencies: ["seo_audit"] },
  { key: "ga4_reporting", name: "GA4 reporting", description: "Reporting from Google Analytics 4.", category: "Website & SEO", dependencies: [] },

  { key: "client_permissions", name: "Client-level permissions", description: "Restrict members to specific clients.", category: "Team & Governance", dependencies: ["multiple_clients"] },
  { key: "extended_audit", name: "Extended audit retention", description: "Longer retention of audit history.", category: "Team & Governance", dependencies: [] },
  { key: "priority_support", name: "Priority support", description: "Faster support response.", category: "Team & Governance", dependencies: [] },
  { key: "success_manager", name: "Named success manager", description: "A dedicated OmniPlatform contact.", category: "Team & Governance", dependencies: ["priority_support"] },

  { key: "api_access", name: "API access", description: "Access to the platform API.", category: "Platform/API", dependencies: [] },
  { key: "webhooks", name: "Webhooks", description: "Outbound webhook delivery.", category: "Platform/API", dependencies: ["api_access"] },
];

export const FEATURE_BY_KEY: Readonly<Record<string, FeatureDef>> = Object.fromEntries(FEATURES.map((item) => [item.key, item]));

export function featuresIn(category: EntitlementCategory): FeatureDef[] {
  return FEATURES.filter((item) => item.category === category);
}
export function resourcesIn(category: EntitlementCategory): ResourceDef[] {
  return RESOURCES.filter((item) => item.category === category);
}

/* ------------------------------------------------------------------ */
/* Limit helpers                                                       */
/* ------------------------------------------------------------------ */

/** The numeric limit a rule stands for: null is unlimited, 0 is not available. */
export function ruleToLimit(rule: LimitRule): number | null {
  switch (rule.kind) {
    case "none":
      return 0;
    case "unlimited":
      return null;
    default:
      return rule.value ?? 0;
  }
}

export function limitToRule(limit: number | null, kind?: LimitKind): LimitRule {
  if (limit === null) return { kind: "unlimited", value: null };
  if (limit === 0) return { kind: "none", value: null };
  return { kind: kind === "custom" ? "custom" : "fixed", value: limit };
}

export function formatRule(rule: LimitRule, unit?: string): string {
  switch (rule.kind) {
    case "none":
      return "Not available";
    case "unlimited":
      return "Unlimited";
    default:
      return `${new Intl.NumberFormat("en-IN").format(rule.value ?? 0)}${unit ? ` ${unit}` : ""}${rule.kind === "custom" ? " (custom)" : ""}`;
  }
}

export function formatLimitValue(limit: number | null, unit?: string): string {
  if (limit === null) return "Unlimited";
  if (limit === 0) return "Not available";
  return `${new Intl.NumberFormat("en-IN").format(limit)}${unit ? ` ${unit}` : ""}`;
}

export function rulesEqual(a: LimitRule, b: LimitRule): boolean {
  return a.kind === b.kind && (a.value ?? null) === (b.value ?? null);
}

export function quotaLabel(key: ResourceKey): string {
  return QUOTA_METRICS[key].label;
}
