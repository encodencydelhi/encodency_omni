import { ROUTES } from "@/config/routes";
import type { Audience, Campaign, DeliveryAttempt, InAppReceipt, NotificationDelivery, NotificationEnvironment, NotificationIntent, NotificationRule, NotificationSnapshot, Preference, Recipient, Template } from "./types";

const now = new Date("2026-09-21T12:50:00+05:30");
const iso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

const recipients: Recipient[] = [
  { id: "rcp-platform-ops", name: "Ishita Nair", role: "Platform Operations", companyId: null, companyName: null, verified: { in_app: true, email: true, whatsapp: false, push: true } },
  { id: "rcp-blue-admin", name: "Tom Novak", role: "Company Admin", companyId: "cmp-blue", companyName: "Blue Harbour Logistics", verified: { in_app: true, email: true, whatsapp: true, push: false } },
  { id: "rcp-meridian-admin", name: "Maya Sirohi", role: "Company Admin", companyId: "cmp-meridian", companyName: "Meridian Digital", verified: { in_app: true, email: true, whatsapp: false, push: true } },
  { id: "rcp-namo-user", name: "Aarav Mehta", role: "Client User", companyId: "cmp-namo", companyName: "Namo Gange Trust", verified: { in_app: true, email: false, whatsapp: true, push: false } },
];

const audiences: Audience[] = [
  { id: "aud-platform-admins", name: "Platform staff", companyId: null, description: "Internal platform operators and admins.", recipientIds: ["rcp-platform-ops"] },
  { id: "aud-blue-admins", name: "Blue Harbour admins", companyId: "cmp-blue", description: "Company admins for Blue Harbour Logistics.", recipientIds: ["rcp-blue-admin"] },
  { id: "aud-all-company-admins", name: "All company admins", companyId: null, description: "Demo company administrators across active companies.", recipientIds: ["rcp-blue-admin", "rcp-meridian-admin", "rcp-namo-user"] },
];

const templates: Template[] = [
  { id: "tpl-security-login", name: "Security alert", category: "security", channels: ["in_app", "email"], state: "active", variables: ["recipient_name", "event_time", "ip_address"], versions: [{ version: 1, createdAt: iso(9000), subject: "Security alert for {{recipient_name}}", body: "A security event occurred at {{event_time}} from {{ip_address}}." }] },
  { id: "tpl-billing-failed", name: "Billing failure", category: "billing", channels: ["in_app", "email"], state: "active", variables: ["company_name", "invoice_id"], versions: [{ version: 2, createdAt: iso(4300), subject: "Payment issue for {{company_name}}", body: "Invoice {{invoice_id}} needs attention. No payment action is taken by this demo notification." }] },
  { id: "tpl-whatsapp-maintenance", name: "WhatsApp maintenance notice", category: "system", channels: ["whatsapp"], state: "pending_provider_approval", variables: ["company_name", "window"], versions: [{ version: 1, createdAt: iso(2200), subject: "Maintenance notice", body: "Maintenance window for {{company_name}}: {{window}}." }] },
  { id: "tpl-publishing-failure", name: "Publishing failure", category: "publishing", channels: ["in_app", "email", "push"], state: "draft", variables: ["post_title", "channel"], versions: [{ version: 1, createdAt: iso(800), subject: "Publishing failed", body: "{{post_title}} failed on {{channel}}. Check Publishing for recovery." }] },
];

const campaigns: Campaign[] = [
  { id: "cmpgn-maint-001", name: "Planned maintenance advisory", state: "scheduled", audienceId: "aud-all-company-admins", companyId: null, channels: ["in_app", "email"], createdAt: iso(1440), scheduledFor: iso(-720), owner: "Ishita Nair" },
  { id: "cmpgn-feature-002", name: "Advanced SEO rollout notice", state: "draft", audienceId: "aud-blue-admins", companyId: "cmp-blue", channels: ["in_app"], createdAt: iso(620), scheduledFor: null, owner: "Farhan Qureshi" },
];

const intents: NotificationIntent[] = [
  { id: "ntf_0001", title: "Payment failed for Blue Harbour Logistics", category: "billing", state: "dispatch_requested", source: "event", companyId: "cmp-blue", companyName: "Blue Harbour Logistics", campaignId: null, templateId: "tpl-billing-failed", audienceId: "aud-blue-admins", channels: ["in_app", "email"], createdAt: iso(74), scheduledFor: null, relatedHref: ROUTES.superAdmin.billing, createdBy: "Billing Event", message: "Payment failed. Review billing before the grace period ends." },
  { id: "ntf_0002", title: "Integration disconnected", category: "integration", state: "completed", source: "event", companyId: "cmp-meridian", companyName: "Meridian Digital", campaignId: null, templateId: "tpl-security-login", audienceId: "aud-all-company-admins", channels: ["in_app", "email"], createdAt: iso(180), scheduledFor: null, relatedHref: ROUTES.superAdmin.integrations, createdBy: "Integration Monitor", message: "Meta provider token requires reconnect." },
  { id: "ntf_0003", title: "Planned maintenance notice", category: "system", state: "scheduled", source: "manual", companyId: null, companyName: null, campaignId: "cmpgn-maint-001", templateId: "tpl-whatsapp-maintenance", audienceId: "aud-all-company-admins", channels: ["in_app", "email", "whatsapp"], createdAt: iso(1440), scheduledFor: iso(-720), relatedHref: ROUTES.superAdmin.systemHealth, createdBy: "Ishita Nair", message: "Maintenance window has been drafted. External channels are not connected in frontend demo." },
  { id: "ntf_0004", title: "Publishing failed for campaign post", category: "publishing", state: "draft", source: "manual", companyId: "cmp-meridian", companyName: "Meridian Digital", campaignId: null, templateId: "tpl-publishing-failure", audienceId: "aud-all-company-admins", channels: ["in_app", "push"], createdAt: iso(28), scheduledFor: null, relatedHref: ROUTES.superAdmin.apiMonitoring, createdBy: "Support Operations", message: "Draft notification about publishing failure." },
];

