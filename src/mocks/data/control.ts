import { ROUTES } from "@/config/routes";
import type { AuditCategory, AuditLogEntry, AuditOutcome } from "@/types/domain/audit-log";
import type { FeatureFlag, FlagScope, FlagState } from "@/types/domain/feature-flag";
import type { AdminNotification, NotificationCategory, NotificationSeverity } from "@/types/domain/notification";
import type { PlanTier } from "@/types/domain/plan";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/types/domain/support";
import { createRng, daysAgo, minutesAgo } from "../lib/random";
import { AUDIT_ACTIONS, SUPPORT_SUBJECTS } from "./catalog";
import { INTERNAL_TEAM, SUPPORT_AGENTS } from "./internal-team";
import { COMPANIES, PLATFORM_USERS } from "./tenants";

/* -------------------------------------------------------------------------
 * Feature flags
 * ---------------------------------------------------------------------- */

interface FlagSeed {
  key: string;
  name: string;
  description: string;
  scope: FlagScope;
  state: FlagState;
  rolloutPercent: number;
  enabledPlans: PlanTier[];
  category: string;
}

const FLAG_SEEDS: FlagSeed[] = [
  { key: "ai_assistant", name: "AI Marketing Assistant", description: "Caption, blog and recommendation generation backed by platform data.", scope: "plan", state: "enabled", rolloutPercent: 100, enabledPlans: ["growth", "agency", "enterprise"], category: "Intelligence" },
  { key: "seo_crawler_v2", name: "SEO Crawler v2", description: "Playwright-backed crawler for JavaScript-heavy sites.", scope: "global", state: "partial", rolloutPercent: 35, enabledPlans: [], category: "SEO" },
  { key: "linkedin_integration", name: "LinkedIn Integration", description: "Company page publishing, analytics and lead retrieval.", scope: "plan", state: "enabled", rolloutPercent: 100, enabledPlans: ["starter", "growth", "agency", "enterprise"], category: "Channels" },
  { key: "automation_builder", name: "Automation Builder", description: "Visual workflow canvas for triggers, conditions and actions.", scope: "plan", state: "enabled", rolloutPercent: 100, enabledPlans: ["growth", "agency", "enterprise"], category: "Automation" },
  { key: "advanced_analytics", name: "Advanced Analytics", description: "Multi-touch attribution and cohort reporting.", scope: "plan", state: "partial", rolloutPercent: 60, enabledPlans: ["agency", "enterprise"], category: "Analytics" },
  { key: "white_label", name: "White Label", description: "Custom domain, logo and colour scheme for agency clients.", scope: "organization", state: "partial", rolloutPercent: 12, enabledPlans: ["enterprise"], category: "Agency" },
  { key: "whatsapp_broadcasts", name: "WhatsApp Broadcasts", description: "Bulk template campaigns with per-recipient status tracking.", scope: "plan", state: "enabled", rolloutPercent: 100, enabledPlans: ["growth", "agency", "enterprise"], category: "Channels" },
  { key: "youtube_optimizer", name: "YouTube Content Optimizer", description: "AI title, description and thumbnail suggestions.", scope: "global", state: "partial", rolloutPercent: 25, enabledPlans: [], category: "Intelligence" },
  { key: "realtime_job_stream", name: "Realtime Job Stream", description: "Server-sent job status updates in the admin console.", scope: "global", state: "disabled", rolloutPercent: 0, enabledPlans: [], category: "Platform" },
  { key: "saml_sso", name: "SAML Single Sign-On", description: "Enterprise identity provider federation.", scope: "plan", state: "enabled", rolloutPercent: 100, enabledPlans: ["enterprise"], category: "Security" },
  { key: "usage_overage_billing", name: "Usage Overage Billing", description: "Bill metered overage instead of hard-blocking at the quota.", scope: "global", state: "disabled", rolloutPercent: 0, enabledPlans: [], category: "Billing" },
  { key: "agency_client_portal", name: "Agency Client Portal", description: "Read-only client-facing reporting portal.", scope: "organization", state: "partial", rolloutPercent: 8, enabledPlans: ["agency", "enterprise"], category: "Agency" },
];

