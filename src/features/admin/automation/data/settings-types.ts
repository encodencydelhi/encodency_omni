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
  timezone: string;
  defaultReplyChannel: "whatsapp" | "instagram" | "email" | "sms";
  allowedChannels: string[];
  autoPrefixTags: boolean;
  defaultLeadStage: "new" | "qualified" | "prospect";
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface ExecutionRulesSettings {
  maxConcurrentRunsPerClient: number;
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
}

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettingsState = {
  general: {
    defaultOwnership: "account_owner",
    specificOwnerName: "Manish Sirohi",
    timezone: "Asia/Kolkata (GMT+5:30)",
    defaultReplyChannel: "whatsapp",
    allowedChannels: ["WhatsApp", "Email", "SMS", "Instagram", "Google Business"],
    autoPrefixTags: true,
    defaultLeadStage: "new",
    logLevel: "info",
  },
  execution: {
    maxConcurrentRunsPerClient: 10,
    globalRateLimiterRps: 45,
    allowParallelWorkflowsSameContact: false,
    collisionPolicy: "queue",
    deduplicationWindowMinutes: 15,
    stepTimeoutSeconds: 60,
    workflowMaxRuntimeMinutes: 30,
  },
  retry: {
    maxRetryAttempts: 3,
    retryAlgorithm: "exponential",
    initialDelaySeconds: 15,
    maxBackoffDelayMinutes: 10,
    retryOnRateLimit429: true,
    retryOnServerError5xx: true,
    failImmediatelyOnAuthOrBadPayload: true,
    escalationAction: "dlq",
    escalationWebhookUrl: "https://api.encodency.com/v1/escalations/webhook",
  },
  notifications: {
    enableInAppAlerts: true,
    enableEmailAlerts: true,
    alertEmails: ["team@encodency.com", "ops@mokshasewa.org"],
    enableWhatsAppAlerts: true,
    alertPhoneNumbers: ["+91 98765 43210", "+91 98112 23344"],
    enableWebhookAlerts: false,
    alertWebhookUrl: "https://hooks.slack.com/services/T00/B00/XXXX",
    events: {
      criticalFailuresAndDlq: true,
      quotaThresholdWarning: true,
      dailyHealthDigest: true,
      highIngestionSpikes: false,
    },
  },
  businessHours: {
    enabled: true,
    timezone: "Asia/Kolkata (GMT+5:30)",
    schedule: {
      monday: { enabled: true, startTime: "09:00", endTime: "19:00" },
      tuesday: { enabled: true, startTime: "09:00", endTime: "19:00" },
      wednesday: { enabled: true, startTime: "09:00", endTime: "19:00" },
      thursday: { enabled: true, startTime: "09:00", endTime: "19:00" },
      friday: { enabled: true, startTime: "09:00", endTime: "19:00" },
      saturday: { enabled: true, startTime: "10:00", endTime: "16:00" },
      sunday: { enabled: false, startTime: "10:00", endTime: "14:00" },
    },
    enableQuietHours: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    offHoursPolicy: "buffer_queue",
    autoReplyMessage: "Namaste! Our office is currently closed. Your message is queued and our team will connect with you at 9:00 AM.",
    holidays: [
      { date: "2026-10-02", name: "Gandhi Jayanti" },
      { date: "2026-10-20", name: "Dussehra / Vijayadashami" },
      { date: "2026-11-08", name: "Diwali" },
    ],
  },
  routing: {
    distributionMode: "round_robin",
    fallbackAssignee: "Manish Sirohi (Admin)",
    slaInactivityMinutes: 15,
    autoReassignIfNoResponse: true,
    agents: [
      {
        id: "ag_1",
        name: "Manish Sirohi",
        email: "manish@encodency.com",
        role: "Senior Ops & Growth Lead",
        online: true,
        capacityLimitPerDay: 40,
        weightPercentage: 40,
        assignedChannels: ["WhatsApp", "Meta Ads", "Google Business"],
      },
      {
        id: "ag_2",
        name: "Priya Sharma",
        email: "priya@encodency.com",
        role: "Inbound Engagement Specialist",
        online: true,
        capacityLimitPerDay: 30,
        weightPercentage: 35,
        assignedChannels: ["WhatsApp", "Instagram"],
      },
      {
        id: "ag_3",
        name: "Rahul Verma",
        email: "rahul.v@encodency.com",
        role: "Conversion Specialist",
        online: false,
        capacityLimitPerDay: 25,
        weightPercentage: 25,
        assignedChannels: ["Meta Ads", "Email"],
      },
    ],
  },
  integrations: {
    universalWebhookUrl: "https://api.encodency.com/v1/automations/webhook/wh_live_encodency_7718",
    hmacSecretKey: "whsec_9f8a3c1e2d4b5a6c7e8f0a1b2c3d4e5f",
    ipWhitelist: ["157.240.241.0/24", "31.13.24.0/21", "185.89.216.0/22"],
    providers: [
      {
        id: "p_meta",
        name: "Meta Ads & Instagram DM",
        channel: "Meta",
        status: "connected",
        latencyMs: 142,
        lastSyncAt: "Just now",
        accountLabel: "act_499102840 (EnCodency Agency Ads)",
        details: { "App ID": "981240182901", "Permissions": "ads_read, leads_retrieval, pages_messaging", "Token Valid": "60 days remaining" },
      },
      {
        id: "p_whatsapp",
        name: "WhatsApp Cloud API (AiSensy)",
        channel: "WhatsApp",
        status: "connected",
        latencyMs: 88,
        lastSyncAt: "1 min ago",
        accountLabel: "+91 98112 23344 (Verified Business)",
        details: { "WABA ID": "waba_88192830", "Phone Number ID": "phone_991823", "Quality Rating": "HIGH (Green)" },
      },
      {
        id: "p_google",
        name: "Google Business Profile",
        channel: "Google",
        status: "connected",
        latencyMs: 195,
        lastSyncAt: "5 mins ago",
        accountLabel: "3 Locations Active (Connaught Place, Noida, Bengaluru)",
        details: { "Account": "accounts/1092837482", "Webhook Notifications": "Enabled (New Reviews & Q&A)" },
      },
      {
        id: "p_smtp",
        name: "Transactional Email Gateway",
        channel: "Email",
        status: "connected",
        latencyMs: 110,
        lastSyncAt: "12 mins ago",
        accountLabel: "smtp.resend.com (verified: notify@encodency.com)",
        details: { "DKIM / SPF": "Passed", "Port": "587 (TLS)" },
      },
    ],
  },
  safety: {
    sandboxDryRunMode: false,
    circuitBreakerEnabled: true,
    circuitBreakerThresholdFailures: 25,
    circuitBreakerWindowSeconds: 60,
    maskPiiInLogs: true,
    logRetentionDays: 90,
    requireApprovalForRiskyActions: true,
    emergencyKillSwitchActive: false,
  },
};
