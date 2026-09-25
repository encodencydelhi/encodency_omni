import { DEFAULT_PLACEMENTS } from "./placements";

export interface CampaignDraft {
  // 1 — Basic Details
  name: string;
  campaignId: string;
  campaignMode: string;
  objective: string;
  category: string;
  type: string;
  client: string;
  owner: string;
  contributors: string[];
  approvers: string[];
  priority: string;
  description: string;
  internalNotes: string;
  tags: string[];

  // 2 — Goals & Budget
  primaryObjective: string;
  targetReach: string;
  targetImpressions: string;
  targetClicks: string;
  targetEngagements: string;
  targetLeads: string;
  targetConversions: string;
  targetRevenue: string;
  targetRoas: string;
  budgetType: string;
  totalBudget: string;
  dailyBudget: string;
  monthlyBudget: string;
  startDate: string;
  endDate: string;
  campaignDuration: string;
  bidStrategy: string;
  optimizationEvent: string;
  costCap: string;
  targetCpa: string;
  targetCpl: string;
  frequencyCap: string;
  dayparting: boolean;
  daypartingSchedule: string;
  distribution: { channel: string; percent: number }[];
  contingency: string;

  // 3 — Channels & Placements
  channels: string[];
  connectedAccounts: Record<string, string[]>;
  placements: string[];
  publishingPreference: string;
  crossChannelSync: boolean;
  contentCustomization: boolean;

  // 4 — Audience
  audienceType: string;
  savedAudience: string;
  ageRange: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  languages: string[];
  education: string;
  jobTitle: string;
  industry: string;
  companySize: string;
  regions: string[];
  radiusTargeting: string;
  excludedRegions: string[];
  interests: string[];
  topics: string[];
  behaviors: string[];
  segments: string[];
  excluded: string[];
  devicePreference: string;
  lookalike: boolean;
  lookalikePercent: string;
  retargeting: boolean;
  retargetingSources: string[];
  createExclusions: boolean;
  audienceExpansion: boolean;

  // 5 — Content & Schedule
  title: string;
  headline: string;
  masterCaption: string;
  description2: string;
  cta: string;
  activePlatform: string;
  publishDate: string;
  publishTime: string;
  timezone: string;
  recurrence: string;
  hashtags: string[];
  mentions: string[];
  firstComment: string;
  contentStatus: string;
  mediaAssets: { name: string; src: string; type: string }[];
  platformSchedules: Record<string, { date: string; time: string }>;

  // 6 — Tracking & Conversions
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  addUtm: boolean;
  trackingIntegrations: Record<string, boolean>;
  conversionEvents: string[];
  landingPageUrl: string;

  // 7 — Automation & Experiments
  automationRules: AutomationRule[];
  abTests: ABTest[];

  // 8 — Review & Launch
  reviewedContent: boolean;
  budgetApproved: boolean;
  readyToPublish: boolean;
  launchMode: string;
  notifyOwner: boolean;
  notifyClientTeam: boolean;
  notifyMarketing: boolean;
  notifyEmail: boolean;
  approvalState: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: string;
  conditionValue: string;
  action: string;
  actionValue: string;
}

export interface ABTest {
  id: string;
  name: string;
  enabled: boolean;
  variable: string;
  variantA: string;
  variantB: string;
  trafficSplit: number;
}

