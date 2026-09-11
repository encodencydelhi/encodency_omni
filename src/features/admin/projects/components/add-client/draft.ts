/**
 * Everything the Add Client wizard collects across its seven steps.
 *
 * Seeded with the Moksha Sewa example from the approved designs so the flow is
 * demonstrable end to end; swap `initialDraft` for an empty object once the
 * create-client API exists.
 */
export interface ClientDraft {
  // 1 — Basic Information
  brandName: string;
  legalName: string;
  clientType: string;
  industry: string;
  shortDescription: string;
  websiteUrl: string;
  country: string;
  city: string;
  timezone: string;
  currency: string;
  brandColor: string;

  // 2 — Business Profile
  services: string[];
  targetAudience: string[];
  targetLocations: string[];
  marketingGoals: string[];
  usp: string;
  competitors: string[];
  brandTone: string[];
  primaryCta: string;
  keywords: string[];
  socials: { instagram: string; linkedin: string; youtube: string; facebook: string };

  // 3 — Website & SEO
  sitemapUrl: string;
  targetCountry: string;
  targetLanguage: string;
  seoCategory: string;
  seoTracking: boolean;
  robotsUrl: string;
  crawlFrequency: string;
  priorityPages: string;
  keywordImport: "manual" | "csv" | "console";
  competitorSites: string;
  technicalNotes: string;

  // 4 — Channels & Integrations
  channels: Record<string, "connected" | "ready" | "none">;
  defaultChannels: string;
  defaultContentType: string;
  syncFrequency: string;
  syncHistory: string;

  // 5 — Marketing Setup
  primaryGoals: string[];
  audienceSegments: string[];
  marketingChannels: string[];
  objectivePriority: string;
  contentCategories: string[];
  budgetRange: string;
  defaultCta: string;
  publishingFrequency: string;
  leadGoal: string;
  conversionGoal: string;
  approvalFlow: string;
  approvalContact: string;
  focusAreas: string[];
  toneNotes: string;
  prohibitedNotes: string;

  // 6 — Team & Permissions
  team: {
    role: string;
    name: string;
    email: string;
    initials: string;
    color: string;
    scopes: { label: string; tone: string }[];
    additionalRole: string;
  }[];
  clientOwner: string;
  approvalTeamContact: string;

  // 7 — Review & Create
  confirmed: boolean;
}

