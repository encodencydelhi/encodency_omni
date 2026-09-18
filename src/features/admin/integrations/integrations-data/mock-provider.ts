/**
 * Deterministic mock dataset for the integrations workspace.
 *
 * Only `repository.ts` imports this file. Values come from a seeded PRNG so
 * record counts, durations and history are identical on every reload.
 */

import { addDays, addMinutes, subDays, subHours, subMinutes } from "date-fns";
import { adminClients } from "@/mocks/admin/admin-dashboard.mock";
import type {
  IntegrationActivity,
  IntegrationClient,
  IntegrationConnection,
  IntegrationDependency,
  IntegrationPermission,
  IntegrationProvider,
  IntegrationResource,
  IntegrationSettings,
  IntegrationSyncRun,
  ModuleKey,
  PermissionStatus,
  ProviderId,
  ResourceType,
} from "./types";

const NOW = new Date();
const iso = (date: Date) => date.toISOString();

export function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Clients — the same list the shell's client switcher uses            */
/* ------------------------------------------------------------------ */

export const mockClients: IntegrationClient[] = adminClients.map((client) => ({
  id: client.id,
  name: client.name,
  color: client.color ?? "#3B82F6",
}));

/* ------------------------------------------------------------------ */
/* Provider catalog (what the platform has made available)             */
/* ------------------------------------------------------------------ */

const p = (key: string, label: string, description: string, requiredFor: ModuleKey[], technicalScope: string, optional = false) => ({
  key,
  label,
  description,
  requiredFor,
  technicalScope,
  optional,
});

