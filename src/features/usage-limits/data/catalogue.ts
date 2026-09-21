/**
 * The resource catalogue's operating policy.
 *
 * The list of resources is not defined here: it is the one shared catalogue
 * (`USAGE_RESOURCES` in Companies, keyed the same way as the plan entitlement
 * catalogue). This file adds what Usage & Limits needs on top of each resource:
 * how it is measured, when it resets, its thresholds, what happens at the limit
 * and where the numbers come from. Keeping it in one table means no component
 * invents a policy of its own.
 */
import { USAGE_RESOURCES, USAGE_THRESHOLDS } from "@/features/companies/data/config";
import type { ResourceCategory, ResourceDefinition, ResourceKey } from "./types";

type Policy = Omit<ResourceDefinition, "key" | "name" | "unit" | "unitSingular" | "planControlled">;

const DEFAULT_WARNING = USAGE_THRESHOLDS.nearLimit;
const DEFAULT_CRITICAL = 95;

const POLICY: Record<ResourceKey, Policy> = {
  users: {
    category: "organization",
    description: "Members of a company workspace who hold a seat.",
    measurement: "concurrent_capacity",
    resetPolicy: "none",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New invitations are blocked under the configured policy. Existing members keep access.",
    meteringSource: "Company user records",
    freshnessHours: 24,
    clientAttribution: "none",
    relatedFeatures: ["Team management", "Role-based access"],
    countingPolicy: "Active and suspended members hold a seat. Pending invitations do not consume a seat yet.",
    policyStatus: "pending",
  },
  clients: {
    category: "organization",
    description: "Client workspaces (brands) managed inside a company.",
    measurement: "concurrent_capacity",
    resetPolicy: "none",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New client creation is blocked under the configured policy. Existing clients are retained.",
    meteringSource: "Client records",
    freshnessHours: 24,
    clientAttribution: "none",
    relatedFeatures: ["Multiple client workspaces"],
    countingPolicy: "Every client record in the company counts. Whether archived clients free their slot is not finalised.",
    policyStatus: "pending",
  },
  connectedAccounts: {
    category: "organization",
    description: "Connected channel and provider accounts.",
    measurement: "concurrent_capacity",
    resetPolicy: "none",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New connections are blocked under the configured policy. Existing connections keep working.",
    meteringSource: "Integration records",
    freshnessHours: 24,
    clientAttribution: "none",
    relatedFeatures: ["Channel connections"],
    countingPolicy: "Every connected account counts, including one that needs reconnection. Disconnected accounts are not finalised.",
    policyStatus: "pending",
  },
  scheduledPosts: {
    category: "marketing",
    description: "Posts currently waiting in the publishing schedule.",
    measurement: "concurrent_capacity",
    resetPolicy: "none",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "Not limited by plan. Monitored for capacity planning only.",
    meteringSource: "Publishing schedule",
    freshnessHours: 24,
    clientAttribution: "direct",
    relatedFeatures: ["Omnichannel publisher"],
    countingPolicy: "Posts in the schedule queue count. Published and failed posts do not.",
    policyStatus: "defined",
  },
  storage: {
    category: "marketing",
    description: "Retained media stored for a company.",
    measurement: "capacity_snapshot",
    resetPolicy: "none",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New uploads are blocked under the configured policy. Existing media is never deleted automatically.",
    meteringSource: "Storage reconciliation",
    freshnessHours: 48,
    clientAttribution: "none",
    relatedFeatures: ["Media library"],
    countingPolicy: "Retained media counts at the last reconciled size. Deleted media stops counting after reconciliation.",
    policyStatus: "defined",
  },
  aiCredits: {
    category: "ai_automation",
    description: "Credits consumed by AI generation and analysis.",
    measurement: "metered_period",
    resetPolicy: "billing_cycle",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New credit-consuming operations are blocked or deferred under the configured policy. Existing generated content is retained.",
    meteringSource: "AI usage events",
    freshnessHours: 6,
    clientAttribution: "event_level",
    relatedFeatures: ["AI assistant"],
    countingPolicy: "Credits used by completed generations. Failed generations are not charged.",
    policyStatus: "defined",
  },
  automationRuns: {
    category: "ai_automation",
    description: "Executions of automation workflows.",
    measurement: "metered_period",
    resetPolicy: "billing_cycle",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New runs are blocked or deferred under the configured policy. Existing run history is retained.",
    meteringSource: "Automation run events",
    freshnessHours: 6,
    clientAttribution: "event_level",
    relatedFeatures: ["Automation engine"],
    countingPolicy: "Completed and failed runs count. Whether failed runs should count is not finalised.",
    policyStatus: "pending",
  },
  reports: {
    category: "marketing",
    description: "Reports generated for clients.",
    measurement: "metered_period",
    resetPolicy: "billing_cycle",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "New report generation is blocked under the configured policy. Existing reports remain available.",
    meteringSource: "Report service events",
    freshnessHours: 12,
    clientAttribution: "event_level",
    relatedFeatures: ["Reporting"],
    countingPolicy: "Each generated report counts once. Re-downloading a report does not.",
    policyStatus: "defined",
  },
  apiRequests: {
    category: "platform_api",
    description: "Authenticated requests to the platform API.",
    measurement: "metered_period",
    resetPolicy: "billing_cycle",
    warningPct: DEFAULT_WARNING,
    criticalPct: DEFAULT_CRITICAL,
    overLimitBehavior: "Requests are rate-limited or rejected under the configured policy.",
    meteringSource: "API gateway counters",
    freshnessHours: 1,
    clientAttribution: "none",
    relatedFeatures: ["API access"],
    countingPolicy: "Authenticated requests count. Rate-limited requests are not finalised.",
    policyStatus: "pending",
  },
};

