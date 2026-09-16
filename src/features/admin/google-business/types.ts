// Data contracts for the Google Business workspace.
//
// Field names follow the Google Business Profile API resources they map to
// (locations, reviews, localPosts, media, performance) so the backend mapper
// stays thin. Anything marked "internal" is owned by OmniPlatform and has no
// Google equivalent - the UI labels those explicitly.

export type ISODate = string;

/** `null` means "not available" (not synced, no permission, not reported) - never render it as 0. */
export type Maybe<T> = T | null;

/* ------------------------------------------------------------------ */
/* Account & locations                                                 */
/* ------------------------------------------------------------------ */

export interface BusinessAccount {
  /** accounts/{accountId} */
  name: string;
  accountId: string;
  accountName: string;
  googleAccount: string;
  type: "PERSONAL" | "LOCATION_GROUP" | "ORGANIZATION";
  verificationState: "VERIFIED" | "UNVERIFIED" | "VERIFICATION_REQUESTED";
}

export type VerificationState = "verified" | "pending" | "unverified" | "suspended" | "duplicate";

export type OpenState = "open" | "closed_temporarily" | "closed_permanently";

export type SyncState = "synced" | "syncing" | "failed" | "never";

export interface Address {
  addressLines: string[];
  locality: string;
  administrativeArea: string;
  postalCode: string;
  regionCode: string;
}

export interface TimePeriod {
  /** 0 = Monday ... 6 = Sunday, matching the UI order used across the module. */
  day: number;
  open: string;
  close: string;
}

export interface RegularHours {
  /** Several periods per day support split hours (e.g. 09:00-13:00, 17:00-21:00). */
  periods: TimePeriod[];
  /** Days listed here are open 24 hours. Days with no period and not listed are closed. */
  open24: number[];
}

export interface SpecialHour {
  id: string;
  date: ISODate;
  label: string;
  closed: boolean;
  open?: string;
  close?: string;
}

export interface ServiceArea {
  businessType: "CUSTOMER_LOCATION_ONLY" | "CUSTOMER_AND_BUSINESS_LOCATION";
  places: string[];
  radiusKm: Maybe<number>;
}

/** Attribute values come from the API per category; the UI never hardcodes the list. */
export type AttributeValue = boolean | string | string[];

export type AttributeGroup = "accessibility" | "amenities" | "payments" | "service_options" | "business_features";

export interface AttributeDefinition {
  /** attributes/{attributeId} */
  attributeId: string;
  displayName: string;
  group: AttributeGroup;
  valueType: "BOOL" | "ENUM" | "REPEATED_ENUM";
  /** Options for ENUM / REPEATED_ENUM attributes. */
  options?: { value: string; displayName: string }[];
  /** Categories this attribute applies to; empty means "any". */
  categoryIds?: string[];
  /** Google marks some attributes as not editable through the API. */
  readOnly?: boolean;
}

export interface Category {
  categoryId: string;
  displayName: string;
  /** Services are only offered for some categories - the UI hides the section otherwise. */
  supportsServices?: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
}

export interface LocationProfile {
  title: string;
  description: string;
  primaryCategoryId: string;
  additionalCategoryIds: string[];
  phone: string;
  additionalPhones: string[];
  website: string;
  address: Address;
  serviceArea: Maybe<ServiceArea>;
  regularHours: RegularHours;
  specialHours: SpecialHour[];
  attributes: Record<string, AttributeValue>;
  services: Service[];
  openingDate: Maybe<ISODate>;
}