export const mockProviders: IntegrationProvider[] = [
  {
    id: "meta",
    name: "Meta & Instagram",
    category: "social",
    description: "Publish to Facebook Pages and Instagram, pull insights, manage comments and capture lead-form submissions.",
    scope: "client",
    resourceTypes: [
      { type: "facebook_page", label: "Facebook Pages", multiple: true },
      { type: "instagram_account", label: "Instagram Business Accounts", multiple: true },
      { type: "ad_account", label: "Ad Accounts", multiple: true },
    ],
    permissions: [
      p("read_profile", "Read account data", "Page names, profile details and follower counts.", ["content_studio", "analytics"], "pages_show_list"),
      p("publish", "Publish content", "Create and schedule posts, Reels and Stories.", ["content_studio", "campaigns"], "pages_manage_posts"),
      p("read_insights", "Read analytics", "Reach, engagement and audience insights.", ["analytics", "reports"], "read_insights"),
      p("manage_comments", "Manage comments", "Read and reply to comments on your posts.", ["inbox", "automation"], "pages_manage_engagement"),
      p("read_leads", "Read leads", "Receive lead-ad form submissions.", ["lead_capture", "automation"], "leads_retrieval", true),
      p("read_ads", "Read ad performance", "Spend and results for your ad accounts.", ["campaigns", "reports"], "ads_read", true),
    ],
    dataTypes: ["posts", "analytics", "comments", "leads", "audience", "profile"],
    modules: ["content_studio", "campaigns", "analytics", "automation", "lead_capture", "reports", "inbox"],
    requirements: ["A Facebook Page you manage", "An Instagram Business or Creator account linked to it"],
    availability: "available",
    learnMoreUrl: "https://www.facebook.com/business/help",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "social",
    description: "Publish to organization pages and report on follower growth and post engagement.",
    scope: "client",
    resourceTypes: [{ type: "linkedin_page", label: "Organization Pages", multiple: true }],
    permissions: [
      p("read_org", "Read account data", "Organization page details and follower counts.", ["content_studio", "analytics"], "r_organization_social"),
      p("publish", "Publish content", "Create posts on behalf of the organization.", ["content_studio", "campaigns"], "w_organization_social"),
      p("read_analytics", "Read analytics", "Impressions, clicks and follower demographics.", ["analytics", "reports"], "r_organization_admin"),
      p("manage_comments", "Manage comments", "Read and reply to comments.", ["inbox"], "r_organization_social_feed", true),
    ],
    dataTypes: ["posts", "analytics", "comments", "audience"],
    modules: ["content_studio", "campaigns", "analytics", "reports"],
    requirements: ["Super-admin or content-admin role on the LinkedIn page"],
    availability: "available",
    learnMoreUrl: "https://www.linkedin.com/help/linkedin",
  },
  {
    id: "google-business",
    name: "Google Business Profile",
    category: "google",
    description: "Manage locations, publish updates, and read and reply to reviews.",
    scope: "client",
    resourceTypes: [{ type: "gbp_location", label: "Business Locations", multiple: true }],
    permissions: [
      p("read_business", "Read account data", "Locations, hours and profile details.", ["reviews", "analytics"], "business.manage (read)"),
      p("publish", "Publish content", "Post updates, offers and events.", ["content_studio"], "business.manage (posts)"),
      p("reviews", "Manage reviews", "Read reviews and post replies.", ["reviews", "automation"], "business.manage (reviews)"),
      p("insights", "Read analytics", "Searches, views and actions on your profile.", ["analytics", "reports"], "business.manage (performance)"),
    ],
    dataTypes: ["reviews", "posts", "analytics", "profile"],
    modules: ["reviews", "content_studio", "analytics", "reports", "automation"],
    requirements: ["Owner or manager access to the business profile"],
    availability: "available",
    learnMoreUrl: "https://support.google.com/business",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "messaging",
    description: "Send template messages and broadcasts, and run two-way conversations from the inbox.",
    scope: "client",
    resourceTypes: [{ type: "whatsapp_number", label: "Phone Numbers", multiple: true }],
    permissions: [
      p("messaging", "Send messages", "Send template and session messages.", ["campaigns", "automation"], "whatsapp_business_messaging"),
      p("templates", "Manage templates", "Create and sync message templates.", ["campaigns"], "whatsapp_business_management"),
      p("read_messages", "Read conversations", "Receive incoming messages in the inbox.", ["inbox", "automation"], "whatsapp_business_messaging (inbound)"),
      p("profile", "Read account data", "Business profile and number quality rating.", ["analytics"], "business_management", true),
    ],
    dataTypes: ["messages", "analytics", "profile"],
    modules: ["inbox", "campaigns", "automation", "analytics"],
    requirements: ["A verified WhatsApp Business account", "An approved display name"],
    availability: "available",
    learnMoreUrl: "https://business.whatsapp.com",
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "google",
    description: "Upload and schedule videos, moderate comments and report on channel analytics.",
    scope: "client",
    resourceTypes: [{ type: "youtube_channel", label: "Channels", multiple: true }],
    permissions: [
      p("read_channel", "Read account data", "Channel details, videos and playlists.", ["content_studio", "analytics"], "youtube.readonly"),
      p("upload", "Publish content", "Upload and schedule videos.", ["content_studio"], "youtube.upload"),
      p("analytics", "Read analytics", "Views, watch time and audience reports.", ["analytics", "reports"], "yt-analytics.readonly"),
      p("manage_comments", "Manage comments", "Reply to and moderate comments.", ["inbox", "automation"], "youtube.force-ssl"),
    ],
    dataTypes: ["posts", "analytics", "comments", "audience"],
    modules: ["content_studio", "analytics", "reports", "inbox", "automation"],
    requirements: ["Owner or manager access to the channel"],
    availability: "available",
    learnMoreUrl: "https://support.google.com/youtube",
  },
  {
    id: "x",
    name: "X (Twitter)",
    category: "social",
    description: "Publish posts and threads, run the mentions inbox and report on engagement.",
    scope: "client",
    resourceTypes: [{ type: "x_account", label: "Accounts", multiple: false }],
    permissions: [
      p("read_posts", "Read account data", "Posts, mentions and profile details.", ["content_studio", "inbox"], "tweet.read"),
      p("write_posts", "Publish content", "Publish posts, threads and replies.", ["content_studio", "campaigns"], "tweet.write"),
      p("read_analytics", "Read analytics", "Impressions and engagement for your posts.", ["analytics", "reports"], "users.read"),
      p("offline", "Stay connected", "Refresh access in the background so sync keeps working.", ["automation"], "offline.access"),
    ],
    dataTypes: ["posts", "analytics", "comments", "audience"],
    modules: ["content_studio", "campaigns", "analytics", "inbox"],
    requirements: ["Access to the X account you want to connect"],
    availability: "available",
    learnMoreUrl: "https://help.x.com",
  },
  {
    id: "search-console",
    name: "Search Console",
    category: "google",
    description: "Pull search queries, rankings and indexing status into SEO reporting.",
    scope: "client",
    resourceTypes: [{ type: "search_console_property", label: "Properties", multiple: true }],
    permissions: [
      p("read_properties", "Read account data", "The list of verified properties.", ["seo"], "webmasters.readonly (sites)"),
      p("search_analytics", "Read analytics", "Queries, clicks, impressions and average position.", ["seo", "reports", "analytics"], "webmasters.readonly (searchanalytics)"),
      p("url_inspection", "Inspect URLs", "Indexing status for individual pages.", ["seo"], "webmasters (urlInspection)", true),
    ],
    dataTypes: ["search_performance", "analytics"],
    modules: ["seo", "reports", "analytics"],
    requirements: ["A verified property you own or have full access to"],
    availability: "available",
    learnMoreUrl: "https://support.google.com/webmasters",
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    category: "google",
    description: "Bring sessions, conversions and traffic sources into analytics and reports.",
    scope: "client",
    resourceTypes: [{ type: "ga4_property", label: "Properties", multiple: false }],
    permissions: [
      p("read_properties", "Read account data", "Accounts and properties you can access.", ["analytics"], "analytics.readonly (admin)"),
      p("read_reports", "Read analytics", "Traffic, engagement and conversion reports.", ["analytics", "reports", "website"], "analytics.readonly (data)"),
    ],
    dataTypes: ["analytics", "audience"],
    modules: ["analytics", "reports", "website"],
    requirements: ["Viewer access or higher on the GA4 property"],
    availability: "available",
    learnMoreUrl: "https://support.google.com/analytics",
  },
  {
    id: "website-tracking",
    name: "Website Tracking",
    category: "website",
    description: "OmniPlatform's own tracking snippet — captures form submissions and on-site events.",
    scope: "client",
    resourceTypes: [{ type: "website", label: "Websites", multiple: true }],
    permissions: [
      p("collect_events", "Collect site events", "Page views and custom events from the snippet.", ["website", "analytics"], "snippet:events"),
      p("read_forms", "Read leads", "Form submissions captured on the site.", ["lead_capture", "automation"], "snippet:forms"),
    ],
    dataTypes: ["analytics", "leads"],
    modules: ["website", "analytics", "lead_capture", "automation"],
    requirements: ["Ability to add a script tag to your website"],
    availability: "available",
    learnMoreUrl: "/admin/website",
  },
  {
    id: "smtp",
    name: "SMTP Email",
    category: "email",
    description: "Send automation and notification emails through your organization's own mail server.",
    scope: "organization",
    resourceTypes: [{ type: "smtp_sender", label: "Sender Addresses", multiple: true }],
    permissions: [
      p("send_email", "Send email", "Deliver emails from automations and notifications.", ["automation", "email"], "smtp:send"),
      p("verify_sender", "Verify sender", "Confirm sender addresses before first use.", ["email"], "smtp:verify"),
    ],
    dataTypes: ["profile"],
    modules: ["automation", "email"],
    requirements: ["An SMTP host your IT team can issue credentials for"],
    availability: "available",
    learnMoreUrl: "/admin/automation",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "email",
    description: "Sync audiences and trigger email campaigns from OmniPlatform automations.",
    scope: "client",
    resourceTypes: [],
    permissions: [],
    dataTypes: ["audience"],
    modules: ["email", "automation"],
    requirements: [],
    availability: "plan_restricted",
    availabilityNote: "Not available on your current plan. Upgrade to Growth or above to connect Mailchimp.",
    learnMoreUrl: "/admin/billing",
  },
  {
    id: "tiktok",
    name: "TikTok",
    category: "social",
    description: "Publish short videos and report on views and engagement.",
    scope: "client",
    resourceTypes: [],
    permissions: [],
    dataTypes: ["posts", "analytics"],
    modules: ["content_studio", "analytics"],
    requirements: [],
    availability: "platform_disabled",
    availabilityNote: "Disabled by your platform administrator. Contact your OmniPlatform account manager to request access.",
    learnMoreUrl: "https://www.tiktok.com/business",
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "crm",
    description: "Two-way sync of contacts, deals and lead sources with HubSpot.",
    scope: "organization",
    resourceTypes: [],
    permissions: [],
    dataTypes: ["leads"],
    modules: ["lead_capture", "automation"],
    requirements: [],
    availability: "coming_soon",
    availabilityNote: "Coming soon. We'll let you know when it's ready to connect.",
    learnMoreUrl: "/admin/crm/leads",
  },
];

