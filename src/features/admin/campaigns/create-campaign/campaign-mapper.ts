import type { CampaignDraft } from "./draft";
import type {
  CampaignObjective,
  CampaignMode,
  BiddingStrategy,
  CreateCampaignPayload,
  KpisPayload,
  AudiencePayload,
} from "../live/campaigns-api";
import { toCalendarDateString } from "./date-utils";

export const OBJECTIVE_MAP: Record<string, CampaignObjective> = {
  "brand awareness": "AWARENESS",
  "website traffic": "TRAFFIC",
  traffic: "TRAFFIC",
  engagement: "ENGAGEMENT",
  "lead generation": "LEADS",
  leads: "LEADS",
  "sales / conversions": "SALES",
  sales: "SALES",
  conversions: "SALES",
  "app promotion": "APP_PROMOTION",
  donations: "SALES",
  "event promotion": "ENGAGEMENT",
  "community engagement": "ENGAGEMENT",
  "customer retention": "RETENTION",
  retention: "RETENTION",
  "re-engagement": "REENGAGEMENT",
  reengagement: "REENGAGEMENT",
  awareness: "AWARENESS",
};

export const CHANNEL_MAP: Record<string, string> = {
  "meta & instagram": "META",
  meta: "META",
  facebook: "META",
  instagram: "META",
  linkedin: "LINKEDIN",
  youtube: "YOUTUBE",
  google: "GOOGLE_BUSINESS",
  "google business": "GOOGLE_BUSINESS",
  x: "X",
  twitter: "X",
};

export const BIDDING_STRATEGY_MAP: Record<string, BiddingStrategy> = {
  "lowest cost": "LOWEST_COST",
  "cost cap": "COST_CAP",
  "bid cap": "BID_CAP",
  "target roas": "TARGET_ROAS",
  "minimum roas": "MINIMUM_ROAS",
};

export const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: "en",
  hindi: "hi",
  bengali: "bn",
  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  gujarati: "gu",
  kannada: "kn",
  malayalam: "ml",
  punjabi: "pa",
  urdu: "ur",
  arabic: "ar",
  french: "fr",
  german: "de",
  spanish: "es",
  portuguese: "pt",
};

