/* ── Platform ── */
export type Platform =
  | "instagram" | "facebook" | "linkedin" | "youtube" | "tiktok"
  | "x" | "pinterest" | "threads" | "whatsapp"
  | "google-business" | "website" | "email";

export type PlatformLabel =
  | "Instagram" | "Facebook" | "LinkedIn" | "YouTube" | "TikTok"
  | "X" | "Pinterest" | "Threads" | "WhatsApp"
  | "Google Business" | "Website" | "Email";

/* ── Content Type ── */
export type ContentType =
  | "feed-post" | "carousel" | "reel" | "story" | "video" | "short"
  | "image-post" | "video-post" | "document" | "poll" | "link-post" | "article"
  | "text-post" | "gif" | "thread"
  | "pin" | "video-pin"
  | "broadcast" | "template-message" | "status" | "media-message"
  | "whats-new" | "offer" | "event"
  | "hero-banner" | "promo-banner" | "blog" | "popup" | "landing-page"
  | "email-campaign" | "newsletter" | "promo-email"
  | "image" | "upload";

/* ── Tab ── */
export type Tab = "Create" | "AI Assistant" | "Templates" | "Saved Drafts" | "Content Ideas" | "Approvals";

/* ── Placement ── */
export type Placement = string;

/* ── Media ── */
export type MediaRatio = "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1" | "2:3" | "custom";

export type MediaAsset = {
  id: string;
  url: string;
  type: "image" | "video" | "document" | "gif" | "audio";
  name: string;
  width?: number;
  height?: number;
  size?: string;
  duration?: string;
  alt?: string;
};

/* ── Connection ── */
export type ConnectionStatus = "connected" | "disconnected" | "pending";

/* ── Platform Override ── */
export type PlatformOverride = {
  enabled: boolean;
  contentType?: ContentType;
  caption?: string;
  headline?: string;
  description?: string;
  hashtags?: string[];
  cta?: string;
  ctaUrl?: string;
  link?: string;
  media?: MediaAsset[];
  ratio?: MediaRatio;
  customWidth?: number;
  customHeight?: number;
  firstComment?: string;
  altText?: string;
  location?: string;
  mentions?: string[];
  scheduleTime?: string;
  scheduleDate?: string;
  /* Platform-specific fields stored as record */
  fields?: Record<string, unknown>;
};

/* ── Platform Settings (per platform) ── */
export type InstagramSettings = {
  placement: "Feed Post" | "Reel" | "Story" | "Carousel";
  ratio: MediaRatio;
  location: string;
  tagPeople: string[];
  productTags: string[];
  collaborator: string;
  music: string;
  autoCaptions: string;
  altText: string;
};

export type FacebookSettings = {
  placement: "Feed" | "Story" | "Reel" | "Right Column";
  audience: string;
  cta: string;
  ctaUrl: string;
  linkPreview: boolean;
  location: string;
  tags: string[];
  altText: string;
};

export type LinkedInSettings = {
  postType: "Image Post" | "Video Post" | "Carousel" | "Document/PDF" | "Poll" | "Link Post" | "Article";
  companyPage: string;
  headline: string;
  cta: string;
  audience: string;
  mentions: string[];
  documentUrl: string;
};

export type YouTubeSettings = {
  contentType: "Video" | "Short";
  title: string;
  description: string;
  tags: string[];
  playlist: string;
  visibility: "Public" | "Unlisted" | "Private";
  audience: string;
  category: string;
  thumbnail: string;
  subtitles: string;
  language: string;
  madeForKids: boolean;
};

export type TikTokSettings = {
  title: string;
  description: string;
  hashtags: string[];
  sound: string;
  visibility: "Public" | "Friends" | "Private";
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
};

export type XSettings = {
  postType: "Text" | "Image" | "Video" | "GIF" | "Poll" | "Thread";
  audience: "Everyone" | "Verified Only" | "Circle";
  replySettings: "Everyone" | "Following" | "Verified";
  pollOptions: string[];
  pollDuration: string;
  location: string;
};

export type PinterestSettings = {
  pinType: "Pin" | "Video Pin" | "Carousel";
  board: string;
  section: string;
  link: string;
  altText: string;
  category: string;
};

export type ThreadsSettings = {
  audience: "Public" | "Followers Only";
  replySettings: "Everyone" | "Following" | "Mentioned";
};

export type WhatsAppSettings = {
  messageType: "Broadcast" | "Template Message" | "Status" | "Media Message";
  templateName: string;
  language: string;
  headerType: string;
  headerMedia: string;
  bodyText: string;
  variables: string[];
  footer: string;
  ctaButtons: string[];
  audienceSegment: string;
};