const providerById = (id: ProviderId) => mockProviders.find((provider) => provider.id === id)!;

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

type ResourceSeed = { type: ResourceType; name: string; handle: string; clientId?: string; status?: IntegrationResource["status"] };

interface ConnectionSeed {
  id: string;
  providerId: ProviderId;
  clientId: string | null;
  accountName: string;
  status: IntegrationConnection["status"];
  statusReason?: IntegrationConnection["statusReason"];
  connectedDaysAgo: number;
  connectedBy: string;
  lastSyncMinutesAgo: number | null;
  frequency: IntegrationConnection["syncFrequency"];
  tokenExpiresInDays?: number;
  rateLimitResetMinutes?: number;
  resources: ResourceSeed[];
  /** Permission keys forced into a non-granted status. */
  permissionOverrides?: Record<string, PermissionStatus>;
  /** Optional permissions the admin declined when connecting. */
  declined?: string[];
}

const seeds: ConnectionSeed[] = [
  {
    id: "meta-moksha-sewa",
    providerId: "meta",
    clientId: "moksha-sewa",
    accountName: "Moksha Sewa",
    status: "connected",
    connectedDaysAgo: 214,
    connectedBy: "Manish Sirohi",
    lastSyncMinutesAgo: 58,
    frequency: "hourly",
    tokenExpiresInDays: 51,
    resources: [
      { type: "facebook_page", name: "Moksha Sewa", handle: "facebook.com/mokshasewa" },
      { type: "instagram_account", name: "@mokshasewa.official", handle: "instagram.com/mokshasewa.official" },
      { type: "ad_account", name: "Moksha Sewa · Ads", handle: "Ad account ending 2291" },
    ],
    declined: ["read_ads"],
  },
  {
    id: "linkedin-moksha-sewa",
    providerId: "linkedin",
    clientId: "moksha-sewa",
    accountName: "Moksha Sewa Foundation",
    status: "expiring",
    statusReason: { code: "expiring", detail: "LinkedIn tokens last 60 days. This one expires in 3 days." },
    connectedDaysAgo: 57,
    connectedBy: "Manish Sirohi",
    lastSyncMinutesAgo: 124,
    frequency: "6h",
    tokenExpiresInDays: 3,
    resources: [{ type: "linkedin_page", name: "Moksha Sewa Foundation", handle: "linkedin.com/company/moksha-sewa" }],
  },
  {
    id: "search-console-moksha-sewa",
    providerId: "search-console",
    clientId: "moksha-sewa",
    accountName: "mokshasewa.org",
    status: "permission_missing",
    statusReason: { code: "permission_missing", detail: "Search performance data wasn't granted, so rankings and query reports can't update." },
    connectedDaysAgo: 96,
    connectedBy: "Anita Desai",
    lastSyncMinutesAgo: 190,
    frequency: "daily",
    resources: [{ type: "search_console_property", name: "mokshasewa.org", handle: "sc-domain:mokshasewa.org" }],
    permissionOverrides: { search_analytics: "missing" },
  },
  {
    id: "google-business-moksha-sewa",
    providerId: "google-business",
    clientId: "moksha-sewa",
    accountName: "Moksha Sewa",
    status: "connected",
    connectedDaysAgo: 301,
    connectedBy: "Manish Sirohi",
    lastSyncMinutesAgo: 37,
    frequency: "hourly",
    resources: [
      { type: "gbp_location", name: "Moksha Sewa — Varanasi", handle: "Assi Ghat Road, Varanasi" },
      { type: "gbp_location", name: "Green Ghats — Haridwar Office", handle: "Har Ki Pauri, Haridwar", clientId: "green-ghats" },
    ],
  },
  {
    id: "whatsapp-moksha-sewa",
    providerId: "whatsapp",
    clientId: "moksha-sewa",
    accountName: "+91 98xxx 42110",
    status: "sync_failed",
    statusReason: { code: "sync_error", detail: "WhatsApp returned an error while syncing message templates (HTTP 502). Incoming messages may be delayed." },
    connectedDaysAgo: 140,
    connectedBy: "Anita Desai",
    lastSyncMinutesAgo: 312,
    frequency: "15m",
    resources: [{ type: "whatsapp_number", name: "Moksha Sewa Helpline", handle: "+91 98xxx 42110" }],
  },
  {
    id: "website-moksha-sewa",
    providerId: "website-tracking",
    clientId: "moksha-sewa",
    accountName: "mokshasewa.org",
    status: "connected",
    connectedDaysAgo: 402,
    connectedBy: "Manish Sirohi",
    lastSyncMinutesAgo: 9,
    frequency: "15m",
    resources: [{ type: "website", name: "mokshasewa.org", handle: "https://mokshasewa.org" }],
  },
  {
    id: "youtube-ganga-aarti",
    providerId: "youtube",
    clientId: "ganga-aarti",
    accountName: "Ganga Aarti Live",
    status: "permission_missing",
    statusReason: { code: "scope_changed", detail: "YouTube changed the permissions attached to this connection. Comment moderation is no longer granted." },
    connectedDaysAgo: 188,
    connectedBy: "Rohit Verma",
    lastSyncMinutesAgo: 71,
    frequency: "hourly",
    resources: [{ type: "youtube_channel", name: "Ganga Aarti Live", handle: "youtube.com/@GangaAartiLive" }],
    permissionOverrides: { manage_comments: "expired" },
  },
  {
    id: "x-ganga-aarti",
    providerId: "x",
    clientId: "ganga-aarti",
    accountName: "@GangaAarti",
    status: "needs_reconnect",
    statusReason: { code: "token_expired", detail: "The X access token expired and couldn't be refreshed. Publishing and mentions sync have stopped." },
    connectedDaysAgo: 120,
    connectedBy: "Rohit Verma",
    lastSyncMinutesAgo: 1_460,
    frequency: "hourly",
    resources: [{ type: "x_account", name: "@GangaAarti", handle: "x.com/GangaAarti" }],
    permissionOverrides: { read_posts: "expired", write_posts: "expired", read_analytics: "expired", offline: "expired" },
  },
  {
    id: "ga4-ganga-aarti",
    providerId: "ga4",
    clientId: "ganga-aarti",
    accountName: "Ganga Aarti — Web",
    status: "syncing",
    connectedDaysAgo: 33,
    connectedBy: "Rohit Verma",
    lastSyncMinutesAgo: 62,
    frequency: "hourly",
    resources: [{ type: "ga4_property", name: "Ganga Aarti — Web", handle: "Property 412-883-019" }],
  },
  {
    id: "whatsapp-ganga-aarti",
    providerId: "whatsapp",
    clientId: "ganga-aarti",
    accountName: "+91 99xxx 18073",
    status: "connected",
    connectedDaysAgo: 76,
    connectedBy: "Rohit Verma",
    lastSyncMinutesAgo: 6,
    frequency: "15m",
    resources: [{ type: "whatsapp_number", name: "Ganga Aarti Bookings", handle: "+91 99xxx 18073" }],
  },
  {
    id: "meta-green-ghats",
    providerId: "meta",
    clientId: "green-ghats",
    accountName: "Green Ghats",
    status: "needs_reconnect",
    statusReason: { code: "access_revoked", detail: "A Page admin removed OmniPlatform's access in Facebook settings. Posts, comments and leads have stopped syncing." },
    connectedDaysAgo: 166,
    connectedBy: "Anita Desai",
    lastSyncMinutesAgo: 2_880,
    frequency: "hourly",
    resources: [
      { type: "facebook_page", name: "Green Ghats", handle: "facebook.com/greenghats", status: "access_revoked" },
      { type: "instagram_account", name: "@greenghats", handle: "instagram.com/greenghats", status: "access_revoked" },
    ],
    permissionOverrides: { read_profile: "expired", publish: "expired", read_insights: "expired", manage_comments: "expired", read_leads: "expired" },
    declined: ["read_ads"],
  },
  {
    id: "google-business-green-ghats",
    providerId: "google-business",
    clientId: "green-ghats",
    accountName: "Green Ghats",
    status: "rate_limited",
    statusReason: { code: "rate_limit", detail: "Google is temporarily throttling requests for this account. Sync resumes automatically." },
    connectedDaysAgo: 88,
    connectedBy: "Anita Desai",
    lastSyncMinutesAgo: 44,
    frequency: "hourly",
    rateLimitResetMinutes: 18,
    resources: [{ type: "gbp_location", name: "Green Ghats — Rishikesh", handle: "Laxman Jhula Road, Rishikesh" }],
  },
  {
    id: "search-console-green-ghats",
    providerId: "search-console",
    clientId: "green-ghats",
    accountName: "greenghats.in",
    status: "connected",
    connectedDaysAgo: 210,
    connectedBy: "Anita Desai",
    lastSyncMinutesAgo: 240,
    frequency: "daily",
    resources: [{ type: "search_console_property", name: "greenghats.in", handle: "sc-domain:greenghats.in" }],
  },
  {
    id: "linkedin-green-ghats",
    providerId: "linkedin",
    clientId: "green-ghats",
    accountName: "Green Ghats",
    status: "disconnected",
    connectedDaysAgo: 330,
    connectedBy: "Anita Desai",
    lastSyncMinutesAgo: 30 * 1440,
    frequency: "6h",
    resources: [{ type: "linkedin_page", name: "Green Ghats", handle: "linkedin.com/company/green-ghats" }],
  },
];