export const initialCampaign: CampaignDraft = {
  name: "Save Rivers, Save Lives 2025",
  campaignId: "CMP-2025-0042",
  campaignMode: "Unified",
  objective: "Brand Awareness",
  category: "Awareness",
  type: "Awareness",
  client: "Moksha Sewa",
  owner: "Manish Sirohi",
  contributors: ["Priya Kapoor", "Amit Reddy"],
  approvers: ["Rajesh Kumar", "Neha Gupta"],
  priority: "High",
  description:
    "A nationwide awareness campaign to promote river conservation, inspire community action and drive support for cleaner, healthier rivers across India.",
  internalNotes:
    "Focus on authentic storytelling, real beneficiary stories and before-after visuals. Coordinate with state partners for regional content. Target World Water Day for major launch.",
  tags: ["Environment", "Awareness", "Social", "CSR"],

  primaryObjective: "awareness",
  targetReach: "120,000",
  targetImpressions: "350,000",
  targetClicks: "6,000",
  targetEngagements: "25,000",
  targetLeads: "500",
  targetConversions: "150",
  targetRevenue: "5,00,000",
  targetRoas: "2.5",
  budgetType: "Lifetime",
  totalBudget: "50,000",
  dailyBudget: "1,667",
  monthlyBudget: "",
  startDate: "2025-03-15",
  endDate: "2025-04-30",
  campaignDuration: "47 days",
  bidStrategy: "Lowest Cost",
  optimizationEvent: "Link Clicks",
  costCap: "",
  targetCpa: "100",
  targetCpl: "100",
  frequencyCap: "3",
  dayparting: false,
  daypartingSchedule: "",
  distribution: [
    { channel: "Meta & Instagram", percent: 30 },
    { channel: "LinkedIn", percent: 15 },
    { channel: "YouTube", percent: 15 },
    { channel: "Google", percent: 10 },
    { channel: "WhatsApp", percent: 10 },
    { channel: "Website", percent: 10 },
    { channel: "Google Business", percent: 10 },
  ],
  contingency: "5,000",

  channels: ["Meta & Instagram", "LinkedIn", "Google Business", "WhatsApp", "YouTube", "Website"],
  connectedAccounts: {
    Instagram: ["@mokshasewa"],
    Facebook: ["Moksha Sewa Official"],
    LinkedIn: ["Moksha Sewa Foundation"],
    YouTube: ["Moksha Sewa"],
    WhatsApp: ["+91 98765 43210"],
    Website: ["mokshasewa.org"],
  },
  placements: [...DEFAULT_PLACEMENTS],
  publishingPreference: "Publish natively on each platform",
  crossChannelSync: true,
  contentCustomization: false,

  audienceType: "Custom Audience",
  savedAudience: "",
  ageRange: "18 - 45",
  ageMin: "18",
  ageMax: "45",
  gender: "All",
  languages: ["Hindi", "English"],
  education: "All",
  jobTitle: "",
  industry: "",
  companySize: "",
  regions: ["All India", "Delhi NCR", "Uttar Pradesh", "Uttarakhand"],
  radiusTargeting: "",
  excludedRegions: [],
  interests: ["Environment", "River Conservation", "Sustainability", "Climate Action"],
  topics: [],
  behaviors: ["Online Shoppers", "Social Engagers", "Video Viewers"],
  segments: ["Students", "Families", "Volunteers", "NGOs", "Environmentally Conscious Users"],
  excluded: ["Competitors", "Irrelevant Industries", "Under 18"],
  devicePreference: "All",
  lookalike: true,
  lookalikePercent: "1%",
  retargeting: true,
  retargetingSources: ["Website visitors (180 days)", "Video viewers (25%+)", "Social engagers"],
  createExclusions: false,
  audienceExpansion: true,

  title: "Save Rivers, Save Lives 2025",
  headline: "Clean Rivers, Brighter Tomorrow",
  masterCaption:
    "Our rivers give us life, culture and a healthier tomorrow.\nLet's come together to keep them clean for generations ahead.\n#SaveRivers #CleanIndia",
  description2: "Join India's largest river conservation movement.",
  cta: "Learn More",
  activePlatform: "Instagram",
  publishDate: "Mar 15, 2025",
  publishTime: "10:00 AM",
  timezone: "Asia/Kolkata (IST)",
  recurrence: "One time",
  hashtags: ["#SaveRivers", "#CleanIndia", "#NamoGange", "#RiverConservation", "#SustainableIndia", "#WaterForLife", "#CleanWater"],
  mentions: ["@mokshasewa", "@nababorngange"],
  firstComment: "Join us in this mission to save our rivers. Every drop counts!",
  contentStatus: "Approved",
  mediaAssets: [
    { name: "river-cleanup-1.jpg", src: "/campaigns/save-rivers/wide.png", type: "image" },
    { name: "community-video.mp4", src: "/campaigns/save-rivers/wide-2.png", type: "video" },
    { name: "volunteers.jpg", src: "/campaigns/save-rivers/square.png", type: "image" },
    { name: "banner.png", src: "/campaigns/save-rivers/banner.png", type: "image" },
  ],
  platformSchedules: {
    Instagram: { date: "Mar 15, 2025", time: "10:00 AM" },
    Facebook: { date: "Mar 15, 2025", time: "10:05 AM" },
    LinkedIn: { date: "Mar 15, 2025", time: "11:00 AM" },
    YouTube: { date: "Mar 16, 2025", time: "6:00 PM" },
    WhatsApp: { date: "Mar 15, 2025", time: "9:00 AM" },
    Website: { date: "Mar 15, 2025", time: "10:00 AM" },
    Email: { date: "Mar 16, 2025", time: "8:00 AM" },
  },

  utmSource: "social",
  utmMedium: "cpc",
  utmCampaign: "save-rivers-2025",
  utmContent: "awareness",
  utmTerm: "river-conservation",
  addUtm: true,
  trackingIntegrations: {
    "Meta Pixel": true,
    "Google Tag": true,
    "LinkedIn Insight Tag": false,
    "Website Events": true,
    "CRM Events": true,
  },
  conversionEvents: ["Lead", "Signup", "Donation"],
  landingPageUrl: "https://mokshasewa.org/save-rivers",

  automationRules: [
    {
      id: "rule-1",
      name: "Budget Auto-Scale",
      enabled: true,
      condition: "Conversions reached",
      conditionValue: "50",
      action: "Increase budget",
      actionValue: "10%",
    },
    {
      id: "rule-2",
      name: "Lead Routing",
      enabled: true,
      condition: "New lead generated",
      conditionValue: "",
      action: "Create CRM contact",
      actionValue: "Assign to sales team",
    },
  ],
  abTests: [
    {
      id: "test-1",
      name: "Creative Test",
      enabled: true,
      variable: "Creative",
      variantA: "River landscape photo",
      variantB: "Volunteers working",
      trafficSplit: 50,
    },
  ],

  reviewedContent: true,
  budgetApproved: true,
  readyToPublish: true,
  launchMode: "now",
  notifyOwner: true,
  notifyClientTeam: true,
  notifyMarketing: true,
  notifyEmail: false,
  approvalState: "Approved",
};