export type GoogleBusinessSettings = {
  postType: "What's New" | "Offer" | "Event";
  title: string;
  description: string;
  cta: string;
  ctaUrl: string;
  startDate: string;
  endDate: string;
  offerCode: string;
  couponCode: string;
  terms: string;
};

export type WebsiteSettings = {
  contentType: "Hero Banner" | "Promotional Banner" | "Blog/Article" | "Popup" | "Landing Page Content";
  headline: string;
  subheadline: string;
  body: string;
  cta: string;
  buttonLabel: string;
  destinationUrl: string;
  seoTitle: string;
  metaDescription: string;
  ogImage: string;
};

export type EmailSettings = {
  contentType: "Email Campaign" | "Newsletter" | "Promotional Email";
  subject: string;
  previewText: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  template: string;
  audienceSegment: string;
};

/* ── Schedule ── */
export type ScheduleOption = "now" | "later" | "draft" | "queue" | "best-time";

export type PlatformSchedule = {
  platform: Platform;
  schedule: ScheduleOption;
  date?: string;
  time?: string;
};

/* ── Approval ── */
export type ApprovalStatus = "draft" | "pending" | "internal-review" | "client-review" | "approved" | "changes-requested" | "rejected" | "scheduled" | "published";

/* ── UTM ── */
export type UTMConfig = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

/* ── Campaign / Client ── */
export type ClientRef = { id: string; name: string; logo?: string | import("@/features/admin/projects/live/clients-api").SafeAsset | null };
export type CampaignRef = { id: string; name: string; objective: string } | null;

/* ── Content Variant ── */
export type ContentVariant = {
  id: string;
  label: string;
  caption: string;
  headline: string;
  description: string;
  hashtags: string[];
  cta: string;
  assignedPlatforms: Platform[];
};

/* ── Validation ── */
export type ValidationLevel = "ready" | "warning" | "error";

export type ValidationItem = {
  field: string;
  level: ValidationLevel;
  message: string;
};

export type PlatformValidation = {
  platform: Platform;
  level: ValidationLevel;
  items: ValidationItem[];
};

/* ── Master Content ── */
export type MasterContent = {
  caption: string;
  headline: string;
  description: string;
  cta: string;
  ctaUrl: string;
  hashtags: string[];
  mentions: string[];
  media: MediaAsset[];
  link: string;
  location: string;
  altText: string;
  firstComment: string;
  language: string;
  tone: string;
};

/* ── Auto Adapt Options ── */
export type AutoAdaptOptions = {
  autoResize: boolean;
  smartCrop: boolean;
  preserveSubject: boolean;
  preserveLogo: boolean;
  preserveText: boolean;
  preserveFaces: boolean;
  respectSafeZones: boolean;
};

/* ── Custom Ratio Preset ── */
export type CustomRatioPreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
};

/* ── Draft ── */
export type ContentDraft = {
  id: string;
  title: string;
  client: ClientRef;
  campaign?: CampaignRef;
  isStandalone?: boolean;
  masterContent: MasterContent;
  channels: Platform[];
  platformOverrides: Partial<Record<Platform, PlatformOverride>>;
  platformSchedules: PlatformSchedule[];
  ratios: Partial<Record<Platform, MediaRatio>>;
  customRatios: Partial<Record<Platform, { width: number; height: number }>>;
  autoAdapt: AutoAdaptOptions;
  variants: ContentVariant[];
  utm: UTMConfig;
  platformUtms: Partial<Record<Platform, UTMConfig>>;
  approvalStatus: ApprovalStatus;
  approver: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

/* ── Template ── */
export type Template = {
  id: string;
  title: string;
  category: string;
  image: string;
  platform: Platform;
  ratio: MediaRatio;
  isPro: boolean;
};

/* ── Idea ── */
export type ContentIdea = {
  id: string;
  title: string;
  description: string;
  image: string;
  tag: string;
  channels: Platform[];
  contentType: ContentType;
  suggestedCTA: string;
};

/* ── Approval Entry ── */
export type ApprovalEntry = {
  id: string;
  title: string;
  channel: Platform;
  client: string;
  campaign?: string | null;
  owner: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalStatus;
  image: string;
};

/* ── Platform Ratio Spec ── */
export type RatioSpec = {
  ratio: MediaRatio;
  label: string;
  resolution: string;
  recommended?: boolean;
};

/* ── Platform Content Type Spec ── */
export type PlatformContentTypeSpec = {
  id: ContentType;
  label: string;
  icon: string;
  ratioOptions: RatioSpec[];
  defaultRatio: MediaRatio;
  placements: string[];
  fields: string[];
};