function buildPermissions(providerId: ProviderId, overrides: Record<string, PermissionStatus> = {}, declined: string[] = []): IntegrationPermission[] {
  return providerById(providerId).permissions.map((definition) => ({
    key: definition.key,
    status: overrides[definition.key] ?? (declined.includes(definition.key) ? "optional" : "granted"),
  }));
}

function buildConnection(seed: ConnectionSeed): IntegrationConnection {
  const lastSync = seed.lastSyncMinutesAgo === null ? null : subMinutes(NOW, seed.lastSyncMinutesAgo);
  const frequencyMinutes = seed.frequency === "15m" ? 15 : seed.frequency === "hourly" ? 60 : seed.frequency === "6h" ? 360 : 1440;
  const disconnected = seed.status === "disconnected";
  return {
    id: seed.id,
    providerId: seed.providerId,
    clientId: seed.clientId,
    accountName: seed.accountName,
    status: seed.status,
    statusReason: seed.statusReason ?? null,
    connectedAt: iso(subDays(NOW, seed.connectedDaysAgo)),
    connectedBy: seed.connectedBy,
    lastSyncAt: lastSync ? iso(lastSync) : null,
    // Broken connections have no next sync — nothing will run until they're fixed.
    nextSyncAt: disconnected || seed.status === "needs_reconnect" ? null : iso(addMinutes(lastSync ?? NOW, frequencyMinutes)),
    tokenExpiresAt: seed.tokenExpiresInDays ? iso(addDays(NOW, seed.tokenExpiresInDays)) : null,
    rateLimitResetAt: seed.rateLimitResetMinutes ? iso(addMinutes(NOW, seed.rateLimitResetMinutes)) : null,
    syncFrequency: seed.frequency,
    permissions: buildPermissions(seed.providerId, seed.permissionOverrides, seed.declined),
    resources: seed.resources.map((resource, index) => ({
      id: `${seed.id}-r${index + 1}`,
      connectionId: seed.id,
      type: resource.type,
      name: resource.name,
      handle: resource.handle,
      clientId: resource.clientId ?? seed.clientId ?? mockClients[0]!.id,
      primary: index === 0,
      status: resource.status ?? "active",
      lastSyncAt: lastSync ? iso(lastSync) : null,
    })),
    disconnectedAt: disconnected ? iso(subDays(NOW, 30)) : null,
  };
}