export const FEATURE_FLAGS: FeatureFlag[] = FLAG_SEEDS.map((seed, index) => {
  const rng = createRng(91000 + index * 5);
  const editor = rng.pick(INTERNAL_TEAM);

  return {
    id: `flag_${seed.key}`,
    ...seed,
    enabledCompanyCount:
      seed.scope === "organization"
        ? Math.max(1, Math.round(COMPANIES.length * (seed.rolloutPercent / 100)))
        : seed.state === "disabled"
          ? 0
          : COMPANIES.filter((company) => seed.enabledPlans.length === 0 || seed.enabledPlans.includes(company.planTier)).length,
    updatedBy: editor.name,
    updatedAt: daysAgo(rng.float(0.2, 90, 2)),
  } satisfies FeatureFlag;
});

export const FLAG_CATEGORIES: string[] = [...new Set(FLAG_SEEDS.map((seed) => seed.category))].sort();

/* -------------------------------------------------------------------------
 * Audit log
 * ---------------------------------------------------------------------- */

const IP_POOL = ["203.0.113.42", "198.51.100.17", "192.0.2.88", "203.0.113.9", "198.51.100.204", "192.0.2.145"] as const;
const USER_AGENTS = [
  "Chrome 141 on macOS",
  "Firefox 139 on Windows",
  "Safari 18 on macOS",
  "Edge 141 on Windows",
  "EnCodency Worker/1.4",
] as const;