export const initialDraft: ClientDraft = {
  brandName: "Moksha Sewa",
  legalName: "Moksha Sewa Foundation",
  clientType: "NGO / Non-Profit",
  industry: "Social Impact / NGO",
  shortDescription:
    "Moksha Sewa works towards providing dignified funeral services for the underprivileged and unclaimed bodies. Our mission is to serve humanity with compassion, respect and dignity.",
  websiteUrl: "https://mokshasewa.org",
  country: "India",
  city: "New Delhi",
  timezone: "(GMT+05:30) India Standard Time (IST)",
  currency: "INR – Indian Rupee (₹)",
  brandColor: "#6B46C1",

  services: ["Funeral Support", "Prayer Services", "Ambulance Service", "Volunteer Support", "Donation Campaigns"],
  targetAudience: ["Families in need", "Donors", "Volunteers", "Hospitals", "Community Partners"],
  targetLocations: ["Delhi NCR", "Ghaziabad", "Noida", "Greater Noida"],
  marketingGoals: ["Awareness", "Donations", "Volunteers", "Website Traffic", "Lead Generation"],
  usp: "Dignified, compassionate and affordable funeral services for the underprivileged, with a focus on human dignity and community support.",
  competitors: ["Antyodaya Foundation", "Goonj", "HelpAge India"],
  brandTone: ["Compassionate", "Trustworthy", "Respectful", "Informative"],
  primaryCta: "Make a Donation",
  keywords: ["funeral services", "cremation", "last rites", "charity", "ngo", "social service", "community support"],
  socials: {
    instagram: "@mokshasewa",
    linkedin: "/moksha-sewa",
    youtube: "@mokshasewa",
    facebook: "/mokshasewa",
  },

  sitemapUrl: "",
  targetCountry: "India",
  targetLanguage: "English",
  seoCategory: "Non-Profit / NGO",
  seoTracking: true,
  robotsUrl: "",
  crawlFrequency: "Weekly",
  priorityPages: "/about, /services, /donate, /contact",
  keywordImport: "manual",
  competitorSites: "",
  technicalNotes: "",

  channels: {
    "Meta & Instagram": "connected",
    LinkedIn: "none",
    "Google Business Profile": "ready",
    WhatsApp: "none",
    YouTube: "none",
    Website: "connected",
    "Search Console": "ready",
    "Google Analytics 4": "none",
  },
  defaultChannels: "Auto-select connected channels",
  defaultContentType: "General Update",
  syncFrequency: "Daily (Recommended)",
  syncHistory: "Last 3 months",

  primaryGoals: ["Increase awareness", "Get more donations"],
  audienceSegments: ["Individuals", "Families", "CSR / Corporates"],
  marketingChannels: ["Instagram", "Facebook", "LinkedIn"],
  objectivePriority: "Awareness > Donations > Volunteers",
  contentCategories: ["Impact Stories", "Events", "Education"],
  budgetRange: "25,000 – 50,000",
  defaultCta: "Donate Now",
  publishingFrequency: "3–4 posts per week",
  leadGoal: "100 – 250",
  conversionGoal: "5% – 10%",
  approvalFlow: "Client Review → Final Approval",
  approvalContact: "Ravi Sharma (ravi@mokshasewa.org)",
  focusAreas: ["Awareness", "Donations", "Volunteers", "Website Traffic", "Local Visibility", "Fundraising"],
  toneNotes:
    "Keep the tone compassionate, authentic and hopeful. Highlight real stories, impact and community support.",
  prohibitedNotes:
    "Avoid political content, sensitive religious debates, misleading claims or images of deceased individuals.",

  team: [
    { role: "Account Manager", name: "Manish Sirohi", email: "manish@encodency.com", initials: "MS", color: "#4F46E5", scopes: [{ label: "All Channels", tone: "indigo" }, { label: "Reports", tone: "green" }], additionalRole: "Account Manager" },
    { role: "SEO Manager", name: "Priya Kapoor", email: "priya@encodency.com", initials: "PK", color: "#7C3AED", scopes: [{ label: "SEO", tone: "indigo" }, { label: "Website", tone: "blue" }], additionalRole: "SEO Specialist" },
    { role: "Social Media Manager", name: "Amit Reddy", email: "amit@encodency.com", initials: "AR", color: "#DB2777", scopes: [{ label: "Social Media", tone: "pink" }, { label: "Content", tone: "blue" }], additionalRole: "Social Media Manager" },
    { role: "Ads Manager", name: "Rohan Verma", email: "rohan@encodency.com", initials: "RV", color: "#EA580C", scopes: [{ label: "Paid Ads", tone: "amber" }, { label: "Analytics", tone: "blue" }], additionalRole: "Performance Marketer" },
    { role: "Content Writer", name: "Sneha Kulkarni", email: "sneha@encodency.com", initials: "SK", color: "#9333EA", scopes: [{ label: "Content", tone: "indigo" }, { label: "Blog", tone: "blue" }], additionalRole: "Content Writer" },
    { role: "Sales / CRM User", name: "Anjali Tiwari", email: "anjali@encodency.com", initials: "AT", color: "#059669", scopes: [{ label: "CRM", tone: "green" }, { label: "Leads", tone: "blue" }], additionalRole: "CRM Executive" },
    { role: "Viewer", name: "Ravi Kumar", email: "ravi@encodency.com", initials: "RK", color: "#0891B2", scopes: [{ label: "Reports Only", tone: "indigo" }], additionalRole: "Viewer" },
  ],
  clientOwner: "Manish Sirohi",
  approvalTeamContact: "",

  confirmed: false,
};

export const STEPS = [
  { id: 1, title: "Basic Information", caption: "General details" },
  { id: 2, title: "Business Profile", caption: "About the business" },
  { id: 3, title: "Website & SEO", caption: "Website details" },
  { id: 4, title: "Channels & Integrations", caption: "Connect accounts" },
  { id: 5, title: "Marketing Setup", caption: "Goals & audience" },
  { id: 6, title: "Team & Permissions", caption: "Assign team members" },
  { id: 7, title: "Review & Create", caption: "Confirm and launch" },
] as const;