export const mockConnections: IntegrationConnection[] = seeds.map(buildConnection);

/* ------------------------------------------------------------------ */
/* Dependencies                                                        */
/* ------------------------------------------------------------------ */

type DepSeed = [ModuleKey, string, number, string, boolean];

const depSeeds: Record<string, DepSeed[]> = {
  "meta-moksha-sewa": [
    ["automation", "Lead follow-up and comment auto-reply workflows", 3, "active workflows", true],
    ["content_studio", "Scheduled Facebook and Instagram posts", 12, "scheduled posts", true],
    ["campaigns", "Donation drive campaigns", 2, "active campaigns", true],
    ["lead_capture", "Lead-ad form sync", 1, "lead form", true],
    ["analytics", "Social performance dashboards", 4, "dashboards", false],
    ["reports", "Monthly trustee report", 2, "scheduled reports", false],
  ],
  "linkedin-moksha-sewa": [
    ["content_studio", "Scheduled LinkedIn posts", 5, "scheduled posts", true],
    ["analytics", "Follower growth dashboard", 1, "dashboard", false],
    ["reports", "Monthly trustee report", 1, "scheduled report", false],
  ],
  "search-console-moksha-sewa": [
    ["seo", "Keyword rankings and query reports", 48, "tracked keywords", false],
    ["reports", "SEO monthly summary", 1, "scheduled report", false],
    ["analytics", "Organic traffic widget", 1, "dashboard", false],
  ],
  "google-business-moksha-sewa": [
    ["reviews", "Review inbox and replies", 2, "locations", true],
    ["automation", "Review response workflow", 1, "active workflow", true],
    ["content_studio", "Google posts", 3, "scheduled posts", false],
    ["analytics", "Local search dashboard", 1, "dashboard", false],
  ],
  "whatsapp-moksha-sewa": [
    ["inbox", "Helpline conversations", 26, "open conversations", true],
    ["automation", "Volunteer confirmation messages", 2, "active workflows", true],
    ["campaigns", "Festival broadcast", 1, "active campaign", true],
    ["analytics", "Message delivery dashboard", 1, "dashboard", false],
  ],
  "website-moksha-sewa": [
    ["lead_capture", "Volunteer and donation forms", 4, "forms", true],
    ["automation", "Form follow-up workflow", 1, "active workflow", true],
    ["website", "Site analytics", 1, "site", false],
    ["analytics", "Conversion dashboard", 1, "dashboard", false],
  ],
  "youtube-ganga-aarti": [
    ["content_studio", "Scheduled video uploads", 3, "scheduled videos", true],
    ["inbox", "Comment moderation", 14, "comments awaiting reply", false],
    ["analytics", "Channel analytics", 1, "dashboard", false],
    ["reports", "Weekly aarti viewership report", 1, "scheduled report", false],
  ],
  "x-ganga-aarti": [
    ["content_studio", "Scheduled posts", 4, "scheduled posts", true],
    ["inbox", "Mentions inbox", 9, "unanswered mentions", false],
    ["analytics", "Engagement dashboard", 1, "dashboard", false],
  ],
  "ga4-ganga-aarti": [
    ["analytics", "Website traffic dashboard", 2, "dashboards", false],
    ["reports", "Monthly donor report", 1, "scheduled report", false],
    ["website", "Traffic sources", 1, "site", false],
  ],
  "whatsapp-ganga-aarti": [
    ["inbox", "Booking conversations", 11, "open conversations", true],
    ["automation", "Booking confirmation workflow", 1, "active workflow", true],
  ],
  "meta-green-ghats": [
    ["content_studio", "Scheduled posts", 6, "scheduled posts", true],
    ["automation", "Comment auto-reply workflow", 1, "active workflow", true],
    ["lead_capture", "Lead-ad form sync", 1, "lead form", true],
    ["analytics", "Social dashboard", 1, "dashboard", false],
  ],
  "google-business-green-ghats": [
    ["reviews", "Review inbox and replies", 1, "location", true],
    ["analytics", "Local search dashboard", 1, "dashboard", false],
  ],
  "search-console-green-ghats": [
    ["seo", "Keyword rankings", 22, "tracked keywords", false],
    ["reports", "SEO monthly summary", 1, "scheduled report", false],
  ],
  "linkedin-green-ghats": [],
};

