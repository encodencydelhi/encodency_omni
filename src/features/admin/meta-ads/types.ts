export type EntityStatus =
  | "draft"
  | "in_review"
  | "scheduled"
  | "active"
  | "learning"
  | "paused"
  | "completed"
  | "rejected"
  | "error"
  | "archived";

export type Platform =
  | "facebook"
  | "instagram"
  | "messenger"
  | "audience_network";

export type Metrics = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
};

export type Campaign = {
  id: string;
  name: string;
  status: EntityStatus;
  objective: string;
  buyingType: string;
  budgetType: "Daily" | "Lifetime";
  budget: number;
  bidStrategy: string;
  specialCategory: string;
  optimization: string;
  platforms: Platform[];
  start: string;
  end: string | null;
  owner: string;
  created: string;
  lastEdited: string;
  lastEditedBy: string;
  spendCap: number;
  metrics: Metrics;
};

export type Placement = {
  placement: string;
  platform: Platform;
  enabled: boolean;
  spend: number;
  leads: number;
};

export type AdSet = {
  id: string;
  campaignId: string;
  name: string;
  status: EntityStatus;
  conversionLocation: string;
  performanceGoal: string;
  attribution: string;
  budgetSource: "Campaign budget" | "Ad set budget";
  budgetType: "Daily" | "Lifetime";
  budget: number;
  schedule: string;
  audienceName: string;
  audienceSize: [number, number];
  locations: string[];
  ageRange: string;
  gender: string;
  languages: string[];
  interests: string[];
  customAudiences: string[];
  lookalikes: string[];
  exclusions: string[];
  audienceExpansion: boolean;
  placements: Placement[];
  metrics: Metrics;
  lastEdited: string;
};

export type Ranking = "Above average" | "Average" | "Below average";

export type Ad = {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: EntityStatus;
  format: "Single Image" | "Video" | "Carousel" | "Existing Post";
  creativeId: string;
  formId: string | null;
  destination: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  page: string;
  instagramAccount: string;
  pixel: string;
  pixelEvents: string[];
  utm: string;
  qualityRanking: Ranking;
  engagementRanking: Ranking;
  conversionRanking: Ranking;
  reviewNote: string | null;
  metrics: Metrics;
  lastEdited: string;
};

export type InstantFormQuestion = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  views: number;
  completions: number;
};

export type InstantForm = {
  id: string;
  name: string;
  status: EntityStatus;
  type: "More volume" | "Higher intent" | "Rich creative";
  language: string;
  introHeadline: string;
  introBody: string;
  questions: InstantFormQuestion[];
  qualification: string[];
  privacyUrl: string | null;
  thankYouHeadline: string;
  thankYouCta: string;
  submissions: number;
  opens: number;
  qualified: number;
  lastUpdated: string;
};

export type LeadStage =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Meeting Scheduled"
  | "Converted"
  | "Lost"
  | "Spam";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  company: string;
  campaignId: string;
  adSetId: string;
  adId: string;
  formId: string;
  stage: LeadStage;
  score: number;
  owner: string;
  submittedAt: string;
  lastActivity: string;
  responseMinutes: number | null;
  answers: { question: string; answer: string }[];
  consent: string;
  timeline: { at: string; actor: string; type: string; text: string }[];
  notes: { at: string; author: string; text: string }[];
  tasks: { title: string; due: string; done: boolean; owner: string }[];
  appointments: { title: string; at: string; with: string }[];
  documents: { name: string; size: string; at: string }[];
};

export type Audience = {
  id: string;
  name: string;
  kind: "saved" | "custom" | "lookalike";
  source: string;
  size: number;
  matchRate: number | null;
  similarity: number | null;
  country: string | null;
  sourceAudience: string | null;
  locations: string;
  ageRange: string;
  gender: string;
  interests: string[];
  usedIn: string[];
  status: "Ready" | "Updating" | "Sync failed" | "Too small";
  lastSync: string;
};

export type Creative = {
  id: string;
  name: string;
  type: "Image" | "Video" | "Carousel";
  ratio: string;
  dimensions: string;
  fileSize: string;
  src: string;
  usedInAds: string[];
  performance: "Top performer" | "Healthy" | "Underperforming" | "Not used";
  uploaded: string;
  metrics: Metrics;
};

export type Issue = {
  id: string;
  severity: "blocking" | "warning" | "connection" | "policy";
  title: string;
  detail: string;
  entityLabel: string;
  entityHref: string;
  campaign: string | null;
  detected: string;
  resolved: boolean;
  actionLabel: string;
  actionHref: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  user: string;
  action: string;
  entityType:
  | "Campaign"
  | "Ad Set"
  | "Ad"
  | "Instant Form"
  | "Audience"
  | "Account";
  entityLabel: string;
  entityHref: string;
  campaign: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: "Ads Manager" | "Automation" | "API";
};

export type ConnectedAsset = {
  id: string;
  group:
  | "Ad Account"
  | "Facebook Page"
  | "Instagram Business"
  | "Pixel / Data Source";
  name: string;
  handle: string;
  assetId: string;
  connectedOn: string;
  permissions: string[];
  missingPermissions: string[];
  lastSync: string;
  status:
  | "Connected"
  | "Syncing"
  | "Needs Reauthorization"
  | "Permission Missing"
  | "Sync Failed"
  | "Disconnected";
};