function buildAuditLog(): AuditLogEntry[] {
  const rng = createRng(101000);
  const entries: AuditLogEntry[] = [];

  for (let index = 0; index < 260; index += 1) {
    const template = rng.pick(AUDIT_ACTIONS);
    const isSystem = template.action.startsWith("queue.") || rng.bool(0.08);
    const isInternal = isSystem ? false : rng.bool(0.55);

    const staff = rng.pick(INTERNAL_TEAM);
    const tenantUser = rng.pick(PLATFORM_USERS);
    const company = rng.pick(COMPANIES);

    const outcome: AuditOutcome =
      template.action.includes("failed") || template.action.includes("denied")
        ? template.action.includes("denied")
          ? "denied"
          : "failure"
        : "success";

    entries.push({
      id: `aud_${String(index + 1).padStart(5, "0")}`,
      actor: isSystem
        ? { id: "system", name: "Platform Scheduler", email: "system@encodency.com", type: "system" }
        : isInternal
          ? { id: staff.id, name: staff.name, email: staff.email, type: "internal" }
          : { id: tenantUser.id, name: tenantUser.name, email: tenantUser.email, type: "customer" },
      action: template.action,
      category: template.category as AuditCategory,
      outcome,
      resource: {
        type: template.resource,
        id: `${template.resource}_${rng.int(1000, 9999)}`,
        label: isInternal || isSystem ? company.name : tenantUser.company.name,
      },
      company: { id: company.id, name: company.name },
      ipAddress: isSystem ? "10.0.4.11" : rng.pick(IP_POOL),
      userAgent: isSystem ? "EnCodency Worker/1.4" : rng.pick(USER_AGENTS),
      metadata: {
        requestId: `req_${rng.int(100000, 999999)}`,
        durationMs: rng.int(12, 940),
      },
      createdAt: minutesAgo(rng.int(1, 43_200)),
    });
  }

  return entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export const AUDIT_LOG: readonly AuditLogEntry[] = buildAuditLog();

/* -------------------------------------------------------------------------
 * Support tickets
 * ---------------------------------------------------------------------- */

const TICKET_CATEGORIES = ["Integrations", "Billing", "SEO", "Publishing", "Account", "API"] as const;

function buildTickets(): SupportTicket[] {
  const rng = createRng(111000);

  return SUPPORT_SUBJECTS.flatMap((subject, subjectIndex) =>
    Array.from({ length: rng.int(1, 3) }, (_, copyIndex) => {
      const company = rng.pick(COMPANIES);
      const requester = rng.pick(PLATFORM_USERS.filter((user) => user.company.id === company.id)) ?? rng.pick(PLATFORM_USERS);

      const status = rng.weighted({
        open: 26,
        in_progress: 24,
        waiting: 16,
        resolved: 26,
        closed: 8,
      } satisfies Record<TicketStatus, number>);

      const priority = rng.weighted({
        urgent: 12,
        high: 26,
        normal: 46,
        low: 16,
      } satisfies Record<TicketPriority, number>);

      const isClosed = status === "resolved" || status === "closed";
      const createdMinutes = rng.int(20, 26_000);
      const reference = `SUP-${4200 + subjectIndex * 3 + copyIndex}`;

      return {
        id: `tkt_${reference.toLowerCase()}`,
        reference,
        subject,
        category: rng.pick(TICKET_CATEGORIES),
        company: { id: company.id, name: company.name },
        requester: { name: requester.name, email: requester.email },
        priority,
        status,
        assignee: status === "open" && rng.bool(0.5) ? null : rng.pick(SUPPORT_AGENTS),
        messageCount: rng.int(1, 14),
        slaMinutesRemaining: isClosed ? null : rng.int(-720, 2_400),
        createdAt: minutesAgo(createdMinutes),
        updatedAt: minutesAgo(rng.int(5, Math.max(6, createdMinutes - 10))),
      } satisfies SupportTicket;
    }),
  ).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export const SUPPORT_TICKETS: readonly SupportTicket[] = buildTickets();

/* -------------------------------------------------------------------------
 * Admin notifications
 * ---------------------------------------------------------------------- */

interface NotificationSeed {
  title: string;
  body: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  href: string | null;
  source: string;
  minutesAgo: number;
  isRead: boolean;
}

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  { title: "SEO crawler queue is paused", body: "The seo_crawls queue has been paused for 3 hours and 214 jobs are waiting.", category: "system", severity: "critical", href: ROUTES.superAdmin.jobs, source: "Job Scheduler", minutesAgo: 12, isRead: false },
  { title: "3 LinkedIn tokens expire within 7 days", body: "Affected tenants: Meridian Digital, Vantage Realty Partners, Amberline Cosmetics.", category: "integration", severity: "warning", href: ROUTES.superAdmin.integrations, source: "Integration Monitor", minutesAgo: 38, isRead: false },
  { title: "Payment failed for Blue Harbour Logistics", body: "Card declined by issuing bank. The subscription enters the grace period in 2 days.", category: "billing", severity: "critical", href: ROUTES.superAdmin.billing, source: "Billing", minutesAgo: 74, isRead: false },
  { title: "Urgent ticket unassigned for over 4 hours", body: "SUP-4218 from Lumen Health Systems has breached the first-response SLA.", category: "support", severity: "warning", href: ROUTES.superAdmin.support, source: "Support Desk", minutesAgo: 96, isRead: false },
  { title: "Repeated failed sign-ins from a single address", body: "12 failed attempts against 4 internal accounts from 203.0.113.42.", category: "security", severity: "critical", href: ROUTES.superAdmin.auditLogs, source: "Trust & Safety", minutesAgo: 133, isRead: false },
  { title: "Analytics replica latency elevated", body: "p95 read latency has stayed above 60 ms for 45 minutes.", category: "system", severity: "warning", href: ROUTES.superAdmin.systemHealth, source: "Infrastructure", minutesAgo: 190, isRead: true },
  { title: "Sierra Nutrition Labs exceeded its AI credit quota", body: "Consumption is at 118% of the Growth allowance for this cycle.", category: "billing", severity: "warning", href: ROUTES.superAdmin.usage, source: "Metering", minutesAgo: 260, isRead: true },
  { title: "Meta webhook signature failures", body: "9 inbound events failed verification in the last hour.", category: "integration", severity: "warning", href: ROUTES.superAdmin.webhooks, source: "Webhook Receiver", minutesAgo: 320, isRead: true },
  { title: "Feature flag seo_crawler_v2 rolled out to 35%", body: "Changed by Farhan Qureshi. No error-rate regression detected so far.", category: "system", severity: "info", href: ROUTES.superAdmin.featureFlags, source: "Feature Flags", minutesAgo: 480, isRead: true },
  { title: "Monthly revenue report is ready", body: "August recurring revenue closed 6.4% above July.", category: "billing", severity: "info", href: ROUTES.superAdmin.billing, source: "Billing", minutesAgo: 700, isRead: true },
  { title: "Two companies completed onboarding", body: "Peak & Pine Outdoors and Solace Home Decor connected their first channels.", category: "system", severity: "info", href: ROUTES.superAdmin.companies, source: "Onboarding", minutesAgo: 900, isRead: true },
  { title: "Auric Jewels suspended", body: "Suspended by Ishita Nair following a chargeback dispute.", category: "security", severity: "info", href: ROUTES.superAdmin.companies, source: "Operations", minutesAgo: 1_400, isRead: true },
];

export const NOTIFICATIONS: AdminNotification[] = NOTIFICATION_SEEDS.map((seed, index) => ({
  id: `ntf_${String(index + 1).padStart(4, "0")}`,
  title: seed.title,
  body: seed.body,
  category: seed.category,
  severity: seed.severity,
  isRead: seed.isRead,
  href: seed.href,
  source: seed.source,
  createdAt: minutesAgo(seed.minutesAgo),
}));
