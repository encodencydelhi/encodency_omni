import { DEFAULT_PLACEMENTS } from "./placements";

/** Everything the Create Campaign flow collects across its six steps. */
export interface CampaignDraft {
  // 1 — Basic Details
  name: string;
  type: string;
  client: string;
  owner: string;
  priority: string;
  description: string;
  internalNotes: string;
  tags: string[];

  // 2 — Goals & Budget
  objective: string;
  totalBudget: string;
  dailyBudget: string;
  expectedLeads: string;
  targetCpl: string;
  startDate: string;
  endDate: string;
  distribution: { channel: string; percent: number }[];
  contingency: string;

  // 3 — Channels & Placements
  channels: string[];
  placements: string[];
  publishingPreference: string;
  crossChannelSync: boolean;
  contentCustomization: boolean;

  // 4 — Audience
  audienceType: string;
  ageRange: string;
  gender: string;
  regions: string[];
  languages: string[];
  interests: string[];
  segments: string[];
  excluded: string[];
  devicePreference: string;
  lookalike: boolean;
  retargeting: boolean;
  createExclusions: boolean;

  // 5 — Content & Schedule
  title: string;
  masterCaption: string;
  cta: string;
  activePlatform: string;
  publishDate: string;
  publishTime: string;
  timezone: string;
  recurrence: string;
  addUtm: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  hashtags: string[];
  contentStatus: string;

  // 6 — Review & Launch
  reviewedContent: boolean;
  budgetApproved: boolean;
  readyToPublish: boolean;
  launchMode: string;
  notifyOwner: boolean;
  notifyClientTeam: boolean;
  notifyMarketing: boolean;
  notifyEmail: boolean;
}

export const initialCampaign: CampaignDraft = {
  name: "Save Rivers, Save Lives 2025",
  type: "Awareness",
  client: "Moksha Sewa",
  owner: "Manish Sirohi",
  priority: "High",
  description:
    "A nationwide awareness campaign to promote river conservation, inspire community action and drive support for cleaner, healthier rivers across India. Through compelling stories, real people and real impact, we aim to unite citizens, communities and organizations for a cleaner, greener tomorrow.",
  internalNotes:
    "Focus on authentic storytelling, real beneficiary stories and before-after visuals. Coordinate with state partners for regional content. Target World Water Day for major launch. Keep messaging positive, action-oriented and inclusive.",
  tags: ["Environment", "Awareness", "Social", "CSR"],

  objective: "awareness",
  totalBudget: "50,000",
  dailyBudget: "1,667",
  expectedLeads: "500",
  targetCpl: "100",
  startDate: "Mar 15, 2025",
  endDate: "Apr 30, 2025",
  distribution: [
    { channel: "Meta & Instagram", percent: 30 },
    { channel: "LinkedIn", percent: 20 },
    { channel: "Google Business", percent: 15 },
    { channel: "Website", percent: 15 },
    { channel: "WhatsApp", percent: 10 },
    { channel: "YouTube", percent: 10 },
  ],
  contingency: "5,000",

  channels: ["Meta & Instagram", "LinkedIn", "Google Business", "WhatsApp", "YouTube", "Website"],
  placements: [...DEFAULT_PLACEMENTS],
  publishingPreference: "Publish natively on each platform",
  crossChannelSync: true,
  contentCustomization: false,

  audienceType: "General Public",
  ageRange: "18 – 65+",
  gender: "All",
  regions: ["All India", "Uttar Pradesh", "Uttarakhand"],
  languages: ["Hindi", "English", "Regional Languages"],
  interests: ["Environment", "River Conservation", "Sustainability", "Clean India"],
  segments: ["Students", "Families", "Volunteers", "NGOs", "Environmentally Conscious Users", "Policy Influencers"],
  excluded: ["Competitors", "Irrelevant Industries", "Under 18"],
  devicePreference: "All Devices",
  lookalike: true,
  retargeting: true,
  createExclusions: false,

  title: "Save Rivers, Save Lives 2025",
  masterCaption:
    "Our rivers give us life, culture and a healthier tomorrow.\nLet's come together to keep them clean for generations ahead.\n#SaveRivers #CleanIndia",
  cta: "Learn More",
  activePlatform: "Facebook",
  publishDate: "Mar 15, 2025",
  publishTime: "10:00 AM",
  timezone: "Asia/Kolkata (IST)",
  recurrence: "One time",
  addUtm: true,
  utmSource: "social",
  utmMedium: "cpc",
  utmCampaign: "save-rivers-2025",
  utmTerm: "awareness",
  hashtags: [
    "#SaveRivers",
    "#CleanIndia",
    "#NamoGange",
    "#RiverConservation",
    "#SustainableIndia",
    "#WaterForLife",
    "#CleanWater",
  ],
  contentStatus: "Approved",

  reviewedContent: true,
  budgetApproved: true,
  readyToPublish: true,
  launchMode: "now",
  notifyOwner: true,
  notifyClientTeam: true,
  notifyMarketing: true,
  notifyEmail: false,
};

export const CAMPAIGN_STEPS = [
  { id: 1, title: "Basic Details", caption: "Campaign information" },
  { id: 2, title: "Goals & Budget", caption: "Set objectives" },
  { id: 3, title: "Channels & Placements", caption: "Select platforms" },
  { id: 4, title: "Audience", caption: "Define target users" },
  { id: 5, title: "Content, Media & Schedule", caption: "Create assets and timeline" },
  { id: 6, title: "Review & Launch", caption: "Confirm and publish" },
] as const;