function dependencyStatus(connection: IntegrationConnection, critical: boolean): IntegrationDependency["status"] {
  if (connection.status === "disconnected") return "broken";
  if (connection.status === "needs_reconnect" || connection.status === "sync_failed") return critical ? "broken" : "at_risk";
  if (connection.status === "expiring" || connection.status === "permission_missing" || connection.status === "rate_limited") return "at_risk";
  return "active";
}

export const mockDependencies: IntegrationDependency[] = mockConnections.flatMap((connection) =>
  (depSeeds[connection.id] ?? []).map(([module, feature, activeCount, unit, critical], index) => ({
    id: `${connection.id}-d${index + 1}`,
    connectionId: connection.id,
    clientId: connection.clientId,
    module,
    feature,
    activeCount,
    unit,
    critical,
    status: dependencyStatus(connection, critical),
    href: `/admin/${module === "content_studio" ? "content" : module === "lead_capture" ? "crm/leads" : module === "inbox" ? "whatsapp" : module === "reviews" ? "google-business/reviews" : module}`,
  })),
);

/* ------------------------------------------------------------------ */
/* Sync history                                                        */
/* ------------------------------------------------------------------ */

export const mockSyncRuns: IntegrationSyncRun[] = mockConnections.flatMap((connection, connectionIndex) => {
  if (!connection.lastSyncAt) return [];
  const provider = providerById(connection.providerId);
  const last = new Date(connection.lastSyncAt);
  const step = connection.syncFrequency === "15m" ? 0.25 : connection.syncFrequency === "hourly" ? 1 : connection.syncFrequency === "6h" ? 6 : 24;

  return Array.from({ length: 8 }, (_, index) => {
    const rand = seeded(connectionIndex * 100 + index);
    const startedAt = subHours(last, index * step);
    const durationMs = Math.round(4_000 + rand() * 38_000);
    let status: IntegrationSyncRun["status"] = "success";
    let error: IntegrationSyncRun["error"] = null;

    // The most recent run reflects the connection's current trouble.
    if (index === 0 && connection.status === "sync_failed") {
      status = "failed";
      error = { message: "Template sync returned HTTP 502 from WhatsApp.", hint: "This is usually temporary on WhatsApp's side. Retry now; if it persists, check the number's quality rating." };
    } else if (index === 0 && (connection.status === "permission_missing" || connection.status === "rate_limited")) {
      status = "partial";
      error = {
        message: connection.status === "rate_limited" ? "Stopped early — the provider started throttling requests." : "Some data types were skipped because a permission isn't granted.",
        hint: connection.status === "rate_limited" ? "No action needed. The rest will sync after the limit resets." : "Reconnect and grant the missing permission to sync everything.",
      };
    } else if (index === 3 && rand() > 0.55) {
      status = "partial";
      error = { message: "A handful of records failed validation and were skipped.", hint: "They'll be retried on the next sync." };
    }

    const records = Math.round(40 + rand() * 1_600);
    return {
      id: `${connection.id}-run${index + 1}`,
      connectionId: connection.id,
      clientId: connection.clientId,
      trigger: index === 2 ? "manual" : "scheduled",
      status,
      startedAt: iso(startedAt),
      endedAt: iso(new Date(startedAt.getTime() + durationMs)),
      durationMs,
      recordsProcessed: status === "failed" ? 0 : records,
      failedRecords: status === "failed" ? 0 : status === "partial" ? Math.round(3 + rand() * 40) : 0,
      dataTypes: provider.dataTypes,
      error,
    };
  });
});

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