export interface Location {
  /** locations/{locationId} */
  name: string;
  locationId: string;
  storeCode: string;
  placeId: string;
  mapsUri: string;
  newReviewUri: string;
  profile: LocationProfile;
  verification: VerificationState;
  openState: OpenState;
  /** Google-reported aggregates. */
  rating: Maybe<number>;
  reviewCount: number;
  photoCount: number;
  sync: { state: SyncState; lastSyncedAt: Maybe<ISODate>; error?: string };
  /** Internal OmniPlatform labels used for filtering and bulk actions. */
  labels: string[];
  /** Whether this workspace manages the location (Settings can turn it off). */
  managed: boolean;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface ReviewReply {
  comment: string;
  updateTime: ISODate;
  /** Internal: which OmniPlatform user posted it. */
  author: string;
}

export interface Review {
  /** accounts/{a}/locations/{l}/reviews/{r} */
  name: string;
  reviewId: string;
  locationId: string;
  reviewer: { displayName: string; profilePhotoUrl: Maybe<string>; isAnonymous: boolean };
  starRating: StarRating;
  comment: string;
  createTime: ISODate;
  updateTime: ISODate;
  reply: Maybe<ReviewReply>;
  /** Google flags reviews reported for policy violations. */
  policyStatus: Maybe<"under_review" | "removed" | "reinstated">;
  /** Photos attached by the reviewer. */
  media: string[];
}

/* ------------------------------------------------------------------ */
/* Posts (localPosts)                                                  */
/* ------------------------------------------------------------------ */

export type PostType = "update" | "event" | "offer" | "cta";

/** Google callToAction actionTypes. */
export type CtaType = "BOOK" | "ORDER" | "SHOP" | "LEARN_MORE" | "SIGN_UP" | "CALL";

/** Google-side lifecycle (LocalPost.state) plus the OmniPlatform workflow states. */
export type PostState =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "rejected";

export type ApprovalAction = "submitted" | "approved" | "changes_requested" | "rejected";

export interface ApprovalEvent {
  id: string;
  action: ApprovalAction;
  actor: string;
  note?: string;
  at: ISODate;
}

export interface Post {
  id: string;
  /** A post can be published to several locations at once. */
  locationIds: string[];
  type: PostType;
  summary: string;
  media: string[];
  cta: Maybe<{ actionType: CtaType; url: string }>;
  event: Maybe<{ title: string; startDate: ISODate; endDate: ISODate }>;
  offer: Maybe<{ couponCode: string; redeemOnlineUrl: string; termsConditions: string }>;
  state: PostState;
  /** OmniPlatform scheduling - the Google API itself publishes immediately. */
  scheduledAt: Maybe<ISODate>;
  publishedAt: Maybe<ISODate>;
  createdAt: ISODate;
  createdBy: string;
  searchUrl: Maybe<string>;
  /** Google reports views/clicks for published posts only. */
  metrics: Maybe<{ views: number; clicks: number }>;
  approvals: ApprovalEvent[];
  failureReason?: string;
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export type MediaCategory = "LOGO" | "COVER" | "EXTERIOR" | "INTERIOR" | "TEAM" | "AT_WORK" | "ADDITIONAL" | "VIDEO";

export interface MediaItem {
  /** accounts/{a}/locations/{l}/media/{m} */
  name: string;
  mediaId: string;
  locationId: string;
  category: MediaCategory;
  format: "PHOTO" | "VIDEO";
  sourceUrl: string;
  thumbnailUrl: string;
  createTime: ISODate;
  /** Google reports view counts on media for some accounts. */
  viewCount: Maybe<number>;
  dimensions: Maybe<{ widthPx: number; heightPx: number }>;
  sizeBytes: Maybe<number>;
  state: "processing" | "live" | "rejected";
  /** Internal: who uploaded it through OmniPlatform. */
  uploadedBy: Maybe<string>;
  rejectionReason?: string;
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

/** Matches the DailyMetric enum of the Business Profile Performance API. */
export type PerformanceMetric =
  | "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"
  | "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"
  | "BUSINESS_IMPRESSIONS_DESKTOP_MAPS"
  | "BUSINESS_IMPRESSIONS_MOBILE_MAPS"
  | "CALL_CLICKS"
  | "WEBSITE_CLICKS"
  | "BUSINESS_DIRECTION_REQUESTS"
  | "BUSINESS_BOOKINGS";

export interface DailyMetricPoint {
  date: ISODate;
  values: Record<PerformanceMetric, number>;
}

export interface LocationPerformance {
  locationId: string;
  series: DailyMetricPoint[];
}

/** searchkeywords.impressions.monthly - Google returns a bucket, not an exact count, for low volumes. */
export interface SearchKeyword {
  query: string;
  locationId: string;
  impressions: number;
  /** True when Google returned a threshold bucket ("20 or fewer"). */
  isThreshold: boolean;
  previousImpressions: Maybe<number>;
}

/* ------------------------------------------------------------------ */
/* Connection, capabilities & permissions                              */
/* ------------------------------------------------------------------ */

export type ConnectionState =
  | "connected"
  | "syncing"
  | "sync_failed"
  | "token_expired"
  | "quota_exceeded"
  | "disconnected";

export interface ConnectionInfo {
  state: ConnectionState;
  lastSyncedAt: Maybe<ISODate>;
  nextSyncAt: Maybe<ISODate>;
  autoSync: boolean;
  syncFrequency: "hourly" | "6h" | "12h" | "daily";
  quotaUsed: number;
  quotaLimit: number;
}

/** OAuth scopes the backend reports as granted. */
export type GbpScope = "business.manage" | "plus.business.manage";

export type GbpPermission =
  | "view_google_business"
  | "view_performance"
  | "edit_profile"
  | "manage_locations"
  | "reply_reviews"
  | "delete_review_reply"
  | "create_posts"
  | "publish_posts"
  | "approve_content"
  | "upload_media"
  | "delete_media"
  | "manage_connection"
  | "manage_settings";

export type WorkspaceRole = "owner" | "manager" | "editor" | "contributor" | "analyst";

export type CapabilityKey =
  | "canReadLocations"
  | "canManageLocations"
  | "canEditProfile"
  | "canReadReviews"
  | "canReplyReviews"
  | "canDeleteReviewReply"
  | "canCreatePosts"
  | "canPublishPosts"
  | "canApproveContent"
  | "canManageMedia"
  | "canDeleteMedia"
  | "canViewPerformance"
  | "canSyncLocations"
  | "canManageConnection"
  | "canManageSettings";

export interface Capability {
  allowed: boolean;
  /** Human, actionable reason shown wherever the action is disabled. */
  reason?: string;
  fix?: "reconnect" | "request_access" | "verify_location" | "wait" | "connect";
}

export type CapabilityMap = Record<CapabilityKey, Capability>;

/* ------------------------------------------------------------------ */
/* Internal: activity, notifications, settings                         */
/* ------------------------------------------------------------------ */

export type ActivityAction =
  | "profile_edit"
  | "hours_change"
  | "special_hours_change"
  | "category_change"
  | "attribute_change"
  | "review_reply"
  | "reply_edit"
  | "reply_delete"
  | "post_create"
  | "post_schedule"
  | "post_publish"
  | "post_delete"
  | "media_upload"
  | "media_delete"
  | "location_sync"
  | "permission_change"
  | "connection_change"
  | "approval";

export interface ActivityEvent {
  id: string;
  actor: string;
  action: ActivityAction;
  summary: string;
  entity: { type: "location" | "review" | "post" | "media" | "account" | "settings"; id?: string; label: string };
  locationId: Maybe<string>;
  previous?: string;
  next?: string;
  source: "OmniPlatform" | "Google sync";
  at: ISODate;
}

export type NotificationKind =
  | "new_review"
  | "low_rating_review"
  | "reply_needed"
  | "location_update"
  | "sync_failure"
  | "verification_change"
  | "permission_expired"
  | "duplicate_location"
  | "post_published"
  | "post_failed"
  | "approval_requested";

export interface WorkspaceNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  at: ISODate;
  read: boolean;
}

export type NotificationSetting =
  | "newReview"
  | "lowRatingReview"
  | "replyNeeded"
  | "locationUpdate"
  | "syncFailure"
  | "verificationChange"
  | "permissionExpired"
  | "duplicateLocation";

export interface WorkspaceSettings {
  notifications: Record<NotificationSetting, { inApp: boolean; email: boolean }>;
  defaults: {
    postCta: CtaType;
    postLocationScope: "all" | "selected";
    replySignature: string;
    requireApproval: boolean;
    timezone: string;
  };
  rolePermissions: Record<WorkspaceRole, GbpPermission[]>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  initials: string;
}

/* ------------------------------------------------------------------ */
/* Internal: profile health & needs attention                          */
/* ------------------------------------------------------------------ */

export type IssueSeverity = "high" | "medium" | "low";

export type IssueKind =
  | "unanswered_reviews"
  | "incomplete_hours"
  | "missing_attributes"
  | "outdated_media"
  | "verification_required"
  | "sync_failed"
  | "duplicate_location"
  | "missing_description"
  | "missing_website"
  | "low_rating";

export interface AttentionIssue {
  id: string;
  kind: IssueKind;
  severity: IssueSeverity;
  locationId: Maybe<string>;
  title: string;
  description: string;
  /** Deep link to the screen that fixes it. */
  actionLabel: string;
  href: string;
  count?: number;
}

export interface HealthFactor {
  key: string;
  label: string;
  score: number;
  status: "good" | "warning" | "critical";
  explanation: string;
  actionLabel: Maybe<string>;
  href: Maybe<string>;
}

export interface ProfileHealth {
  score: number;
  factors: HealthFactor[];
}

/* ------------------------------------------------------------------ */
/* Repository payloads                                                 */
/* ------------------------------------------------------------------ */

export interface GbpSnapshot {
  account: BusinessAccount;
  connection: ConnectionInfo;
  scopes: GbpScope[];
  locations: Location[];
  reviews: Review[];
  posts: Post[];
  media: MediaItem[];
  performance: LocationPerformance[];
  searchKeywords: SearchKeyword[];
  categories: Category[];
  attributeDefinitions: AttributeDefinition[];
  settings: WorkspaceSettings;
  team: TeamMember[];
  activity: ActivityEvent[];
  notifications: WorkspaceNotification[];
}
