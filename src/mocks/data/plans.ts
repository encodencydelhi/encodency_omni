import type { Plan, PlanTier, QuotaLimits } from "@/types/domain/plan";
import { daysAgo } from "../lib/random";

/**
 * The commercial plan catalogue.
 *
 * Limits are authored here rather than derived, because plan packaging is a
 * business decision that the backend will eventually own verbatim.
 */
export const PLANS: Plan[] = [
  {
    id: "plan_starter",
    tier: "starter",
    name: "Starter",
    description: "For a single brand taking its first steps on the platform.",
    isPublic: true,
    isArchived: false,
    monthlyPriceMinor: 490000,
    annualPriceMinor: 4900000,
    currency: "INR",
    trialDays: 14,
    limits: {
      Clients: 1,
      users: 3,
      channels: 4,
      seoPages: 500,
      aiCredits: 2_000,
      automationRuns: 500,
      storageGb: 5,
      reports: 5,
      whatsappMessages: 1_000,
      apiCalls: 25_000,
    },
    features: [
      "Omnichannel publisher",
      "SEO site audit",
      "Lead inbox",
      "Standard analytics",
    ],
    subscriberCount: 0,
    updatedAt: daysAgo(96),
  },
  {
    id: "plan_growth",
    tier: "growth",
    name: "Growth",
    description: "For growing teams running several brands in parallel.",
    isPublic: true,
    isArchived: false,
    monthlyPriceMinor: 1490000,
    annualPriceMinor: 14900000,
    currency: "INR",
    trialDays: 14,
    limits: {
      Clients: 5,
      users: 12,
      channels: 20,
      seoPages: 5_000,
      aiCredits: 15_000,
      automationRuns: 5_000,
      storageGb: 50,
      reports: 25,
      whatsappMessages: 15_000,
      apiCalls: 250_000,
    },
    features: [
      "Everything in Starter",
      "Automation engine",
      "Keyword tracking",
      "Campaign attribution",
      "AI marketing assistant",
    ],
    subscriberCount: 0,
    updatedAt: daysAgo(38),
  },
  {
    id: "plan_agency",
    tier: "agency",
    name: "Agency",
    description: "For agencies managing many client organisations at once.",
    isPublic: true,
    isArchived: false,
    monthlyPriceMinor: 3990000,
    annualPriceMinor: 39900000,
    currency: "INR",
    trialDays: 21,
    limits: {
      Clients: 25,
      users: 40,
      channels: 100,
      seoPages: 50_000,
      aiCredits: 75_000,
      automationRuns: 40_000,
      storageGb: 250,
      reports: 150,
      whatsappMessages: 100_000,
      apiCalls: 1_500_000,
    },
    features: [
      "Everything in Growth",
      "Multi-client agency dashboard",
      "Client-level permissions",
      "Scheduled report delivery",
      "Priority support",
    ],
    subscriberCount: 0,
    updatedAt: daysAgo(12),
  },
  {
    id: "plan_enterprise",
    tier: "enterprise",
    name: "Enterprise",
    description: "Contracted capacity, custom SLAs and white-label delivery.",
    isPublic: false,
    isArchived: false,
    monthlyPriceMinor: 12990000,
    annualPriceMinor: 129900000,
    currency: "INR",
    trialDays: 30,
    limits: {
      Clients: null,
      users: null,
      channels: null,
      seoPages: 500_000,
      aiCredits: 500_000,
      automationRuns: null,
      storageGb: 2_000,
      reports: null,
      whatsappMessages: 1_000_000,
      apiCalls: 10_000_000,
    },
    features: [
      "Everything in Agency",
      "White label",
      "Dedicated infrastructure",
      "SAML single sign-on",
      "Named success manager",
      "99.9% uptime SLA",
    ],
    subscriberCount: 0,
    updatedAt: daysAgo(5),
  },
];

const PLANS_BY_TIER = new Map<PlanTier, Plan>(PLANS.map((plan) => [plan.tier, plan]));

export function getPlanByTier(tier: PlanTier): Plan {
  const plan = PLANS_BY_TIER.get(tier);
  if (!plan) throw new Error(`Unknown plan tier: ${tier}`);
  return plan;
}

export function getPlanLimits(tier: PlanTier): QuotaLimits {
  return getPlanByTier(tier).limits;
}
