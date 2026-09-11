/* ── Platform ── */
export type Platform = "instagram" | "facebook" | "linkedin" | "google-business" | "whatsapp" | "youtube" | "website";

export type PlatformLabel = "Instagram" | "Facebook" | "LinkedIn" | "Google Business" | "WhatsApp" | "YouTube" | "Website";

/* ── Content Type ── */
export type ContentType = "image" | "video" | "reel" | "story" | "carousel" | "document" | "article";

/* ── Tab ── */
export type Tab = "Create" | "AI Assistant" | "Templates" | "Saved Drafts" | "Content Ideas" | "Approvals";

/* ── Placement ── */
export type Placement = string;

/* ── Media ── */
export type MediaRatio = "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1";

export type MediaAsset = {
  id: string;
  url: string;
  type: "image" | "video" | "document" | "gif";
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
  caption?: string;
  headline?: string;
  hashtags?: string[];
  cta?: string;
  link?: string;
  media?: MediaAsset[];
  ratio?: MediaRatio;
  firstComment?: string;
  scheduleTime?: string;
};

/* ── Platform Settings (per platform) ── */
export type InstagramSettings = {
  placement: "Feed" | "Reel" | "Story" | "Carousel";
  ratio: MediaRatio;
  location: string;
  tagPeople: string[];
  productTags: boolean;
  brandedContent: boolean;
  music: boolean;
  autoCaptions: boolean;
  altText: string;
};

export type FacebookSettings = {
  placement: "Feed" | "Reel" | "Story" | "Video";
  audience: string;
  cta: string;
  linkPreview: boolean;
  location: string;
};

export type LinkedInSettings = {
  postType: "Image Post" | "Video" | "Document / Carousel" | "Link Post";
  companyPage: string;
  headline: string;
  cta: string;
  audience: string;
  ratio: MediaRatio;
};

export type GoogleBusinessSettings = {
  postType: "Update" | "Offer" | "Event" | "Photo";
  title: string;
  cta: string;
  startDate: string;
  endDate: string;
  offerCode: string;
};

export type WhatsAppSettings = {
  messageType: "Template" | "Broadcast";
  templateName: string;
  language: string;
  headerType: string;
  variables: string[];
  footer: string;
  ctaButton: string;
  audienceSegment: string;
};

export type YouTubeSettings = {
  contentType: "Video" | "Short";
  title: string;
  description: string;
  tags: string[];
  playlist: string;
  visibility: "Public" | "Unlisted" | "Private";
  category: string;
  madeForKids: boolean;
};

export type WebsiteSettings = {
  contentType: "Blog" | "Announcement" | "Banner";
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  seoTitle: string;
  metaDescription: string;
  cta: string;
};

/* ── Schedule ── */
export type ScheduleOption = "now" | "later" | "draft";

/* ── Approval ── */
export type ApprovalStatus = "draft" | "pending" | "approved" | "changes-requested" | "rejected" | "scheduled" | "published";

/* ── UTM ── */
export type UTMConfig = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

/* ── Campaign / Client ── */
export type ClientRef = { id: string; name: string; logo: string };
export type CampaignRef = { id: string; name: string; objective: string };

/* ── Draft ── */
export type ContentDraft = {
  id: string;
  title: string;
  client: ClientRef;
  campaign: CampaignRef;
  contentType: ContentType;
  caption: string;
  headline: string;
  description: string;
  cta: string;
  link: string;
  hashtags: string[];
  firstComment: string;
  mentions: string[];
  location: string;
  notes: string;
  media: MediaAsset[];
  ratio: MediaRatio;
  channels: Platform[];
  placements?: Partial<Record<Platform, string>>;
  overrides?: Partial<Record<Platform, Partial<PlatformOverride>>>;
  schedule: ScheduleOption;
  scheduledAt?: string;
  status: ApprovalStatus;
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
  owner: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalStatus;
  image: string;
};
