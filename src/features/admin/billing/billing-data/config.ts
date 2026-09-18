import type {
  AddOnKey,
  BillingRole,
  BillingScenario,
  CardBrand,
  ChangeKind,
  ContactKind,
  FeatureKey,
  InvoiceStatus,
  LimitKey,
  LineItemKind,
  PaymentStatus,
  SubscriptionStatus,
  SupportLevel,
} from "./types";
export const BILLING_MOCK_MODE = process.env.NEXT_PUBLIC_BILLING_MOCK_MODE !== "false";

export const BILLING_ROUTE = "/admin/billing";

/** Usage at or above this share of a limit is "near limit". */
export const NEAR_LIMIT = 0.8;
/** A card expiring within this many days is flagged. */
export const CARD_EXPIRY_WARNING_DAYS = 60;
/** Renewal inside this window is flagged. */
export const RENEWAL_WARNING_DAYS = 7;
/** Service continues this long after a failed renewal. */
export const GRACE_DAYS = 7;

type Tone = "neutral" | "red" | "green" | "amber" | "blue" | "violet";

export const LIMIT_META: Record<
  LimitKey,
  { label: string; short: string; unit: string; perPeriod: boolean; link: { label: string; href: string } | null; format?: "storage" }
> = {
  clients: { label: "Clients", short: "Clients", unit: "clients", perPeriod: false, link: { label: "Manage clients", href: "/admin/projects" } },
  teamMembers: { label: "Team members", short: "Team members", unit: "seats", perPeriod: false, link: { label: "Manage team", href: "/admin/team" } },
  channels: { label: "Connected channels", short: "Channels", unit: "channels", perPeriod: false, link: { label: "Manage integrations", href: "/admin/integrations" } },
  aiCredits: { label: "AI credits", short: "AI credits", unit: "credits", perPeriod: true, link: null },
  automations: { label: "Active automations", short: "Automations", unit: "workflows", perPeriod: false, link: { label: "Manage automations", href: "/admin/automation" } },
  automationRuns: { label: "Automation runs", short: "Automation runs", unit: "runs / month", perPeriod: true, link: { label: "View run logs", href: "/admin/automation/logs" } },
  scheduledPosts: { label: "Scheduled posts", short: "Scheduled posts", unit: "posts / month", perPeriod: true, link: { label: "Open calendar", href: "/admin/calendar" } },
  reports: { label: "Reports", short: "Reports", unit: "reports / month", perPeriod: true, link: { label: "Open reports", href: "/admin/reports" } },
  storageGb: { label: "Media storage", short: "Storage", unit: "GB", perPeriod: false, link: { label: "Open media library", href: "/admin/media" }, format: "storage" },
};

export const LIMIT_ORDER: LimitKey[] = ["clients", "teamMembers", "channels", "aiCredits", "automations", "automationRuns", "scheduledPosts", "reports", "storageGb"];

/** The limits a plan card leads with. */
export const HEADLINE_LIMITS: LimitKey[] = ["clients", "teamMembers", "channels", "aiCredits", "automations", "reports"];

export const FEATURE_META: Record<FeatureKey, { label: string; description: string }> = {
  publishing: { label: "Multi-channel publishing", description: "Compose once and publish to every connected channel." },
  calendar: { label: "Content calendar", description: "Plan, schedule and reschedule across clients." },
  automation: { label: "Automation", description: "Workflows for leads, replies and publishing." },
  seo: { label: "SEO", description: "Site audits, keyword tracking and issue tracking." },
  website_intel: { label: "Website intelligence", description: "Visitor tracking and on-site conversion insight." },
  analytics: { label: "Analytics", description: "Performance dashboards per client and channel." },
  advanced_analytics: { label: "Advanced analytics", description: "Attribution, cohorts and custom metrics." },
  reporting: { label: "Reporting", description: "Scheduled and on-demand client reports." },
  white_label: { label: "White-label reports", description: "Your branding on every client-facing report." },
  collaboration: { label: "Team collaboration", description: "Roles, groups, comments and hand-offs." },
  approvals: { label: "Approval workflows", description: "Client and manager sign-off before publishing." },
  audit_logs: { label: "Audit logs", description: "Who changed what, kept for compliance." },
  premium_channels: { label: "X, YouTube & Google Business", description: "Publishing and insights for premium channels." },
  crm: { label: "CRM & lead capture", description: "Leads, contacts, pipeline and tasks." },
  sso: { label: "Single sign-on", description: "SAML sign-in through your identity provider." },
  api_access: { label: "API access", description: "Programmatic access for your own tools." },
};

