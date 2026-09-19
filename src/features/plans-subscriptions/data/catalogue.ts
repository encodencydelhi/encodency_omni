import { QUOTA_METRICS, type Plan, type QuotaMetric } from "@/types/domain/plan";
import type { EntitlementCatalogueItem, PlatformPlan, PlanFeature, PlanLimit, PlanPublicationStatus } from "./types";

export const ENTITLEMENT_CATALOGUE: EntitlementCatalogueItem[] = [
  { key: "clients", displayName: "Max Clients", description: "Concurrent client workspaces a company may operate.", category: "Organization", valueType: "integer", unit: "clients", resetPeriod: "none", supportedLimits: ["Clients"], dependencies: [] },
  { key: "users", displayName: "Max Users", description: "Company users that can be active at the same time.", category: "Team & Governance", valueType: "integer", unit: "users", resetPeriod: "none", supportedLimits: ["users"], dependencies: [] },
  { key: "connectedAccounts", displayName: "Connected Accounts", description: "Social, website and messaging account connections.", category: "Marketing", valueType: "integer", unit: "accounts", resetPeriod: "none", supportedLimits: ["channels"], dependencies: [] },
  { key: "aiCredits", displayName: "AI Credits", description: "AI generation and optimization credits.", category: "AI & Automation", valueType: "metered", unit: "credits", resetPeriod: "billing_cycle", supportedLimits: ["aiCredits"], dependencies: [] },
  { key: "automationRuns", displayName: "Automation Runs", description: "Workflow executions included in the plan.", category: "AI & Automation", valueType: "metered", unit: "runs", resetPeriod: "billing_cycle", supportedLimits: ["automationRuns"], dependencies: [] },
  { key: "scheduledPosts", displayName: "Scheduled Posts", description: "Publishing volume governed by automations and channels.", category: "Marketing", valueType: "metered", unit: "posts", resetPeriod: "monthly", supportedLimits: ["automationRuns"], dependencies: ["connectedAccounts"] },
  { key: "website_monitoring", displayName: "Website Monitoring", description: "Website health and monitoring workspace.", category: "Website & SEO", valueType: "boolean", unit: "enabled", resetPeriod: "none", supportedLimits: ["seoPages"], dependencies: [] },
  { key: "seo_audits", displayName: "SEO Audits", description: "Pages crawled and audited for SEO.", category: "Website & SEO", valueType: "metered", unit: "pages", resetPeriod: "monthly", supportedLimits: ["seoPages"], dependencies: ["website_monitoring"] },
  { key: "api_access", displayName: "API Access", description: "Access to platform APIs.", category: "Platform/API", valueType: "boolean", unit: "enabled", resetPeriod: "none", supportedLimits: ["apiCalls"], dependencies: [] },
  { key: "webhook_access", displayName: "Webhook Access", description: "Outbound webhook delivery.", category: "Platform/API", valueType: "boolean", unit: "enabled", resetPeriod: "none", supportedLimits: ["apiCalls"], dependencies: ["api_access"] },
];

export const FEATURE_LIBRARY: Array<Omit<PlanFeature, "enabled">> = [
  { key: "publisher", label: "Omnichannel publisher", category: "Marketing" },
  { key: "automation", label: "Automation engine", category: "AI & Automation" },
  { key: "ai_assistant", label: "AI marketing assistant", category: "AI & Automation" },
  { key: "seo", label: "SEO site audit", category: "Website & SEO" },
  { key: "permissions", label: "Client-level permissions", category: "Team & Governance" },
  { key: "api", label: "API access", category: "Platform/API" },
  { key: "webhooks", label: "Webhook access", category: "Platform/API" },
  { key: "sla", label: "Named success manager", category: "Team & Governance" },
];

export function limitsFromPlan(plan: Plan): PlanLimit[] {
  return (Object.keys(plan.limits) as QuotaMetric[]).map((key) => ({
    key,
    label: QUOTA_METRICS[key].label,
    value: plan.limits[key],
    unit: QUOTA_METRICS[key].unit,
    resetPeriod: key === "Clients" || key === "users" || key === "channels" ? "none" : "billing_cycle",
  }));
}

export function platformPlanFromPlan(plan: Plan): PlatformPlan {
  const publicationStatus: PlanPublicationStatus = plan.isArchived ? "retired" : plan.isPublic ? "published" : "hidden";
  const features = FEATURE_LIBRARY.map((feature) => ({
    ...feature,
    enabled: plan.features.some((item) => item.toLowerCase().includes(feature.label.toLowerCase().split(" ")[0] ?? feature.key)) || ["publisher", "seo"].includes(feature.key),
  }));
  return {
    ...plan,
    internalCode: plan.tier.toUpperCase(),
    publicationStatus,
    targetSegment: plan.tier === "enterprise" ? "Enterprise and strategic accounts" : plan.tier === "agency" ? "Marketing agencies" : plan.tier === "growth" ? "Growing brand teams" : "Starter tenants",
    internalNotes: "Demo commercial configuration. Backend contract pending.",
    availability: {
      visibleToNewCustomers: plan.isPublic,
      regions: ["India", "United States", "United Kingdom"],
      signupModes: plan.tier === "enterprise" ? ["sales_assisted"] : ["self_serve", "sales_assisted"],
    },
    versions: [
      {
        id: `${plan.id}_v1`,
        planId: plan.id,
        version: 1,
        status: "published",
        publishedAt: plan.updatedAt,
        prices: { currency: plan.currency, monthlyMinor: plan.monthlyPriceMinor, annualMinor: plan.annualPriceMinor, setupFeeMinor: 0, trialDays: plan.trialDays },
        features,
        limits: limitsFromPlan(plan),
        note: "Published snapshot generated from the existing shared catalogue.",
      },
    ],
  };
}