const deliveries: NotificationDelivery[] = [
  { id: "del_0001", intentId: "ntf_0001", recipientId: "rcp-blue-admin", channel: "in_app", state: "delivered", providerReference: "demo-inapp-0001", lastActivityAt: iso(70), failureReason: null, recoveryRequested: false },
  { id: "del_0002", intentId: "ntf_0001", recipientId: "rcp-blue-admin", channel: "email", state: "provider_accepted", providerReference: "demo-email-accepted-0002", lastActivityAt: iso(69), failureReason: null, recoveryRequested: false },
  { id: "del_0003", intentId: "ntf_0002", recipientId: "rcp-meridian-admin", channel: "email", state: "failed", providerReference: "demo-email-failed-0003", lastActivityAt: iso(170), failureReason: "Mailbox unavailable in demo delivery record.", recoveryRequested: false },
  { id: "del_0004", intentId: "ntf_0003", recipientId: "rcp-namo-user", channel: "whatsapp", state: "unknown", providerReference: null, lastActivityAt: iso(1300), failureReason: "WhatsApp template is pending provider approval.", recoveryRequested: false },
  { id: "del_0005", intentId: "ntf_0004", recipientId: "rcp-meridian-admin", channel: "push", state: "not_created", providerReference: null, lastActivityAt: iso(28), failureReason: "Push channel is unavailable for draft notification.", recoveryRequested: false },
];

const attempts: DeliveryAttempt[] = [
  { id: "att_0001", deliveryId: "del_0002", at: iso(72), state: "queued", summary: "Demo email delivery queued." },
  { id: "att_0002", deliveryId: "del_0002", at: iso(69), state: "provider_accepted", summary: "Provider accepted demo request. Final recipient delivery is not claimed." },
  { id: "att_0003", deliveryId: "del_0003", at: iso(174), state: "attempting", summary: "Demo SMTP attempt started." },
  { id: "att_0004", deliveryId: "del_0003", at: iso(170), state: "failed", summary: "Mailbox unavailable. No successful resend fabricated." },
];

const receipts: InAppReceipt[] = [
  { id: "rcpt_0001", intentId: "ntf_0001", recipientId: "rcp-blue-admin", state: "unread", createdAt: iso(70), readAt: null },
  { id: "rcpt_0002", intentId: "ntf_0002", recipientId: "rcp-meridian-admin", state: "read", createdAt: iso(178), readAt: iso(140) },
];

const preferences: Preference[] = [
  { id: "pref_001", recipientId: "rcp-blue-admin", category: "billing", channel: "email", state: "required" },
  { id: "pref_002", recipientId: "rcp-blue-admin", category: "announcement", channel: "email", state: "opted_out" },
  { id: "pref_003", recipientId: "rcp-namo-user", category: "system", channel: "whatsapp", state: "allowed" },
  { id: "pref_004", recipientId: "rcp-meridian-admin", category: "publishing", channel: "push", state: "allowed" },
];

const rules: NotificationRule[] = [
  { id: "rule_001", name: "Billing failure alert", eventType: "billing.payment_failed", enabled: true, templateId: "tpl-billing-failed", channels: ["in_app", "email"], readiness: "ready" },
  { id: "rule_002", name: "WhatsApp maintenance broadcast", eventType: "system.maintenance_scheduled", enabled: false, templateId: "tpl-whatsapp-maintenance", channels: ["whatsapp"], readiness: "template_review" },
  { id: "rule_003", name: "Support ticket update", eventType: "support.ticket_updated", enabled: false, templateId: "tpl-security-login", channels: ["in_app"], readiness: "missing_event" },
];

export function buildNotificationsSnapshot(environment: NotificationEnvironment): NotificationSnapshot {
  return {
    environment,
    generatedAt: now.toISOString(),
    recipients,
    intents,
    deliveries,
    attempts,
    receipts,
    campaigns,
    templates,
    audiences,
    preferences,
    rules,
    recoveryRequests: [],
    activity: [
      { id: "act_001", at: iso(12), actor: "Ishita Nair", action: "Reviewed delivery failure", target: "del_0003" },
      { id: "act_002", at: iso(28), actor: "Support Operations", action: "Created demo draft", target: "ntf_0004" },
      { id: "act_003", at: iso(620), actor: "Farhan Qureshi", action: "Created campaign draft", target: "cmpgn-feature-002" },
    ],
  };
}