export const RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = USAGE_RESOURCES.map((base) => ({
  key: base.key,
  name: base.label,
  unit: base.unit,
  unitSingular: base.unit.replace(/s$/, ""),
  planControlled: base.metric !== null,
  ...POLICY[base.key],
}));

export const RESOURCE_BY_KEY: Readonly<Record<ResourceKey, ResourceDefinition>> = Object.fromEntries(RESOURCE_DEFINITIONS.map((item) => [item.key, item])) as Record<ResourceKey, ResourceDefinition>;

export const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  organization: "Organization",
  marketing: "Marketing",
  ai_automation: "AI & Automation",
  website_seo: "Website & SEO",
  platform_api: "Platform / API",
};

export const MEASUREMENT_LABEL = {
  concurrent_capacity: { label: "Concurrent Capacity", description: "The number of qualifying records right now. It does not accumulate and never resets." },
  metered_period: { label: "Metered Period Quota", description: "Consumption summed over a defined measurement period." },
  capacity_snapshot: { label: "Capacity Snapshot", description: "The current reconciled quantity, not a sum of events." },
} as const;

export const RESET_LABEL = {
  none: "No Periodic Reset",
  billing_cycle: "Billing Cycle",
  calendar_month: "Calendar Month",
} as const;

export function getResource(key: string): ResourceDefinition | undefined {
  return RESOURCE_DEFINITIONS.find((item) => item.key === key);
}

export function isFlowResource(key: ResourceKey): boolean {
  return RESOURCE_BY_KEY[key].measurement === "metered_period";
}

/** The resources whose consumption is metered from events, in the order the overview offers them. */
export const METERED_RESOURCES: readonly ResourceKey[] = RESOURCE_DEFINITIONS.filter((item) => item.measurement === "metered_period").map((item) => item.key);

export function formatQuantity(value: number | null, resource: ResourceKey): string {
  if (value === null) return "-";
  return `${value.toLocaleString("en-IN")} ${RESOURCE_BY_KEY[resource].unit}`;
}
