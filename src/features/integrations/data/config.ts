/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Module Constants, Navigations, Badges and Configurations
 */

import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  LayersIcon,
  PlugIcon,
  RadioIcon,
  ServerIcon,
  SettingsIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import type {
  ExternalApiAccess,
  OperationalHealth,
  PlatformAvailability,
  ConnectionHealthStatus,
  IssueSeverity,
  IssueStatus,
  IntegrationSettings,
} from "./types";

export const MOCK_REFERENCE_TIME = new Date("2026-09-19T12:00:00Z").getTime();

export const SESSION_STORAGE_KEYS = {
  integrationsStore: "encodency_integrations_workspace_v1",
};

export const INTEGRATIONS_MODULE_NAV = [
  {
    id: "overview",
    label: "Overview",
    href: "/super-admin/integrations",
    icon: ServerIcon,
  },
  {
    id: "providers",
    label: "Providers",
    href: "/super-admin/integrations/providers",
    icon: PlugIcon,
  },
  {
    id: "connections",
    label: "Connections",
    href: "/super-admin/integrations/connections",
    icon: LayersIcon,
  },
  {
    id: "issues",
    label: "Issues & Health",
    href: "/super-admin/integrations/issues",
    icon: AlertTriangleIcon,
  },
  {
    id: "activity",
    label: "Activity",
    href: "/super-admin/integrations/activity",
    icon: ActivityIcon,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/super-admin/integrations/settings",
    icon: SettingsIcon,
  },
] as const;

export const PLATFORM_AVAILABILITY_META: Record<
  PlatformAvailability,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  live: {
    label: "Live",
    tone: "success",
    description: "Fully enabled for all eligible company tenants.",
  },
  restricted: {
    label: "Restricted",
    tone: "warning",
    description: "Limited to beta tenants or specific plan entitlements.",
  },
  testing: {
    label: "Testing",
    tone: "info",
    description: "Internal sandbox testing only.",
  },
  draft: {
    label: "Draft",
    tone: "neutral",
    description: "Connector scaffolded; awaiting implementation.",
  },
  disabled: {
    label: "Disabled",
    tone: "danger",
    description: "New connections and operations paused by platform.",
  },
  retired: {
    label: "Retired",
    tone: "neutral",
    description: "Deprecated provider; scheduled for removal.",
  },
};

export const EXTERNAL_API_ACCESS_META: Record<
  ExternalApiAccess,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  approved: {
    label: "Approved",
    tone: "success",
    description: "App review approved with production rate limits.",
  },
  pending_approval: {
    label: "Pending Review",
    tone: "warning",
    description: "Submission under review with external developer portal.",
  },
  limited_access: {
    label: "Limited Access",
    tone: "warning",
    description: "Development/sandbox tier or unverified quotas apply.",
  },
  requested: {
    label: "Requested",
    tone: "info",
    description: "Verification paperwork initiated.",
  },
  not_requested: {
    label: "Not Requested",
    tone: "neutral",
    description: "Pre-submission phase; credentials not yet submitted.",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
    description: "External provider rejected scopes or policy compliance.",
  },
  not_applicable: {
    label: "Not Applicable",
    tone: "neutral",
    description: "Direct API key or partner protocol without app review.",
  },
};

export const OPERATIONAL_HEALTH_META: Record<
  OperationalHealth,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; icon: any; description: string }
> = {
  operational: {
    label: "Operational",
    tone: "success",
    icon: CheckCircle2Icon,
    description: "All endpoints responsive with normal latencies.",
  },
  degraded: {
    label: "Degraded",
    tone: "warning",
    icon: AlertTriangleIcon,
    description: "Elevated error rates or API rate limit throttling.",
  },
  partial_outage: {
    label: "Partial Outage",
    tone: "warning",
    icon: RadioIcon,
    description: "Specific endpoints (e.g. video upload, webhooks) failing.",
  },
  major_outage: {
    label: "Major Outage",
    tone: "danger",
    icon: XCircleIcon,
    description: "Provider API completely unreachable or throwing 5xx errors.",
  },
  unknown: {
    label: "Unknown",
    tone: "neutral",
    icon: ClockIcon,
    description: "Insufficient telemetry to determine health state.",
  },
};

export const CONNECTION_HEALTH_META: Record<
  ConnectionHealthStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; description: string }
> = {
  healthy: {
    label: "Healthy",
    tone: "success",
    description: "Valid token, regular syncs, no scope issues.",
  },
  needs_reconnect: {
    label: "Needs Reconnect",
    tone: "warning",
    description: "Access or refresh token expired; re-auth required.",
  },
  permission_issue: {
    label: "Permission Issue",
    tone: "warning",
    description: "User or admin revoked a required permission scope.",
  },
  sync_failure: {
    label: "Sync Failure",
    tone: "danger",
    description: "Repeated errors during background synchronization.",
  },
  rate_limited: {
    label: "Rate Limited",
    tone: "warning",
    description: "Temporarily throttled by external provider limits.",
  },
  disconnected: {
    label: "Disconnected",
    tone: "neutral",
    description: "Account connection disconnected by company user.",
  },
};

export const ISSUE_SEVERITY_META: Record<
  IssueSeverity,
  { label: string; tone: "danger" | "warning" | "info"; icon: any }
> = {
  critical: {
    label: "Critical",
    tone: "danger",
    icon: ShieldAlertIcon,
  },
  warning: {
    label: "Warning",
    tone: "warning",
    icon: AlertTriangleIcon,
  },
  info: {
    label: "Info",
    tone: "info",
    icon: CheckCircle2Icon,
  },
};

export const ISSUE_STATUS_META: Record<
  IssueStatus,
  { label: string; tone: "danger" | "warning" | "info" | "success" }
> = {
  open: { label: "Open", tone: "danger" },
  investigating: { label: "Investigating", tone: "warning" },
  mitigated: { label: "Mitigated", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  newConnectionApprovalPolicy: "automatic",
  inactiveConnectionReviewDays: 60,
  reauthorizationRequestDefaults: {
    reminderDays: 7,
    escalateToOwner: true,
    autoPauseAfterDays: 14,
  },
  connectionOwnershipPolicy: "strict_company_silo",
  tokenExpiryWarningDays: 14,
  connectionHealthCheckIntervalMinutes: 15,
  providerIncidentAlertThreshold: "any_degradation",
  repeatedFailureThreshold: 5,
  defaultSyncIntervalMinutes: 30,
  retryPolicy: "exponential_backoff",
  backoffMaxRetries: 4,
  failureEscalationPolicy: "flag_connection",
  notificationPolicies: {
    providerOutageAlerts: true,
    connectionExpiryAlerts: true,
    permissionRevocationAlerts: true,
    integrationFailureEscalation: true,
  },
  accessAndSecurity: {
    whoCanEditConfig: "super_admin_only",
    whoCanChangeAvailability: "super_admin_only",
    whoCanPauseOperations: "super_admin_only",
    requireTwoFactorForSensitiveActions: true,
  },
};
