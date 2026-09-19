export type SettingsSectionId =
  | "organization"
  | "workspace"
  | "branding"
  | "notifications"
  | "security"
  | "preferences"
  | "data-privacy"
  | "audit"
  | "danger";

export interface OrganizationAddress {
  country: string;
  state: string;
  city: string;
  address: string;
  pinCode: string;
}

export interface OrganizationMetadata {
  id: string;
  createdAt: string;
  owner: string;
  ownerEmail: string;
  currentPlan: string;
  planStatus: "Active" | "Past Due" | "Trialing";
  totalMembers: number;
  totalClients: number;
}

export interface OrganizationProfile {
  name: string;
  legalName: string;
  displayName: string;
  industry: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  logo: string;
  description: string;
  address: OrganizationAddress;
  metadata: OrganizationMetadata;
}

export interface WorkspaceDefaults {
  primaryClient: string;
  defaultClientAfterLogin: "Moksha Sewa" | "Last Used Client" | "Prompt Every Time";
  rememberLastSelectedClient: boolean;
  defaultWorkspaceLandingPage: "Dashboard" | "Last Used Client" | "Primary Client" | "CRM" | "Analytics";
  defaultDateRange: "Last 7 days" | "Last 30 days" | "Last 90 days" | "Month to date" | "Year to date";
  resetFiltersOnClientSwitch: boolean;
  rememberFiltersPerClient: boolean;
  clearLocalWorkspaceState: boolean;
}

export interface BrandingSettings {
  logo: string;
  favicon: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  reportLogo: string;
  emailLogo: string;
  footerText: string;
  customDomain?: string;
  isWhiteLabelEnabled: boolean;
}

export type NotificationChannel = "inApp" | "email" | "whatsapp" | "slack";

export interface NotificationMatrixItem {
  id: string;
  title: string;
  description: string;
  category: "operational" | "collaboration" | "account" | "billing";
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  slack: boolean;
}

export interface SecurityPolicy {
  authentication: {
    require2FAForAdmins: boolean;
    require2FAForAllMembers: boolean;
    sensitiveActionReauth: boolean;
  };
  sessionPolicy: {
    idleSessionTimeoutMinutes: number; // 15, 30, 60, 240, 480
    maximumSessionDurationHours: number; // 12, 24, 168, 720
    revokeSessionsAfterPasswordChange: boolean;
  };
  accessPolicy: {
    allowedEmailDomains: string[];
    blockPersonalEmailDomains: boolean;
    requireVerifiedEmail: boolean;
  };
  sensitiveActionProtection: {
    requireReauthRemoveMember: boolean;
    requireReauthDisconnectIntegration: boolean;
    requireReauthChangeBilling: boolean;
    requireReauthExportData: boolean;
    requireReauthTransferOwnership: boolean;
  };
}

export interface SecuritySummary {
  twoFactorAdoptionRate: number; // e.g. 88%
  adminsWithout2FA: number;
  activeSessionsCount: number;
  lastSecurityPolicyChange: string;
  lastChangedBy: string;
  securityScore: number; // 0 - 100
}

export interface LocalePreferences {
  timezone: string;
  language: string;
  currency: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  timeFormat: "12-hour" | "24-hour";
  numberFormat: "Indian (1,00,000)" | "International (100,000)";
  weekStartsOn: "Monday" | "Sunday";
}

export interface TablePreferences {
  defaultRowsPerPage: 10 | 25 | 50 | 100;
  compactDensity: boolean;
  stickyHeaders: boolean;
}

export interface ExportPreferences {
  csvSeparator: "," | ";" | "\\t";
  exportDateFormat: "ISO 8601" | "Locale Format" | "Timestamp";
  includeOrganizationMetadata: boolean;
}

export interface UserPreferences {
  locale: LocalePreferences;
  tables: TablePreferences;
  exports: ExportPreferences;
}

export interface DataRetentionPolicy {
  activityHistoryRetentionDays: number; // 90, 180, 365, 1095, 0 (unlimited)
  analyticsRetentionYears: number; // 1, 2, 5, 0 (indefinite)
  exportRetentionDays: number; // 7, 14, 30
}

export interface PrivacyPreferences {
  consentCookieBannerEnabled: boolean;
  explicitOptInForTracking: boolean;
  anonymizeClientIpAddresses: boolean;
  shareCrashReports: boolean;
}

export interface DataExportRequest {
  id: string;
  requestedAt: string;
  completedAt?: string;
  categories: string[];
  status: "idle" | "preparing" | "ready" | "failed";
  progressPercentage?: number;
  downloadUrl?: string;
  fileSizeBytes?: number;
}

export interface DataPrivacySettings {
  retention: DataRetentionPolicy;
  privacy: PrivacyPreferences;
  recentExports: DataExportRequest[];
}

export interface SettingsActivityItem {
  id: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  action: string;
  section: SettingsSectionId;
  settingName: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
  ipAddress: string;
  reason?: string;
}

export interface SettingsCapabilities {
  canViewSettings: boolean;
  canEditOrganization: boolean;
  canEditBranding: boolean;
  canManageNotifications: boolean;
  canManageSecurity: boolean;
  canManagePreferences: boolean;
  canManagePrivacy: boolean;
  canViewAudit: boolean;
  canTransferOwnership: boolean;
  canDeactivateOrganization: boolean;
  canDeleteOrganization: boolean;
  role: "Organization Owner" | "Organization Admin" | "Viewer";
}

export interface AllSettingsState {
  organization: OrganizationProfile;
  workspace: WorkspaceDefaults;
  branding: BrandingSettings;
  notifications: NotificationMatrixItem[];
  security: SecurityPolicy;
  securitySummary: SecuritySummary;
  preferences: UserPreferences;
  dataPrivacy: DataPrivacySettings;
  activity: SettingsActivityItem[];
}