export const FEATURE_ORDER: FeatureKey[] = [
  "publishing",
  "calendar",
  "premium_channels",
  "automation",
  "crm",
  "seo",
  "website_intel",
  "analytics",
  "reporting",
  "collaboration",
  "approvals",
  "advanced_analytics",
  "audit_logs",
  "white_label",
  "api_access",
  "sso",
];

/** Features worth a row in the plan comparison. The rest are on every plan. */
export const COMPARED_FEATURES: FeatureKey[] = ["advanced_analytics", "audit_logs", "white_label", "api_access", "sso"];

export const SUPPORT_LABEL: Record<SupportLevel, string> = {
  email: "Email support",
  priority: "Priority support",
  dedicated: "Dedicated success manager",
};

export const CYCLE_LABEL = { monthly: "Monthly", annual: "Annual" } as const;

export const SUBSCRIPTION_STATUS_META: Record<SubscriptionStatus, { label: string; tone: Tone; healthy: boolean }> = {
  active: { label: "Active", tone: "green", healthy: true },
  trialing: { label: "Trial", tone: "violet", healthy: true },
  payment_due: { label: "Payment due", tone: "amber", healthy: false },
  past_due: { label: "Past due", tone: "red", healthy: false },
  grace_period: { label: "Grace period", tone: "amber", healthy: false },
  scheduled_cancellation: { label: "Scheduled cancellation", tone: "amber", healthy: true },
  cancelled: { label: "Cancelled", tone: "neutral", healthy: false },
};

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "green" },
  pending: { label: "Pending", tone: "amber" },
  failed: { label: "Failed", tone: "red" },
  refunded: { label: "Refunded", tone: "violet" },
  voided: { label: "Voided", tone: "neutral" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  successful: { label: "Successful", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  refunded: { label: "Refunded", tone: "violet" },
  pending: { label: "Pending", tone: "amber" },
};

export const LINE_KIND_LABEL: Record<LineItemKind, string> = {
  plan: "Plan",
  addon: "Add-on",
  credits: "Extra credits",
  usage: "Usage charges",
  discount: "Discount",
  proration: "Proration",
  account_credit: "Account credit",
};

export const CHANGE_LABEL: Record<ChangeKind, string> = {
  upgrade: "Upgrade",
  downgrade: "Downgrade",
  cycle_change: "Billing cycle change",
  cancellation: "Cancellation",
  reactivation: "Reactivation",
  resume: "Subscription resumed",
  trial_conversion: "Plan chosen after trial",
};

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  rupay: "RuPay",
  amex: "American Express",
};

export const CONTACT_KIND_LABEL: Record<ContactKind, string> = {
  primary: "Primary billing contact",
  finance: "Finance contact",
  other: "Billing contact",
};

export const ADDON_ICON_LIMIT: Record<AddOnKey, "teamMembers" | "clients" | "channels"> = {
  extra_seats: "teamMembers",
  extra_clients: "clients",
  extra_channels: "channels",
};

export const ROLE_LABEL: Record<BillingRole, string> = {
  org_admin: "Organization Admin",
  billing_admin: "Billing Admin",
  manager: "Manager",
  member: "Member",
};

export const SCENARIO_LABEL: Record<BillingScenario, { label: string; description: string }> = {
  active: { label: "Active", description: "Healthy subscription, several limits close to full." },
  card_expiring: { label: "Card expiring", description: "The primary card expires this month." },
  payment_due: { label: "Payment due", description: "An invoice is waiting for payment approval." },
  past_due: { label: "Past due", description: "The renewal payment failed; retries continue." },
  grace_period: { label: "Grace period", description: "Retries are exhausted; service continues for a few days." },
  trial: { label: "Trial", description: "Free trial with no payment method or invoices yet." },
  scheduled_cancellation: { label: "Scheduled cancellation", description: "Cancels at the end of the period." },
  cancelled: { label: "Cancelled", description: "Access has ended; reactivation available." },
};

export const CANCEL_REASONS = [
  { value: "too_expensive", label: "It's too expensive" },
  { value: "missing_features", label: "It's missing features we need" },
  { value: "switching", label: "We're switching to another tool" },
  { value: "not_using", label: "We aren't using it enough" },
  { value: "temporary", label: "We only need a break" },
  { value: "other", label: "Something else" },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]["value"];

/** Mock-mode test cards. Anything else that passes the checksum is accepted. */
export const DECLINED_TEST_CARD = "4000000000000002";
