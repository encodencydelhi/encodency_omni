/**
 * Everything the Create Campaign flow collects across its six steps.
 *
 * Seeded with the "Save Rivers, Save Lives 2025" example from the approved
 * designs; swap `initialCampaign` for empty values once the create API exists.
 */
export interface CampaignDraft {
  // 1 — Basic Details
  name: string;
  type: string;
  client: string;
  owner: string;
  description: string;
  priority: string;

  // 2 — Goals & Budget
  objective: string;
  totalBudget: string;
  dailyBudget: string;
  expectedLeads: string;
  targetCpl: string;
  startDate: string;
  endDate: string;

  // 3 — Channels
  channels: string[];

  // 4 — Audience
  audienceType: string;
  ageRange: string;
  gender: string;
  language: string;
  audienceSize: string;
  locations: string[];
  interests: string[];
  devices: string[];

  // 5 — Content & Schedule
  headline: string;
  primaryText: string;
  cta: string;
  landingUrl: string;
  publishMode: string;
  publishDate: string;
  publishTime: string;
  frequency: string;
  timezone: string;

  // 6 — Review & Launch
  confirmed: boolean;
}

export const initialCampaign: CampaignDraft = {
  name: "Save Rivers, Save Lives 2025",
  type: "Awareness",
  client: "Moksha Sewa",
  owner: "Manish Sirohi",
  description:
    "A nationwide awareness campaign to promote river conservation, inspire community action and drive support for a cleaner, healthier India.",
  priority: "High",

  objective: "awareness",
  totalBudget: "50,000",
  dailyBudget: "1,667",
  expectedLeads: "500",
  targetCpl: "100",
  startDate: "Mar 15, 2025",
  endDate: "Apr 30, 2025",

  channels: ["Meta & Instagram", "LinkedIn", "Google Business", "Website"],

  audienceType: "new",
  ageRange: "18 – 65+",
  gender: "All",
  language: "Hindi + English",
  audienceSize: "Balanced",
  locations: ["Delhi NCR", "Uttar Pradesh", "Bihar", "Maharashtra"],
  interests: ["Environment", "Social Causes", "Volunteering", "Sustainability"],
  devices: ["Mobile", "Desktop"],

  headline: "Save Rivers, Save Lives",
  primaryText:
    "Every drop counts. Join thousands of volunteers working to restore India's rivers — donate, volunteer or simply spread the word.",
  cta: "Donate Now",
  landingUrl: "https://mokshasewa.org/donate",
  publishMode: "scheduled",
  publishDate: "Mar 15, 2025",
  publishTime: "09:00 AM",
  frequency: "3× per week",
  timezone: "(GMT+05:30) IST",

  confirmed: false,
};

export const CAMPAIGN_STEPS = [
  { id: 1, title: "Basic Details", caption: "Campaign information" },
  { id: 2, title: "Goals & Budget", caption: "Set objectives" },
  { id: 3, title: "Channels", caption: "Select platforms" },
  { id: 4, title: "Audience", caption: "Define target users" },
  { id: 5, title: "Content & Schedule", caption: "Create content" },
  { id: 6, title: "Review & Launch", caption: "Confirm and publish" },
] as const;