type ActivitySeed = [string | null, IntegrationActivity["event"], IntegrationActivity["result"], string, string, number];

const activitySeeds: ActivitySeed[] = [
  ["whatsapp-moksha-sewa", "sync_failed", "failed", "System", "Template sync failed with HTTP 502", 312],
  ["website-moksha-sewa", "sync_completed", "success", "System", "Synced 184 events and 3 form submissions", 9],
  ["whatsapp-ganga-aarti", "sync_completed", "success", "System", "Synced 62 messages", 6],
  ["google-business-moksha-sewa", "sync_completed", "success", "System", "Synced 2 locations and 11 reviews", 37],
  ["google-business-green-ghats", "rate_limited", "warning", "System", "Google throttled requests — sync paused until the limit resets", 44],
  ["meta-moksha-sewa", "sync_completed", "success", "System", "Synced 1,204 records across 3 accounts", 58],
  ["youtube-ganga-aarti", "permission_changed", "warning", "System", "YouTube removed the comment moderation permission", 71],
  ["linkedin-moksha-sewa", "reconnect_required", "warning", "System", "Access token expires in 3 days", 180],
  ["search-console-moksha-sewa", "sync_partial", "warning", "System", "Search performance skipped — permission not granted", 190],
  ["x-ganga-aarti", "reconnect_required", "failed", "System", "Access token expired and couldn't be refreshed", 1_460],
  ["meta-green-ghats", "reconnect_required", "failed", "System", "Page access was revoked in Facebook settings", 2_880],
  ["google-business-moksha-sewa", "mapping_changed", "info", "Manish Sirohi", "Mapped “Green Ghats — Haridwar Office” to Green Ghats", 4_320],
  ["ga4-ganga-aarti", "connected", "success", "Rohit Verma", "Connected Ganga Aarti — Web", 33 * 1440],
  ["linkedin-green-ghats", "disconnected", "info", "Anita Desai", "Disconnected Green Ghats LinkedIn page", 30 * 1440],
  ["meta-moksha-sewa", "primary_changed", "info", "Manish Sirohi", "Set “Moksha Sewa” as the primary Page", 40 * 1440],
  [null, "settings_updated", "info", "Manish Sirohi", "Turned on confirmation before disconnecting critical integrations", 12 * 1440],
];