export const CAMPAIGN_STEPS = [
  { id: 1, title: "Campaign Basics", caption: "Campaign information" },
  { id: 2, title: "Goals & Budget", caption: "Set objectives" },
  { id: 3, title: "Channels & Accounts", caption: "Select platforms" },
  { id: 4, title: "Audience", caption: "Define target users" },
  { id: 5, title: "Content & Schedule", caption: "Create assets" },
  { id: 6, title: "Tracking", caption: "UTM & pixels" },
  { id: 7, title: "Automation", caption: "Rules & experiments" },
  { id: 8, title: "Review & Launch", caption: "Confirm and publish" },
] as const;

export const STEP_NAV: Record<number, { back?: string; next: string }> = {
  1: { next: "Continue to Goals & Budget" },
  2: { back: "Back to Campaign Basics", next: "Continue to Channels & Accounts" },
  3: { back: "Back to Goals & Budget", next: "Continue to Audience" },
  4: { back: "Back to Channels & Accounts", next: "Continue to Content & Schedule" },
  5: { back: "Back to Audience", next: "Continue to Tracking" },
  6: { back: "Back to Content & Schedule", next: "Continue to Automation" },
  7: { back: "Back to Tracking", next: "Continue to Review & Launch" },
  8: { back: "Back to Automation", next: "Launch Campaign" },
};

export const STEP_RAIL: Record<
  number,
  { tipsCaption: string; tips: { label: string; done: boolean }[]; checklist: string[] }
