import type {
  ActivityEvent,
  ConnectionStatus,
  ModuleKey,
  NotificationKey,
  PermissionStatus,
  ProviderCategory,
  ReconnectReason,
  ResourceType,
  Severity,
  SyncDataType,
  SyncFrequency,
} from "./types";
export const INTEGRATIONS_MOCK_MODE = process.env.NEXT_PUBLIC_INTEGRATIONS_MOCK_MODE !== "false";

export const INT_ROOT = "/admin/integrations";

export const intRoutes = {
  overview: INT_ROOT,
  connected: `${INT_ROOT}/connected`,
  available: `${INT_ROOT}/available`,
  activity: `${INT_ROOT}/activity`,
  settings: `${INT_ROOT}/settings`,
  detail: (id: string, tab?: string) => `${INT_ROOT}/${id}${tab ? `?tab=${tab}` : ""}`,
} as const;
export const STATUS_META: Record<
  ConnectionStatus,
  { label: string; chip: string; dot: string; healthy: boolean; order: number }
> = {
  sync_failed: { label: "Sync failed", chip: "bg-[#FEF1F2] text-[#C81E2B] ring-[#FBD5D9]", dot: "bg-[#E11D48]", healthy: false, order: 0 },
  needs_reconnect: { label: "Needs reconnect", chip: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]", dot: "bg-[#F79009]", healthy: false, order: 1 },
  permission_missing: { label: "Permission missing", chip: "bg-[#FFF3EC] text-[#C4320A] ring-[#FCD9C4]", dot: "bg-[#EF6820]", healthy: false, order: 2 },
  expiring: { label: "Expiring", chip: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]", dot: "bg-[#FDB022]", healthy: false, order: 3 },
  rate_limited: { label: "Rate limited", chip: "bg-[#F4F0FF] text-[#6D28D9] ring-[#E2D8FD]", dot: "bg-[#7C3AED]", healthy: false, order: 4 },
  syncing: { label: "Syncing", chip: "bg-[#EFF4FF] text-[#1D4ED8] ring-[#D5E1FD]", dot: "bg-[#2563EB]", healthy: true, order: 5 },
  connected: { label: "Connected", chip: "bg-[#ECFAF3] text-[#067647] ring-[#C6EFD9]", dot: "bg-[#12B76A]", healthy: true, order: 6 },
  disconnected: { label: "Disconnected", chip: "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]", dot: "bg-[#98A2B3]", healthy: false, order: 7 },
};

export const STATUS_ORDER = (Object.keys(STATUS_META) as ConnectionStatus[]).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);

export const STATUS_COLOR: Record<ConnectionStatus, string> = {
  connected: "#12B76A",
  syncing: "#2563EB",
  needs_reconnect: "#F79009",
  expiring: "#FDB022",
  permission_missing: "#EF6820",
  sync_failed: "#E11D48",
  rate_limited: "#7C3AED",
  disconnected: "#98A2B3",
};

export const SEVERITY_META: Record<Severity, { label: string; chip: string; icon: string; order: number }> = {
  critical: { label: "Critical", chip: "bg-[#FEF1F2] text-[#C81E2B] ring-[#FBD5D9]", icon: "bg-[#FEF1F2] text-[#C81E2B]", order: 0 },
  warning: { label: "Warning", chip: "bg-[#FFF7E8] text-[#B54708] ring-[#FBE3B6]", icon: "bg-[#FFF7E8] text-[#B54708]", order: 1 },
  info: { label: "Info", chip: "bg-[#EFF4FF] text-[#1D4ED8] ring-[#D5E1FD]", icon: "bg-[#EFF4FF] text-[#1D4ED8]", order: 2 },
};

export const REASON_LABEL: Record<ReconnectReason, string> = {
  token_expired: "The access token expired",
  access_revoked: "Access was revoked on the provider's side",
  scope_changed: "The provider changed the permissions it grants",
  permission_missing: "A permission OmniPlatform needs was not granted",
  expiring: "The access token is about to expire",
};

export const PERMISSION_STATUS_META: Record<PermissionStatus, { label: string; chip: string }> = {
  granted: { label: "Granted", chip: "bg-[#ECFAF3] text-[#067647] ring-[#C6EFD9]" },
  missing: { label: "Missing", chip: "bg-[#FFF3EC] text-[#C4320A] ring-[#FCD9C4]" },
  expired: { label: "Expired", chip: "bg-[#FEF1F2] text-[#C81E2B] ring-[#FBD5D9]" },
  optional: { label: "Optional", chip: "bg-[#F1F4F8] text-[#475467] ring-[#E4E9F0]" },
};
export const MODULE_META: Record<ModuleKey, { label: string; href: string }> = {
  content_studio: { label: "Content Studio", href: "/admin/content" },
  campaigns: { label: "Campaigns", href: "/admin/campaigns" },
  analytics: { label: "Analytics", href: "/admin/analytics" },
  automation: { label: "Automation", href: "/admin/automation" },
  reports: { label: "Reports", href: "/admin/reports" },
  lead_capture: { label: "Lead Capture", href: "/admin/crm/leads" },
  reviews: { label: "Reviews", href: "/admin/google-business/reviews" },
  inbox: { label: "Inbox", href: "/admin/whatsapp" },
  seo: { label: "SEO", href: "/admin/seo" },
  website: { label: "Website", href: "/admin/website" },
  email: { label: "Email", href: "/admin/automation" },
};

export const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  social: "Social",
  messaging: "Messaging",
  google: "Google",
  website: "Website & data",
  email: "Email",
  crm: "CRM",
};

