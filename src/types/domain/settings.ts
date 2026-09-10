export interface GeneralSettings {
  platformName: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLocale: string;
}

export interface BrandingSettings {
  productName: string;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginTagline: string;
  whiteLabelEnabled: boolean;
}

export interface SecuritySettings {
  enforceMfaForInternalTeam: boolean;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireSymbol: boolean;
  allowedAdminIpRanges: string[];
  auditRetentionDays: number;
}

export interface EmailSettings {
  provider: "ses" | "sendgrid" | "postmark" | "smtp";
  fromName: string;
  fromAddress: string;
  replyToAddress: string;
  dailySendLimit: number;
}

export interface UsageLimitSettings {
  softLimitWarningPercent: number;
  allowOverage: boolean;
  overageGracePercent: number;
  crawlConcurrencyPerCompany: number;
  apiRateLimitPerMinute: number;
}

export interface NotificationSettings {
  notifyOnFailedPayment: boolean;
  notifyOnIntegrationDisconnect: boolean;
  notifyOnJobFailureThreshold: number;
  notifyOnSecurityEvent: boolean;
  digestFrequency: "off" | "daily" | "weekly";
}

export interface MaintenanceSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  scheduledWindowStart: string | null;
  scheduledWindowEnd: string | null;
  blockTenantWrites: boolean;
}

export interface PlatformSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  security: SecuritySettings;
  email: EmailSettings;
  usageLimits: UsageLimitSettings;
  notifications: NotificationSettings;
  maintenance: MaintenanceSettings;
}

export type SettingsSectionKey = keyof PlatformSettings;
