export type SettingsSectionKey =
  | "general"
  | "execution"
  | "retry"
  | "notifications"
  | "business-hours"
  | "routing"
  | "integrations"
  | "safety";

export interface GeneralSettings {
  defaultOwnership: "account_owner" | "round_robin" | "specific_user";
  specificOwnerName: string;
  specificOwnerId?: string;
  timezone: string;
  defaultReplyChannel: "whatsapp" | "instagram" | "email" | "sms";
  allowedChannels: string[];
  autoPrefixTags: boolean;
  defaultLeadStage: "new" | "contacted" | "qualified" | "prospect";
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface ExecutionRulesSettings {
  maxConcurrentRunsPerClient: number;
  maxConcurrentRunsPerTenant?: number;
  globalRateLimiterRps: number;
  allowParallelWorkflowsSameContact: boolean;
  collisionPolicy: "queue" | "cancel_older" | "skip";
  deduplicationWindowMinutes: number;
  stepTimeoutSeconds: number;
  workflowMaxRuntimeMinutes: number;
}

export interface RetrySettings {
  maxRetryAttempts: number;
  retryAlgorithm: "exponential" | "fixed" | "linear";
  initialDelaySeconds: number;
  maxBackoffDelayMinutes: number;
  retryOnRateLimit429: boolean;
  retryOnServerError5xx: boolean;
  failImmediatelyOnAuthOrBadPayload: boolean;
  escalationAction: "dlq" | "pause_workflow" | "trigger_webhook";
  escalationWebhookUrl?: string;
}

export interface NotificationSettings {
  enableInAppAlerts: boolean;
  enableEmailAlerts: boolean;
  alertEmails: string[];
  enableWhatsAppAlerts: boolean;
  alertPhoneNumbers: string[];
  enableWebhookAlerts: boolean;
  alertWebhookUrl: string;
  events: {
    criticalFailuresAndDlq: boolean;
    quotaThresholdWarning: boolean;
    dailyHealthDigest: boolean;
    highIngestionSpikes: boolean;
  };
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface BusinessHoursSettings {
  enabled: boolean;
  timezone: string;
  schedule: Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", DaySchedule>;
  enableQuietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  offHoursPolicy: "buffer_queue" | "send_closed_message" | "bypass_critical";
  autoReplyMessage: string;
  holidays: Array<{ date: string; name: string }>;
}

export interface RoutingAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  online: boolean;
  capacityLimitPerDay: number;
  weightPercentage: number;
  assignedChannels: string[];
}

export interface OwnershipRoutingSettings {
  distributionMode: "round_robin" | "weighted" | "availability" | "channel_specific";
  fallbackAssignee: string;
  slaInactivityMinutes: number;
  autoReassignIfNoResponse: boolean;
  agents: RoutingAgent[];
}

export interface IntegrationProviderConfig {
  id: string;
  name: string;
  channel: string;
  status: "connected" | "disconnected" | "error";
  latencyMs: number;
  lastSyncAt: string;
  accountLabel: string;
  details: Record<string, string>;
}

export interface IntegrationsSettings {
  universalWebhookUrl: string;
  hmacSecretKey: string;
  ipWhitelist: string[];
  providers: IntegrationProviderConfig[];
}

export interface SafetySettings {
  sandboxDryRunMode: boolean;
  circuitBreakerEnabled: boolean;
  circuitBreakerThresholdFailures: number;
  circuitBreakerWindowSeconds: number;
  maskPiiInLogs: boolean;
  logRetentionDays: number;
  requireApprovalForRiskyActions: boolean;
  emergencyKillSwitchActive: boolean;
}

export interface AutomationSettingsState {
  general: GeneralSettings;
  execution: ExecutionRulesSettings;
  retry: RetrySettings;
  notifications: NotificationSettings;
  businessHours: BusinessHoursSettings;
  routing: OwnershipRoutingSettings;
  integrations: IntegrationsSettings;
  safety: SafetySettings;
  /** Read-only, returned by the API. */
  meta?: { version: number; updatedAt: string | null };
}

/**
 * Mirrors the backend defaults (AutomationEngine). Only shown until the real
 * settings load — it deliberately contains no people, numbers or providers.
 */
const WEEKDAY: DaySchedule = { enabled: true, startTime: "09:00", endTime: "18:00" };
export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettingsState = {
  general: { defaultOwnership: "account_owner", specificOwnerName: "", specificOwnerId: "", timezone: "Asia/Kolkata (GMT+5:30)", defaultReplyChannel: "whatsapp", allowedChannels: ["WhatsApp", "Email"], autoPrefixTags: true, defaultLeadStage: "new", logLevel: "info" },
  execution: { maxConcurrentRunsPerClient: 10, maxConcurrentRunsPerTenant: 25, globalRateLimiterRps: 45, allowParallelWorkflowsSameContact: false, collisionPolicy: "queue", deduplicationWindowMinutes: 15, stepTimeoutSeconds: 60, workflowMaxRuntimeMinutes: 30 },
  retry: { maxRetryAttempts: 3, retryAlgorithm: "exponential", initialDelaySeconds: 30, maxBackoffDelayMinutes: 10, retryOnRateLimit429: true, retryOnServerError5xx: true, failImmediatelyOnAuthOrBadPayload: true, escalationAction: "dlq", escalationWebhookUrl: "" },
  notifications: { enableInAppAlerts: true, enableEmailAlerts: false, alertEmails: [], enableWhatsAppAlerts: false, alertPhoneNumbers: [], enableWebhookAlerts: false, alertWebhookUrl: "", events: { criticalFailuresAndDlq: true, quotaThresholdWarning: false, dailyHealthDigest: false, highIngestionSpikes: false } },
  businessHours: {
    enabled: false, timezone: "Asia/Kolkata (GMT+5:30)",
    schedule: { monday: WEEKDAY, tuesday: WEEKDAY, wednesday: WEEKDAY, thursday: WEEKDAY, friday: WEEKDAY, saturday: { enabled: false, startTime: "10:00", endTime: "16:00" }, sunday: { enabled: false, startTime: "10:00", endTime: "14:00" } },
    enableQuietHours: false, quietHoursStart: "22:00", quietHoursEnd: "08:00", offHoursPolicy: "buffer_queue", autoReplyMessage: "", holidays: [],
  },
  routing: { distributionMode: "round_robin", fallbackAssignee: "", slaInactivityMinutes: 15, autoReassignIfNoResponse: false, agents: [] },
  integrations: { universalWebhookUrl: "", hmacSecretKey: "", ipWhitelist: [], providers: [] },
  safety: { sandboxDryRunMode: false, circuitBreakerEnabled: true, circuitBreakerThresholdFailures: 25, circuitBreakerWindowSeconds: 60, maskPiiInLogs: true, logRetentionDays: 90, requireApprovalForRiskyActions: false, emergencyKillSwitchActive: false },
};