export function buildCampaignPayload(draft: CampaignDraft, isDraft: boolean): CreateCampaignPayload {
  const name = draft.name?.trim() || (isDraft ? "Untitled Draft Campaign" : "New Campaign");

  // Mode
  let campaignMode: CampaignMode = "UNIFIED";
  if (draft.campaignMode) {
    const rawMode = draft.campaignMode.trim().toUpperCase();
    if (rawMode === "ORGANIC" || rawMode === "PAID" || rawMode === "UNIFIED") {
      campaignMode = rawMode as CampaignMode;
    }
  }

  // Objective
  let objective: CampaignObjective | undefined = undefined;
  const rawObj = (draft.objective || draft.primaryObjective || "").trim().toLowerCase();
  if (rawObj && OBJECTIVE_MAP[rawObj]) {
    objective = OBJECTIVE_MAP[rawObj];
  } else if (rawObj) {
    const upper = rawObj.toUpperCase() as CampaignObjective;
    if (["AWARENESS", "TRAFFIC", "ENGAGEMENT", "LEADS", "SALES", "APP_PROMOTION", "RETENTION", "REENGAGEMENT"].includes(upper)) {
      objective = upper;
    }
  }

  // Budget
  let budget: { amount: string; currency: string } | undefined = undefined;
  const rawBudget =
    draft.budgetType === "Daily"
      ? draft.dailyBudget
      : draft.budgetType === "Monthly"
      ? (draft.monthlyBudget || draft.totalBudget)
      : (draft.totalBudget || draft.dailyBudget);

  if (rawBudget) {
    const parsed = parseFloat(rawBudget.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed) && parsed > 0) {
      budget = {
        amount: parsed.toFixed(2),
        currency: "INR",
      };
    }
  }

  // Dates
  const startDate = toCalendarDateString(draft.startDate) || null;
  const endDate = toCalendarDateString(draft.endDate) || null;

  // Category
  const allowedCategories = ["Brand", "Product", "Event", "Seasonal", "Awareness", "Lead Generation", "Sales", "Retention", "Launch"];
  let category: string | undefined = undefined;
  if (draft.category && allowedCategories.includes(draft.category)) {
    category = draft.category;
  }

  // Description & internalNotes
  const description = draft.description?.trim() ? draft.description.trim().slice(0, 2000) : undefined;
  const internalNotes = draft.internalNotes?.trim() ? draft.internalNotes.trim().slice(0, 5000) : undefined;

  // Tags
  const tags = Array.isArray(draft.tags)
    ? [...new Set(draft.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
    : [];

  // Channels
  const channelCodes: string[] = [];
  if (Array.isArray(draft.channels)) {
    for (const ch of draft.channels) {
      const code = CHANNEL_MAP[ch.trim().toLowerCase()];
      if (code && !channelCodes.includes(code)) {
        channelCodes.push(code);
      }
    }
  }

  // Bidding strategy (Only when mode is NOT ORGANIC)
  let biddingStrategy: BiddingStrategy | undefined = undefined;
  if (campaignMode !== "ORGANIC" && draft.bidStrategy) {
    const rawStrat = draft.bidStrategy.trim().toLowerCase();
    if (BIDDING_STRATEGY_MAP[rawStrat]) {
      biddingStrategy = BIDDING_STRATEGY_MAP[rawStrat];
    } else {
      const upper = rawStrat.toUpperCase().replace(/\s+/g, "_") as BiddingStrategy;
      if (["LOWEST_COST", "COST_CAP", "BID_CAP", "TARGET_ROAS", "MINIMUM_ROAS"].includes(upper)) {
        biddingStrategy = upper;
      }
    }
  }

  // KPIs
  const kpis: KpisPayload = {};
  const parseCount = (val?: string) => {
    if (!val) return undefined;
    const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
    return !Number.isNaN(n) && n >= 0 ? Math.min(n, 1_000_000_000_000) : undefined;
  };

  const reach = parseCount(draft.targetReach);
  if (reach !== undefined) kpis.targetReach = reach;
  const imp = parseCount(draft.targetImpressions);
  if (imp !== undefined) kpis.targetImpressions = imp;
  const clicks = parseCount(draft.targetClicks);
  if (clicks !== undefined) kpis.targetClicks = clicks;
  const eng = parseCount(draft.targetEngagements);
  if (eng !== undefined) kpis.targetEngagements = eng;
  const leads = parseCount(draft.targetLeads);
  if (leads !== undefined) kpis.targetLeads = leads;
  const conv = parseCount(draft.targetConversions);
  if (conv !== undefined) kpis.targetConversions = conv;

  if (draft.targetRoas) {
    const parsedRoas = parseFloat(draft.targetRoas.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsedRoas) && parsedRoas > 0 && parsedRoas <= 1000) {
      kpis.targetRoas = parsedRoas.toFixed(2);
    }
  }

  if (draft.targetRevenue) {
    const rev = parseFloat(draft.targetRevenue.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(rev) && rev > 0) {
      kpis.targetRevenue = { amount: rev.toFixed(2), currency: "INR" };
    }
  }

  // Audience
  const audience: AudiencePayload = {};
  let minAge = draft.ageMin ? parseInt(draft.ageMin.replace(/[^0-9]/g, ""), 10) : undefined;
  let maxAge = draft.ageMax ? parseInt(draft.ageMax.replace(/[^0-9]/g, ""), 10) : undefined;
  if (minAge !== undefined && (minAge < 13 || minAge > 65)) minAge = Math.min(Math.max(minAge, 13), 65);
  if (maxAge !== undefined && (maxAge < 13 || maxAge > 65)) maxAge = Math.min(Math.max(maxAge, 13), 65);
  if (minAge !== undefined && maxAge !== undefined && maxAge < minAge) maxAge = minAge;
  if (minAge !== undefined) audience.ageMin = minAge;
  if (maxAge !== undefined) audience.ageMax = maxAge;

  // Genders: allowlist ["MALE", "FEMALE", "NON_BINARY", "ALL"]
  if (draft.gender) {
    const g = draft.gender.trim().toLowerCase();
    if (g === "all") audience.genders = ["ALL"];
    else if (g === "men" || g === "male") audience.genders = ["MALE"];
    else if (g === "women" || g === "female") audience.genders = ["FEMALE"];
    else if (g.includes("non-binary") || g.includes("nonbinary")) audience.genders = ["NON_BINARY"];
    else audience.genders = ["ALL"];
  }

  if (Array.isArray(draft.regions) && draft.regions.length > 0) {
    audience.locations = [...new Set(draft.regions.map((r) => r.trim()).filter(Boolean))].slice(0, 50);
  }

  if (Array.isArray(draft.languages) && draft.languages.length > 0) {
    const codes: string[] = [];
    for (const lang of draft.languages) {
      const trimmed = lang.trim().toLowerCase();
      const code = LANGUAGE_CODE_MAP[trimmed] || (/^[a-z]{2,3}$/.test(trimmed) ? trimmed : undefined);
      if (code && !codes.includes(code)) codes.push(code);
    }
    if (codes.length > 0) audience.languages = codes.slice(0, 20);
  }

  if (Array.isArray(draft.interests) && draft.interests.length > 0) {
    audience.interests = [...new Set(draft.interests.map((i) => i.trim()).filter(Boolean))].slice(0, 50);
  }

  const payload: CreateCampaignPayload = {
    name,
    budget,
    startDate,
    endDate,
    campaignMode,
    objective,
    category,
    campaignType: draft.type?.trim() || undefined,
    description,
    internalNotes,
    tags,
    channels: channelCodes.slice(0, 5),
    biddingStrategy,
    kpis: Object.keys(kpis).length > 0 ? kpis : undefined,
    audience: Object.keys(audience).length > 0 ? audience : undefined,
  };

  return payload;
}
