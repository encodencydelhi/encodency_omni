import { APP } from "@/config/app";
import type { PlatformSettings } from "@/types/domain/settings";

/**
 * Mutable in-memory settings.
 *
 * Section updates write back here so that saving a form and re-reading the
 * page behaves the way it will once a real API is connected.
 */
export const PLATFORM_SETTINGS: PlatformSettings = {
  general: {
    platformName: APP.name,
    supportEmail: APP.supportEmail,
    defaultTimezone: "Asia/Kolkata",
    defaultCurrency: "INR",
    defaultLocale: "en-US",
  },
  branding: {
    productName: APP.name,
    primaryColor: "#2A6F6B",
    logoUrl: null,
    faviconUrl: null,
    loginTagline: "The control layer for omnichannel marketing operations.",
    whiteLabelEnabled: false,
  },
  security: {
    enforceMfaForInternalTeam: true,
    sessionTimeoutMinutes: 60,
    passwordMinLength: 12,
    passwordRequireSymbol: true,
    allowedAdminIpRanges: ["203.0.113.0/24", "198.51.100.0/24"],
    auditRetentionDays: 365,
  },
  email: {
    provider: "ses",
    fromName: "EnCodency omniPlatform",
    fromAddress: "no-reply@encodency.com",
    replyToAddress: APP.supportEmail,
    dailySendLimit: 50_000,
  },
  usageLimits: {
    softLimitWarningPercent: 80,
    allowOverage: false,
    overageGracePercent: 10,
    crawlConcurrencyPerCompany: 4,
    apiRateLimitPerMinute: 600,
  },
  notifications: {
    notifyOnFailedPayment: true,
    notifyOnIntegrationDisconnect: true,
    notifyOnJobFailureThreshold: 25,
    notifyOnSecurityEvent: true,
    digestFrequency: "daily",
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage:
      "EnCodency omniPlatform is undergoing scheduled maintenance and will be back shortly.",
    scheduledWindowStart: null,
    scheduledWindowEnd: null,
    blockTenantWrites: false,
  },
};