> = {
  1: {
    tipsCaption: "Make your campaign more effective.",
    tips: [
      { label: "Choose a clear and memorable campaign name", done: true },
      { label: "Select the right campaign mode (Organic, Paid, Unified)", done: true },
      { label: "Write a compelling short description", done: true },
      { label: "Set the right campaign objective and category", done: true },
      { label: "Add contributors and approvers for workflow", done: true },
      { label: "Add relevant tags for better organization", done: true },
    ],
    checklist: [
      "Campaign details completed",
      "Goals & budget set",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  2: {
    tipsCaption: "Smart tips for effective budget planning.",
    tips: [
      { label: "Allocate more budget to high-reach channels", done: true },
      { label: "Keep 10-15% as contingency reserve", done: true },
      { label: "Align budget with your campaign duration", done: true },
      { label: "Use historical data to set realistic KPI targets", done: true },
      { label: "Set bid strategy based on your objective", done: true },
      { label: "Consider dayparting for better performance", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  3: {
    tipsCaption: "Choose the right channels and placements.",
    tips: [
      { label: "Connect accounts before selecting placements", done: true },
      { label: "Use vertical formats (9:16) for higher engagement", done: true },
      { label: "Keep key text and logos within safe areas", done: true },
      { label: "Select placements that match your goals", done: true },
      { label: "Enable auto-resize for cross-platform optimization", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  4: {
    tipsCaption: "Tips to target the right audience effectively.",
    tips: [
      { label: "Be specific about your audience segments", done: true },
      { label: "Use location targeting for better relevance", done: true },
      { label: "Combine multiple interests for precision", done: true },
      { label: "Exclude irrelevant audiences", done: true },
      { label: "Consider lookalike audiences for expansion", done: true },
      { label: "Save audiences as reusable templates", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  5: {
    tipsCaption: "Create engaging content that drives action.",
    tips: [
      { label: "Upload a master creative for AI adaptation", done: true },
      { label: "Customize captions for each platform", done: true },
      { label: "Use relevant hashtags and mentions", done: true },
      { label: "Schedule at optimal times for each channel", done: true },
      { label: "Preview content before publishing", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  6: {
    tipsCaption: "Set up tracking for accurate measurement.",
    tips: [
      { label: "Configure UTM parameters for all links", done: true },
      { label: "Connect tracking pixels for paid campaigns", done: true },
      { label: "Set up conversion events for lead tracking", done: true },
      { label: "Verify landing page URL is working", done: true },
      { label: "Connect CRM for lead management", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  7: {
    tipsCaption: "Automate and optimize your campaign.",
    tips: [
      { label: "Set up budget automation rules", done: true },
      { label: "Configure lead routing to CRM", done: true },
      { label: "Set up A/B tests for creative optimization", done: true },
      { label: "Configure automatic budget reallocation", done: true },
      { label: "Set up notification triggers", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & accounts configured",
      "Audience targeting set",
      "Content & schedule added",
      "Tracking configured",
      "Automation rules set",
      "Ready for review and launch",
    ],
  },
  8: {
    tipsCaption: "Final checks before you launch.",
    tips: [
      { label: "Review all campaign details carefully", done: true },
      { label: "Ensure content aligns with your goals", done: true },
      { label: "Verify audience targeting and budget", done: true },
      { label: "Check channel connections are active", done: true },
      { label: "Confirm tracking and measurement setup", done: true },
      { label: "Get approval from stakeholders", done: true },
    ],
    checklist: [
      "Campaign details reviewed",
      "Goals & budget confirmed",
      "Channels & accounts verified",
      "Audience targeting confirmed",
      "Content & creatives approved",
      "Tracking configured",
      "Automation & experiments set",
      "Ready to launch",
    ],
  },
};

export const STEP_DONE: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 };

export const CHANNEL_CATALOG = [
  { name: "Meta & Instagram", channel: "Meta", caption: "Reach people on Facebook and Instagram", connected: true, reach: "~30K - 80K reach" },
  { name: "LinkedIn", channel: "LinkedIn", caption: "Professional audience and B2B reach", connected: true, reach: "~10K - 40K reach" },
  { name: "Google", channel: "Google", caption: "Search and display advertising", connected: true, reach: "~5K - 25K reach" },
  { name: "YouTube", channel: "YouTube", caption: "Video content and wider reach", connected: true, reach: "~20K - 100K reach" },
  { name: "WhatsApp", channel: "WhatsApp", caption: "Direct engagement and community updates", connected: true, reach: "~10K - 50K reach" },
  { name: "Website", channel: "Website", caption: "Your website and landing pages", connected: true, reach: "~5K - 30K reach" },
  { name: "Google Business", channel: "Google Business", caption: "Local visibility and community reach", connected: true, reach: "~3K - 15K reach" },
] as const;

export const CAMPAIGN_MODES = ["Organic", "Paid", "Unified"] as const;

export const CAMPAIGN_OBJECTIVES = [
  "Brand Awareness",
  "Website Traffic",
  "Engagement",
  "Lead Generation",
  "Sales / Conversions",
  "App Promotion",
  "Donations",
  "Event Promotion",
  "Community Engagement",
  "Customer Retention",
  "Re-engagement",
] as const;

export const CAMPAIGN_CATEGORIES = [
  "Brand",
  "Product",
  "Event",
  "Seasonal",
  "Awareness",
  "Lead Generation",
  "Sales",
  "Retention",
  "Launch",
] as const;

export const APPROVAL_WORKFLOW = [
  { step: "Draft", color: "#9CA3AF", icon: "pencil" as const },
  { step: "Internal Review", color: "#F59E0B", icon: "eye" as const },
  { step: "Client Approval", color: "#1975E7", icon: "check" as const },
  { step: "Scheduled", color: "#7C3AED", icon: "clock" as const },
  { step: "Live", color: "#0AA673", icon: "play" as const },
  { step: "Completed", color: "#0AA673", icon: "checkcircle" as const },
] as const;

export const PLATFORM_ACCOUNTS: Record<string, { name: string; handle: string }[]> = {
  Instagram: [
    { name: "Moksha Sewa Official", handle: "@mokshasewa" },
    { name: "Moksha Sewa Careers", handle: "@mokshasewacareers" },
  ],
  Facebook: [
    { name: "Moksha Sewa Official", handle: "mokshasewa.org" },
    { name: "Moksha Sewa Community", handle: "mokshasewacommunity" },
  ],
  LinkedIn: [
    { name: "Moksha Sewa Foundation", handle: "moksha-sewa-foundation" },
  ],
  YouTube: [
    { name: "Moksha Sewa", handle: "@mokshasewa" },
  ],
  WhatsApp: [
    { name: "Moksha Sewa", handle: "+91 98765 43210" },
  ],
  "Google Business": [
    { name: "Moksha Sewa Foundation", handle: "Varanasi, UP" },
  ],
  Website: [
    { name: "mokshasewa.org", handle: "mokshasewa.org" },
  ],
};