/** Footer wording is specific to each step in the approved designs. */
export const STEP_NAV: Record<number, { back?: string; next: string }> = {
  1: { next: "Continue to Goals & Budget" },
  2: { back: "Back to Basic Details", next: "Continue to Channels & Placements" },
  3: { back: "Back to Goals & Budget", next: "Continue to Audience" },
  4: { back: "Back to Channels & Placements", next: "Continue to Content, Media & Schedule" },
  5: { back: "Back to Audience", next: "Continue to Review & Launch" },
  6: { back: "Back to Content, Media & Schedule", next: "Launch Campaign" },
};

/** Quick Tips and the Readiness Checklist are re-written on every step. */
export const STEP_RAIL: Record<
  number,
  { tipsCaption: string; tips: { label: string; done: boolean }[]; checklist: string[] }
> = {
  1: {
    tipsCaption: "Make your campaign more effective.",
    tips: [
      { label: "Choose a clear and memorable campaign name", done: true },
      { label: "Write a compelling short description", done: true },
      { label: "Set the right campaign type and priority", done: true },
      { label: "Add relevant tags for better organization", done: true },
      { label: "Include internal notes for your team", done: true },
    ],
    checklist: [
      "Basic details completed",
      "Goals & budget set",
      "Channels & placements selected",
      "Audience targeting configured",
      "Content, media & schedule added",
      "Ready for review and launch",
    ],
  },
  2: {
    tipsCaption: "Smart tips for effective budget planning.",
    tips: [
      { label: "Allocate more budget to high-reach channels", done: true },
      { label: "Keep 10-15% as contingency reserve", done: true },
      { label: "Align budget with your campaign duration", done: true },
      { label: "Use historical data to set realistic CPL targets", done: true },
      { label: "Focus on 50-60% for social media in awareness", done: true },
      { label: "Monitor and reallocate budget based on performance", done: true },
      { label: "Consider seasonal events and awareness days", done: true },
    ],
    checklist: [
      "Campaign basics completed",
      "Goals & budget configured",
      "Channels & placements selected",
      "Audience targeting configured",
      "Content, media & schedule added",
      "Ready for review and launch",
    ],
  },
  3: {
    tipsCaption: "Choose the right placements for better results.",
    tips: [
      { label: "Select placements that match your goals", done: true },
      { label: "Use vertical formats (9:16) for higher engagement", done: true },
      { label: "Keep key text and logos within safe areas", done: true },
      { label: "Choose platform-specific creative formats", done: true },
      { label: "Add multiple placements to increase reach", done: true },
      { label: "Let auto-resize optimize for each channel", done: true },
    ],
    checklist: [
      "Basic details completed",
      "Goals & budget set",
      "Channels & placements selected",
      "Audience targeting configured",
      "Content, media & schedule added",
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
      { label: "Consider using lookalike audiences", done: true },
      { label: "Test and refine based on performance", done: true },
    ],
    checklist: [
      "Campaign details added",
      "Goals and budget set",
      "At least one channel selected",
      "Audience targeting configured",
      "Content and schedule added",
    ],
  },
  5: {
    tipsCaption: "Create engaging content that drives action.",
    tips: [
      { label: "Use authentic river and community visuals", done: true },
      { label: "Keep your message clear and action-oriented", done: true },
      { label: "Customize content for each platform", done: true },
      { label: "Use relevant hashtags and keywords", done: true },
      { label: "Schedule at optimal times for better reach", done: true },
      { label: "Ensure compliance with Namo Gange guidelines", done: true },
    ],
    checklist: [
      "Campaign content created",
      "Media assets added",
      "Platform content customized",
      "Schedule and timing set",
      "Tracking parameters configured",
      "Content approved and compliant",
    ],
  },
  6: {
    tipsCaption: "Final checks before you launch.",
    tips: [
      { label: "Review all campaign details carefully", done: true },
      { label: "Ensure content aligns with your goals", done: true },
      { label: "Verify audience targeting and budget", done: true },
      { label: "Check channel connections are active", done: true },
      { label: "Confirm tracking and measurement setup", done: true },
      { label: "Launch and monitor performance regularly", done: true },
    ],
    checklist: [
      "Campaign details reviewed",
      "Goals and budget confirmed",
      "All channels connected",
      "Audience targeting verified",
      "Content and schedule approved",
      "Ready to launch",
    ],
  },
};

/** How many checklist rows are ticked on each step. */
export const STEP_DONE: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 6 };

export const CHANNEL_CATALOG = [
  { name: "Meta & Instagram", channel: "Meta", caption: "Reach people on Facebook and Instagram", connected: true, reach: "~30K - 80K reach" },
  { name: "LinkedIn", channel: "LinkedIn", caption: "Professional audience and B2B reach", connected: true, reach: "~10K - 40K reach" },
  { name: "Google Business", channel: "Google Business", caption: "Local visibility and community reach", connected: true, reach: "~5K - 25K reach" },
  { name: "WhatsApp", channel: "WhatsApp", caption: "Direct engagement and community updates", connected: false, reach: "~10K - 50K reach" },
  { name: "YouTube", channel: "YouTube", caption: "Video content and wider reach", connected: false, reach: "~20K - 100K reach" },
  { name: "Website", channel: "Website", caption: "Your website and landing pages", connected: true, reach: "~5K - 30K reach" },
] as const;
