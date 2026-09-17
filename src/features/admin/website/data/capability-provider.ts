/**
 * Capability model.
 *
 * Every screen in this module asks the same question before it renders data:
 * *can we actually know this?* A URL alone buys us crawling, auditing and
 * monitoring. Anything about real visitors needs an integration the client has
 * to grant. This file is the one place that mapping lives.
 */

import type {
  IntegrationKey,
  IntegrationState,
  WebsiteCapability,
  WebsiteCapabilityState,
} from "./types";

/** Named units of functionality the UI gates on. */
export type WebsiteFeature =
  | "crawl"
  | "seo-audit"
  | "performance-audit"
  | "accessibility-audit"
  | "form-detection"
  | "cta-detection"
  | "uptime-monitoring"
  | "ssl-check"
  | "technology-detection"
  | "security-hygiene"
  | "screenshots"
  | "change-detection"
  | "search-performance"
  | "audience-analytics"
  | "behaviour-events"
  | "heatmaps";

interface FeatureRule {
  label: string;
  /** URL-only capability this feature needs, if any. */
  capability?: WebsiteCapability;
  /** Integration that must be connected, if any. */
  integration?: IntegrationKey;
  /** Statuses of that integration which count as "on". */
  satisfiedBy?: IntegrationState["status"][];
  /** Shown when the feature is locked. */
  lockedTitle: string;
  lockedBody: string;
  ctaLabel: string;
}

const FEATURE_RULES: Record<WebsiteFeature, FeatureRule> = {
  crawl: {
    label: "Website crawl",
    capability: "canCrawlWebsite",
    lockedTitle: "Crawling unavailable",
    lockedBody: "We could not reach this website to discover its pages.",
    ctaLabel: "Retry scan",
  },
  "seo-audit": {
    label: "SEO audit",
    capability: "canAuditSEO",
    lockedTitle: "SEO audit unavailable",
    lockedBody: "SEO auditing needs a completed crawl of this website.",
    ctaLabel: "Run a scan",
  },
  "performance-audit": {
    label: "Performance audit",
    capability: "canAuditPerformance",
    lockedTitle: "Performance audit unavailable",
    lockedBody: "Performance measurement needs a completed crawl of this website.",
    ctaLabel: "Run a scan",
  },
  "accessibility-audit": {
    label: "Accessibility audit",
    capability: "canAuditAccessibility",
    lockedTitle: "Accessibility audit unavailable",
    lockedBody: "Accessibility checks need a completed crawl of this website.",
    ctaLabel: "Run a scan",
  },
  "form-detection": {
    label: "Form detection",
    capability: "canDetectForms",
    lockedTitle: "Form detection unavailable",
    lockedBody: "Forms are found by reading the public HTML of each page.",
    ctaLabel: "Run a scan",
  },
  "cta-detection": {
    label: "CTA detection",
    capability: "canDetectCTAs",
    lockedTitle: "CTA detection unavailable",
    lockedBody: "CTAs are found by reading the public HTML of each page.",
    ctaLabel: "Run a scan",
  },
  "uptime-monitoring": {
    label: "Uptime monitoring",
    capability: "canMonitorUptime",
    lockedTitle: "Uptime monitoring is off",
    lockedBody: "Turn monitoring on to check this website from three regions every few minutes.",
    ctaLabel: "Open monitoring settings",
  },
  "ssl-check": {
    label: "SSL check",
    capability: "canCheckSSL",
    lockedTitle: "Certificate check unavailable",
    lockedBody: "We could not complete a TLS handshake with this website.",
    ctaLabel: "Retry check",
  },
  "technology-detection": {
    label: "Technology detection",
    capability: "canDetectTechnologies",
    lockedTitle: "Technology detection unavailable",
    lockedBody: "Technologies are inferred from public responses during a crawl.",
    ctaLabel: "Run a scan",
  },
  "security-hygiene": {
    label: "Security hygiene",
    capability: "canCheckSecurityHygiene",
    lockedTitle: "Security hygiene checks unavailable",
    lockedBody: "These checks read public response headers during a crawl.",
    ctaLabel: "Run a scan",
  },
  screenshots: {
    label: "Visual snapshots",
    capability: "canCaptureScreenshots",
    lockedTitle: "Visual snapshots unavailable",
    lockedBody: "Snapshots need a screenshot worker, which is not connected yet.",
    ctaLabel: "Learn more",
  },
  "change-detection": {
    label: "Change detection",
    capability: "canDetectChanges",
    lockedTitle: "Change detection unavailable",
    lockedBody: "Changes are found by comparing consecutive crawls of the same page.",
    ctaLabel: "Run a scan",
  },
  "search-performance": {
    label: "Search performance",
    integration: "searchConsole",
    satisfiedBy: ["connected"],
    lockedTitle: "Search Console not connected",
    lockedBody:
      "Connect Google Search Console to unlock real organic search performance: queries, clicks, impressions, CTR and average position.",
    ctaLabel: "Connect Search Console",
  },
  "audience-analytics": {
    label: "Audience analytics",
    integration: "ga4",
    satisfiedBy: ["connected"],
    lockedTitle: "Google Analytics not connected",
    lockedBody:
      "Connect GA4 to unlock users, sessions, traffic sources, engagement, top pages, conversions, devices and geography.",
    ctaLabel: "Connect Google Analytics",
  },
  "behaviour-events": {
    label: "On-page behaviour",
    integration: "omniTracking",
    satisfiedBy: ["installed"],
    lockedTitle: "Omni Tracking not installed",
    lockedBody:
      "Install the Omni Tracking snippet to capture CTA clicks, form starts, form submits, scroll depth and custom events.",
    ctaLabel: "Set up Omni Tracking",
  },
  heatmaps: {
    label: "Heatmaps",
    integration: "omniTracking",
    satisfiedBy: ["installed"],
    lockedTitle: "Heatmaps require Omni Tracking",
    lockedBody:
      "Heatmaps are built from real interaction events. Without the tracking snippet there is nothing to plot, and we will not show invented visitor data.",
    ctaLabel: "Set up Omni Tracking",
  },
};