export const mockActivity: IntegrationActivity[] = activitySeeds.map(([connectionId, event, result, actor, summary, minutesAgo], index) => {
  const connection = connectionId ? mockConnections.find((item) => item.id === connectionId) ?? null : null;
  return {
    id: `act-${index + 1}`,
    connectionId,
    providerId: connection?.providerId ?? null,
    clientId: connection?.clientId ?? null,
    event,
    result,
    actor,
    summary,
    at: iso(subMinutes(NOW, minutesAgo)),
    syncRunId: connection && event.startsWith("sync") ? `${connection.id}-run1` : null,
  };
});

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export const mockSettings: IntegrationSettings = {
  sync: {
    defaultFrequency: "hourly",
    retryFailed: true,
    retryAttempts: 3,
    manualSyncBehavior: "incremental",
    backgroundRefresh: true,
  },
  notifications: {
    connectionExpired: { inApp: true, email: true, slack: false },
    reconnectRequired: { inApp: true, email: true, slack: true },
    syncFailed: { inApp: true, email: false, slack: true },
    permissionMissing: { inApp: true, email: true, slack: false },
    rateLimit: { inApp: true, email: false, slack: false },
    accountRemoved: { inApp: true, email: true, slack: false },
  },
  clientMapping: {
    oneAccountPerClient: true,
    allowMultipleResources: true,
    primaryBehavior: "first_selected",
  },
  security: {
    orgAdminOnly: true,
    confirmCriticalDisconnect: true,
    requirePauseBeforeDisconnect: false,
  },
  dataHandling: {
    retentionDays: 90,
  },
};

/* ------------------------------------------------------------------ */
/* Account/property discovery for the connect flow                     */
/* ------------------------------------------------------------------ */

/**
 * What the provider would list after authorisation. Deterministic per
 * provider + client so the connect flow always offers the same choices.
 */
export function discoverResources(providerId: ProviderId, clientName: string): { type: ResourceType; name: string; handle: string }[] {
  const slug = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  switch (providerId) {
    case "meta":
      return [
        { type: "facebook_page", name: clientName, handle: `facebook.com/${slug}` },
        { type: "facebook_page", name: `${clientName} Volunteers`, handle: `facebook.com/${slug}volunteers` },
        { type: "instagram_account", name: `@${slug}`, handle: `instagram.com/${slug}` },
        { type: "ad_account", name: `${clientName} · Ads`, handle: "Ad account ending 8820" },
      ];
    case "linkedin":
      return [{ type: "linkedin_page", name: clientName, handle: `linkedin.com/company/${slug}` }];
    case "google-business":
      return [
        { type: "gbp_location", name: `${clientName} — Varanasi`, handle: "Dashashwamedh Ghat Road, Varanasi" },
        { type: "gbp_location", name: `${clientName} — Prayagraj`, handle: "Civil Lines, Prayagraj" },
      ];
    case "whatsapp":
      return [{ type: "whatsapp_number", name: `${clientName} Helpline`, handle: "+91 97xxx 55120" }];
    case "youtube":
      return [
        { type: "youtube_channel", name: clientName, handle: `youtube.com/@${slug}` },
        { type: "youtube_channel", name: `${clientName} Shorts`, handle: `youtube.com/@${slug}shorts` },
      ];
    case "x":
      return [{ type: "x_account", name: `@${slug}`, handle: `x.com/${slug}` }];
    case "search-console":
      return [
        { type: "search_console_property", name: `${slug}.org`, handle: `sc-domain:${slug}.org` },
        { type: "search_console_property", name: `blog.${slug}.org`, handle: `https://blog.${slug}.org/` },
      ];
    case "ga4":
      return [
        { type: "ga4_property", name: `${clientName} — Web`, handle: "Property 390-114-772" },
        { type: "ga4_property", name: `${clientName} — Donations app`, handle: "Property 390-114-905" },
      ];
    case "website-tracking":
      return [{ type: "website", name: `${slug}.org`, handle: `https://${slug}.org` }];
    case "smtp":
      return [
        { type: "smtp_sender", name: "noreply@namogange.org", handle: "smtp.namogange.org:587" },
        { type: "smtp_sender", name: "updates@namogange.org", handle: "smtp.namogange.org:587" },
      ];
    default:
      return [];
  }
}
