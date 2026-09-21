export type NotificationEnvironment = "development" | "staging" | "production";
export type NotificationRange = "today" | "7d" | "30d" | "custom";
export type NotificationChannel = "in_app" | "email" | "whatsapp" | "push";
export type IntentState = "draft" | "pending_review" | "scheduled" | "dispatch_requested" | "completed" | "cancelled";
export type DeliveryState = "not_created" | "pending" | "queued" | "attempting" | "provider_accepted" | "delivered" | "failed" | "undeliverable" | "unknown";
export type ReceiptState = "unread" | "read" | "dismissed";
export type CampaignState = "draft" | "pending_approval" | "scheduled" | "in_progress" | "completed" | "partially_completed" | "cancelled";
export type PreferenceState = "allowed" | "opted_out" | "unavailable" | "required";
export type TemplateState = "draft" | "active" | "archived" | "pending_provider_approval";
export type NotificationCategory = "security" | "billing" | "integration" | "publishing" | "support" | "system" | "announcement";

export interface Recipient {
  id: string;
  name: string;
  role: string;
  companyId: string | null;
  companyName: string | null;
  verified: Partial<Record<NotificationChannel, boolean>>;
}

export interface NotificationIntent {
  id: string;
  title: string;
  category: NotificationCategory;
  state: IntentState;
  source: "manual" | "event";
  companyId: string | null;
  companyName: string | null;
  campaignId: string | null;
  templateId: string;
  audienceId: string;
  channels: NotificationChannel[];
  createdAt: string;
  scheduledFor: string | null;
  relatedHref: string | null;
  createdBy: string;
  message: string;
}

export interface NotificationDelivery {
  id: string;
  intentId: string;
  recipientId: string;
  channel: NotificationChannel;
  state: DeliveryState;
  providerReference: string | null;
  lastActivityAt: string;
  failureReason: string | null;
  recoveryRequested: boolean;
}

export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  at: string;
  state: DeliveryState;
  summary: string;
}

export interface InAppReceipt {
  id: string;
  intentId: string;
  recipientId: string;
  state: ReceiptState;
  createdAt: string;
  readAt: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  state: CampaignState;
  audienceId: string;
  companyId: string | null;
  channels: NotificationChannel[];
  createdAt: string;
  scheduledFor: string | null;
  owner: string;
}

export interface TemplateVersion {
  version: number;
  createdAt: string;
  subject: string;
  body: string;
}

export interface Template {
  id: string;
  name: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  state: TemplateState;
  variables: string[];
  versions: TemplateVersion[];
}

export interface Audience {
  id: string;
  name: string;
  companyId: string | null;
  description: string;
  recipientIds: string[];
}

export interface Preference {
  id: string;
  recipientId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  state: PreferenceState;
}

export interface NotificationRule {
  id: string;
  name: string;
  eventType: string;
  enabled: boolean;
  templateId: string;
  channels: NotificationChannel[];
  readiness: "ready" | "missing_event" | "template_review";
}

export interface NotificationActivity {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export interface RecoveryRequest {
  id: string;
  deliveryId: string;
  requestedAt: string;
  requestedBy: string;
  reason: string;
}

export interface NotificationSnapshot {
  environment: NotificationEnvironment;
  generatedAt: string;
  recipients: Recipient[];
  intents: NotificationIntent[];
  deliveries: NotificationDelivery[];
  attempts: DeliveryAttempt[];
  receipts: InAppReceipt[];
  campaigns: Campaign[];
  templates: Template[];
  audiences: Audience[];
  preferences: Preference[];
  rules: NotificationRule[];
  activity: NotificationActivity[];
  recoveryRequests: RecoveryRequest[];
}