export interface FeatureAvailability {
  feature: WebsiteFeature;
  available: boolean;
  label: string;
  lockedTitle: string;
  lockedBody: string;
  ctaLabel: string;
  /** Set when an integration is what is missing, so the CTA can route. */
  requiredIntegration: IntegrationKey | null;
}

export function evaluateFeature(
  state: WebsiteCapabilityState | undefined,
  feature: WebsiteFeature,
): FeatureAvailability {
  const rule = FEATURE_RULES[feature];
  let available = true;

  if (!state) {
    available = false;
  } else {
    if (rule.capability) available = state.capabilities[rule.capability] === true;
    if (available && rule.integration) {
      const status = state.integrations[rule.integration].status;
      available = (rule.satisfiedBy ?? ["connected"]).includes(status);
    }
  }

  return {
    feature,
    available,
    label: rule.label,
    lockedTitle: rule.lockedTitle,
    lockedBody: rule.lockedBody,
    ctaLabel: rule.ctaLabel,
    requiredIntegration: rule.integration ?? null,
  };
}

/** The four integration slots, in the order they are shown everywhere. */
export const INTEGRATION_ORDER: IntegrationKey[] = ["ga4", "searchConsole", "omniTracking", "ownership"];

export function integrationTone(status: IntegrationState["status"]): "good" | "warn" | "muted" {
  if (status === "connected" || status === "installed") return "good";
  if (status === "needs-attention" || status === "pending-verification") return "warn";
  return "muted";
}

export function integrationStatusLabel(status: IntegrationState["status"]): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "installed":
      return "Installed";
    case "needs-attention":
      return "Needs attention";
    case "pending-verification":
      return "Pending verification";
    case "not-installed":
      return "Not installed";
    default:
      return "Not connected";
  }
}

/** The unlock ladder, rendered in Settings and in locked states. */
export const UNLOCK_MODEL: { key: string; title: string; requires: string; unlocks: string[] }[] = [
  {
    key: "url",
    title: "Website URL",
    requires: "Saved on the Client Profile",
    unlocks: [
      "Crawl & page discovery",
      "SEO audit",
      "Performance audit",
      "Accessibility audit",
      "Form & CTA detection",
      "Uptime & SSL monitoring",
      "Technical + security hygiene",
    ],
  },
  {
    key: "ga4",
    title: "URL + Google Analytics 4",
    requires: "Client grants read access to a GA4 property",
    unlocks: ["Users", "Sessions", "Traffic sources", "Conversions", "Events"],
  },
  {
    key: "search-console",
    title: "URL + Search Console",
    requires: "Property verified and shared with us",
    unlocks: ["Queries", "Clicks", "Impressions", "CTR", "Average position"],
  },
  {
    key: "omni-tracking",
    title: "URL + Omni Tracking",
    requires: "Snippet added to the website",
    unlocks: ["CTA clicks", "Form starts", "Form submits", "Scroll depth", "Custom events", "Heatmaps"],
  },
];

/** Human labels for the URL-only capability list shown in Settings. */
export const CAPABILITY_LABELS: Record<WebsiteCapability, string> = {
  canCrawlWebsite: "Crawl website",
  canAuditSEO: "Audit SEO",
  canAuditPerformance: "Audit performance",
  canAuditAccessibility: "Audit accessibility",
  canDetectForms: "Detect forms",
  canDetectCTAs: "Detect CTAs",
  canMonitorUptime: "Monitor uptime",
  canCheckSSL: "Check SSL",
  canDetectTechnologies: "Detect technologies",
  canCheckSecurityHygiene: "Check security hygiene",
  canCaptureScreenshots: "Capture screenshots",
  canDetectChanges: "Detect changes",
};