export const CATEGORY_ORDER: ProviderCategory[] = ["social", "messaging", "google", "website", "email", "crm"];

export const RESOURCE_LABEL: Record<ResourceType, string> = {
  facebook_page: "Facebook Page",
  instagram_account: "Instagram Business Account",
  ad_account: "Ad Account",
  linkedin_page: "Organization Page",
  gbp_location: "Business Location",
  whatsapp_number: "WhatsApp Number",
  youtube_channel: "YouTube Channel",
  x_account: "X Account",
  search_console_property: "Search Console Property",
  ga4_property: "GA4 Property",
  website: "Website",
  smtp_sender: "Sender Address",
};

export const DATA_TYPE_LABEL: Record<SyncDataType, string> = {
  posts: "Posts",
  analytics: "Analytics",
  comments: "Comments",
  reviews: "Reviews",
  leads: "Leads",
  profile: "Profile",
  audience: "Audience",
  messages: "Messages",
  search_performance: "Search performance",
};

export const FREQUENCY_LABEL: Record<SyncFrequency, string> = {
  "15m": "Every 15 minutes",
  hourly: "Every hour",
  "6h": "Every 6 hours",
  daily: "Once a day",
  manual: "Manual only",
};

export const FREQUENCY_MINUTES: Record<SyncFrequency, number | null> = {
  "15m": 15,
  hourly: 60,
  "6h": 360,
  daily: 1440,
  manual: null,
};

export const EVENT_LABEL: Record<ActivityEvent, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  reconnected: "Reconnected",
  reconnect_required: "Reconnect required",
  sync_completed: "Sync completed",
  sync_partial: "Sync partially completed",
  sync_failed: "Sync failed",
  sync_started: "Sync started",
  permission_changed: "Permission updated",
  mapping_changed: "Client mapping changed",
  primary_changed: "Primary account changed",
  resource_removed: "Resource disconnected",
  settings_updated: "Settings updated",
  rate_limited: "Rate limited",
};

export const NOTIFICATION_LABEL: Record<NotificationKey, { label: string; description: string }> = {
  connectionExpired: { label: "Connection expired", description: "An access token expired and syncing has stopped." },
  reconnectRequired: { label: "Reconnect required", description: "A provider revoked access or changed permissions." },
  syncFailed: { label: "Sync failed", description: "A scheduled or manual sync didn't complete." },
  permissionMissing: { label: "Permission missing", description: "A permission a module relies on isn't granted." },
  rateLimit: { label: "Rate limit", description: "A provider is temporarily throttling requests." },
  accountRemoved: { label: "Account removed", description: "A page, property or account is no longer accessible." },
};

export const ROLE_LABEL = { org_admin: "Organization Admin", manager: "Manager", member: "Member" } as const;
