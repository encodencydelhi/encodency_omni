import type {
  AttributeGroup,
  CtaType,
  GbpPermission,
  IssueSeverity,
  MediaCategory,
  PerformanceMetric,
  PostState,
  PostType,
  VerificationState,
  WorkspaceRole,
} from "../types";

export const GB_ROOT = "/admin/google-business";

export const gbRoutes = {
  overview: GB_ROOT,
  locations: `${GB_ROOT}/locations`,
  location: (id: string) => `${GB_ROOT}/locations/${id}`,
  reviews: `${GB_ROOT}/reviews`,
  posts: `${GB_ROOT}/posts`,
  postCreate: `${GB_ROOT}/posts/create`,
  media: `${GB_ROOT}/media`,
  performance: `${GB_ROOT}/performance`,
  profile: `${GB_ROOT}/profile`,
  settings: `${GB_ROOT}/settings`,
  businessProfileManager: "https://business.google.com/locations",
  mapsSearch: (placeId: string) => `https://www.google.com/maps/place/?q=place_id:${placeId}`,
} as const;

/**
 * Mock mode: data comes from `data/mock-provider.ts` and mutations resolve
 * locally. With it off the repository has no live provider yet, so the
 * workspace shows the "Google Business API not connected" state instead of
 * fabricated data.
 */
export const GBP_MOCK_MODE = true;

/* ------------------------------------------------------------------ */
/* Periods                                                             */
/* ------------------------------------------------------------------ */

export type Period = "7d" | "30d" | "90d";

export const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

/** Metric groups the UI charts, using Google terminology. */
export type MetricKey = "searchImpressions" | "mapsImpressions" | "callClicks" | "websiteClicks" | "directionRequests" | "bookings";

export const METRICS: Record<MetricKey, { label: string; short: string; color: string; sources: PerformanceMetric[]; help: string }> = {
  searchImpressions: {
    label: "Search impressions",
    short: "Search",
    color: "#1A73E8",
    sources: ["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"],
    help: "Times the profile was shown in Google Search, on desktop and mobile.",
  },
  mapsImpressions: {
    label: "Maps impressions",
    short: "Maps",
    color: "#188038",
    sources: ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS"],
    help: "Times the profile was shown in Google Maps, on desktop and mobile.",
  },
  callClicks: { label: "Calls", short: "Calls", color: "#E8710A", sources: ["CALL_CLICKS"], help: "Clicks on the call button." },
  websiteClicks: { label: "Website clicks", short: "Website", color: "#9334E6", sources: ["WEBSITE_CLICKS"], help: "Clicks through to your website." },
  directionRequests: { label: "Direction requests", short: "Directions", color: "#12B5CB", sources: ["BUSINESS_DIRECTION_REQUESTS"], help: "Requests for directions to the location." },
  bookings: { label: "Bookings", short: "Bookings", color: "#D93025", sources: ["BUSINESS_BOOKINGS"], help: "Bookings made through Google. Only reported for businesses with a booking provider." },
};

export const METRIC_ORDER: MetricKey[] = ["searchImpressions", "mapsImpressions", "callClicks", "websiteClicks", "directionRequests", "bookings"];

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const VERIFICATION_LABEL: Record<VerificationState, string> = {
  verified: "Verified",
  pending: "Verification pending",
  unverified: "Not verified",
  suspended: "Suspended",
  duplicate: "Duplicate",
};

export const POST_TYPE_LABEL: Record<PostType, string> = {
  update: "Update",
  event: "Event",
  offer: "Offer",
  cta: "Call to action",
};

export const POST_STATE_LABEL: Record<PostState, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  rejected: "Rejected",
};

export const CTA_LABEL: Record<CtaType, string> = {
  BOOK: "Book",
  ORDER: "Order online",
  SHOP: "Buy",
  LEARN_MORE: "Learn more",
  SIGN_UP: "Sign up",
  CALL: "Call now",
};

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, string> = {
  LOGO: "Logo",
  COVER: "Cover",
  EXTERIOR: "Exterior",
  INTERIOR: "Interior",
  TEAM: "Team",
  AT_WORK: "At work",
  ADDITIONAL: "Other",
  VIDEO: "Video",
};

export const MEDIA_CATEGORIES = Object.keys(MEDIA_CATEGORY_LABEL) as MediaCategory[];

export const ATTRIBUTE_GROUP_LABEL: Record<AttributeGroup, string> = {
  accessibility: "Accessibility",
  amenities: "Amenities",
  payments: "Payments",
  service_options: "Service options",
  business_features: "Business features",
};

export const ATTRIBUTE_GROUPS = Object.keys(ATTRIBUTE_GROUP_LABEL) as AttributeGroup[];

export const SEVERITY_LABEL: Record<IssueSeverity, string> = { high: "High", medium: "Medium", low: "Low" };

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Owner",
  manager: "Location Manager",
  editor: "Editor",
  contributor: "Contributor",
  analyst: "Analyst",
};

export const PERMISSION_LABEL: Record<GbpPermission, string> = {
  view_google_business: "View Google Business",
  view_performance: "View performance",
  edit_profile: "Edit business profile",
  manage_locations: "Manage locations",
  reply_reviews: "Reply to reviews",
  delete_review_reply: "Delete review replies",
  create_posts: "Create posts",
  publish_posts: "Publish posts",
  approve_content: "Approve content",
  upload_media: "Upload media",
  delete_media: "Delete media",
  manage_connection: "Manage connection",
  manage_settings: "Manage settings",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABEL) as GbpPermission[];

export const SCOPE_INFO: Record<string, { label: string; description: string }> = {
  "business.manage": {
    label: "Manage Business Profile",
    description: "Read and manage locations, reviews, posts, media and performance for the connected account.",
  },
  "plus.business.manage": {
    label: "Legacy profile access",
    description: "Older scope some accounts still require for location listings.",
  },
};

export const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const TIMEZONES = ["Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "Asia/Dubai", "Asia/Singapore"];

/** Google limits for the fields this module edits. */
export const LIMITS = {
  postSummary: 1500,
  postTitle: 58,
  description: 750,
  locationTitle: 100,
  offerTerms: 900,
  mediaBytes: 5 * 1024 * 1024,
  /** Google recommends at least 250px on the shortest side. */
  mediaMinPx: 250,
};
