import type {
  ActivityEntry,
  Ad,
  AdSet,
  Audience,
  Campaign,
  ConnectedAsset,
  Creative,
  InstantForm,
  Issue,
  Lead,
  Metrics,
  Placement,
  Platform,
} from "../types";
import type { ApiActivity, ApiAd, ApiAdSet, ApiAudience, ApiCampaign, ApiCreative, ApiForm, ApiLead, ApiMetrics, ApiSnapshot, DatasetState } from "./meta-ads-api";

/**
 * Backend DTOs -> the view models every Ads page already renders.
 *
 * Rules: money is stored in paise/minor units by the pages, so Graph's major
 * unit spend is multiplied here; a field Meta does not provide becomes an empty
 * value ("", [], 0 or null) and is never invented. The only derived values are
 * ones computed from real rows (a campaign without its own budget reports the
 * sum of its ad sets' budgets, a creative's metrics are the sum of its ads).
 */

export const ADS_ROOT = "/admin/meta/ads";

const minor = (value: number | null | undefined): number => Math.round((value ?? 0) * 100);

function metrics(m: ApiMetrics): Metrics {
  return { spend: minor(m.spend), impressions: m.impressions, reach: m.reach, clicks: m.clicks, leads: m.leads };
}

const PLATFORM_LABEL: Record<Platform, string> = { facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network" };

const sumBudget = (rows: AdSet[], type: "Daily" | "Lifetime") => rows.filter((s) => s.budgetType === type && s.budgetSource === "Ad set budget").reduce((total, s) => total + s.budget, 0);

export interface AdsData {
  campaigns: Campaign[];
  adSets: AdSet[];
  ads: Ad[];
  instantForms: InstantForm[];
  leads: Lead[];
  audiences: Audience[];
  creatives: Creative[];
  issues: Issue[];
  activityLog: ActivityEntry[];
  connectedAssets: ConnectedAsset[];
  trendSeries: Array<{ date: string; label: string; spend: number; leads: number; cpl: number; impressions: number; clicks: number }>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function toAdSet(raw: ApiAdSet, campaignsById: Map<string, ApiCampaign>, audienceKinds: Map<string, ApiAudience["kind"]>): AdSet {
  const parent = campaignsById.get(raw.campaignId);
  const campaignOwnsBudget = parent?.budget != null;
  const customAudiences = raw.customAudiences;
  return {
    id: raw.id,
    campaignId: raw.campaignId,
    name: raw.name,
    status: raw.status,
    conversionLocation: raw.conversionLocation ?? "",
    performanceGoal: raw.performanceGoal ?? "",
    attribution: raw.attribution ?? "",
    budgetSource: campaignOwnsBudget ? "Campaign budget" : "Ad set budget",
    budgetType: raw.budgetType ?? "Daily",
    budget: campaignOwnsBudget ? 0 : minor(raw.budget),
    schedule: raw.end ? `${raw.start ?? ""} → ${raw.end}`.trim() : raw.start ? `From ${raw.start}` : "",
    audienceName: customAudiences[0] ?? (raw.interests.length ? raw.interests.slice(0, 2).join(", ") : "Targeting"),
    // Meta's delivery estimate is a separate API; the size is not known here.
    audienceSize: [0, 0],
    locations: raw.locations,
    ageRange: raw.ageRange ?? "",
    gender: raw.gender,
    languages: raw.languages,
    interests: raw.interests,
    customAudiences: customAudiences.filter((name) => audienceKinds.get(name) !== "lookalike"),
    lookalikes: customAudiences.filter((name) => audienceKinds.get(name) === "lookalike"),
    exclusions: raw.exclusions,
    audienceExpansion: false,
    placements: raw.placements.map<Placement>((platform) => ({ placement: PLATFORM_LABEL[platform], platform, enabled: true, spend: 0, leads: 0 })),
    metrics: metrics(raw.metrics),
    lastEdited: raw.lastEdited ?? "",
  };
}

function toCampaign(raw: ApiCampaign, adSets: AdSet[]): Campaign {
  const children = adSets.filter((s) => s.campaignId === raw.id);
  const ownBudget = raw.budget != null;
  const budgetType = raw.budgetType ?? children[0]?.budgetType ?? "Daily";
  const platforms = Array.from(new Set(children.flatMap((s) => s.placements.map((p) => p.platform))));
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    objective: raw.objective ?? "",
    buyingType: raw.buyingType ?? "",
    budgetType,
    budget: ownBudget ? minor(raw.budget) : sumBudget(children, budgetType),
    bidStrategy: raw.bidStrategy ?? "",
    specialCategory: raw.specialCategory.length ? raw.specialCategory.join(", ") : "None",
    optimization: children[0]?.performanceGoal ?? "",
    platforms,
    start: raw.start ?? "",
    end: raw.end,
    owner: "",
    created: raw.created ?? "",
    lastEdited: raw.lastEdited ?? "",
    lastEditedBy: "",
    spendCap: minor(raw.spendCap),
    metrics: metrics(raw.metrics),
  };
}

function toAd(raw: ApiAd, pageNames: Map<string, string>, instagram: Map<string, string>): Ad {
  return {
    id: raw.id,
    adSetId: raw.adSetId,
    campaignId: raw.campaignId,
    name: raw.name,
    status: raw.status,
    format: raw.format ?? "Single Image",
    creativeId: raw.creativeId ?? "",
    formId: raw.formId,
    destination: raw.destination ?? "",
    primaryText: raw.primaryText ?? "",
    headline: raw.headline ?? "",
    description: raw.description ?? "",
    cta: raw.cta ?? "",
    page: (raw.pageId && pageNames.get(raw.pageId)) || raw.pageId || "",
    instagramAccount: (raw.instagramActorId && instagram.get(raw.instagramActorId)) || raw.instagramActorId || "",
    pixel: "",
    pixelEvents: [],
    utm: raw.utm ?? "",
    qualityRanking: raw.qualityRanking,
    engagementRanking: raw.engagementRanking,
    conversionRanking: raw.conversionRanking,
    reviewNote: raw.reviewNote,
    metrics: metrics(raw.metrics),
    lastEdited: raw.lastEdited ?? "",
  };
}

function toCreatives(rows: ApiCreative[], ads: Ad[]): Creative[] {
  const withLeads = ads.filter((a) => a.metrics.leads > 0);
  const avgCpl = withLeads.length ? withLeads.reduce((t, a) => t + a.metrics.spend, 0) / withLeads.reduce((t, a) => t + a.metrics.leads, 0) : 0;
  return rows.map((raw) => {
    const using = ads.filter((a) => a.creativeId === raw.id);
    const m = using.reduce<Metrics>(
      (t, a) => ({ spend: t.spend + a.metrics.spend, impressions: t.impressions + a.metrics.impressions, reach: t.reach + a.metrics.reach, clicks: t.clicks + a.metrics.clicks, leads: t.leads + a.metrics.leads }),
      { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 },
    );
    const cpl = m.leads ? m.spend / m.leads : 0;
    // Derived only from real spend/leads: relative to the account's own average cost per lead.
    const performance: Creative["performance"] =
      using.length === 0 ? "Not used" : cpl && avgCpl && cpl <= avgCpl * 0.8 ? "Top performer" : cpl && avgCpl && cpl >= avgCpl * 1.3 ? "Underperforming" : "Healthy";
    return {
      id: raw.id,
      name: raw.name ?? raw.headline ?? raw.id,
      type: raw.format === "Video" || raw.hasVideo ? "Video" : raw.format === "Carousel" ? "Carousel" : "Image",
      ratio: "",
      dimensions: "",
      fileSize: "",
      src: raw.thumbnailUrl ?? "",
      usedInAds: using.map((a) => a.id),
      performance,
      uploaded: "",
      metrics: m,
    };
  });
}

function toAudience(raw: ApiAudience, adSets: AdSet[], syncedAt: string): Audience {
  const size = raw.sizeLower != null && raw.sizeUpper != null ? Math.round((raw.sizeLower + raw.sizeUpper) / 2) : (raw.sizeUpper ?? raw.sizeLower ?? 0);
  return {
    id: raw.id,
    name: raw.name,
    kind: raw.kind,
    source: raw.source ?? "",
    size,
    matchRate: null,
    similarity: raw.similarity,
    country: raw.country,
    sourceAudience: null,
    locations: raw.locations.length ? raw.locations.join(", ") : "—",
    ageRange: "—",
    gender: "—",
    interests: [],
    usedIn: adSets.filter((s) => [...s.customAudiences, ...s.lookalikes].includes(raw.name)).map((s) => s.id),
    status: raw.status,
    lastSync: raw.lastSync ?? syncedAt,
  };
}

function toForm(raw: ApiForm): InstantForm {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    type: "",
    language: raw.language ?? "",
    introHeadline: "",
    introBody: "",
    questions: raw.questions.map((q) => ({ id: q.id, label: q.label, type: q.type, required: false, views: 0, completions: 0 })),
    qualification: [],
    privacyUrl: raw.privacyUrl,
    thankYouHeadline: "",
    thankYouCta: "",
    submissions: raw.submissions ?? 0,
    opens: 0,
    qualified: 0,
    lastUpdated: raw.created ?? "",
  };
}

export function toLead(raw: ApiLead): Lead {
  const submittedAt = raw.submittedAt ?? "";
  return {
    id: raw.id,
    name: raw.name ?? raw.email ?? raw.phone ?? "Unnamed lead",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    city: raw.city ?? "",
    company: raw.company ?? "",
    campaignId: raw.campaignId ?? "",
    adSetId: raw.adSetId ?? "",
    adId: raw.adId ?? "",
    formId: raw.formId ?? "",
    // Meta has no pipeline stage; every received lead starts as "New" until a CRM stage exists.
    stage: "New",
    score: 0,
    owner: "",
    submittedAt,
    lastActivity: submittedAt,
    responseMinutes: null,
    answers: raw.answers,
    consent: "",
    timeline: submittedAt ? [{ at: submittedAt, actor: "Meta", type: "Lead", text: `Lead submitted through ${raw.isOrganic ? "an organic" : "an instant"} form${raw.platform ? ` on ${raw.platform}` : ""}` }] : [],
    notes: [],
    tasks: [],
    appointments: [],
    documents: [],
  };
}

function entityHref(entry: ApiActivity, snapshot: { campaigns: Set<string>; adSets: Set<string>; ads: Set<string> }): string {
  const id = entry.entityId;
  if (id && entry.entityType === "Campaign" && snapshot.campaigns.has(id)) return `${ADS_ROOT}/campaigns/${id}`;
  if (id && entry.entityType === "Ad Set" && snapshot.adSets.has(id)) return `${ADS_ROOT}/adsets/${id}`;
  if (id && entry.entityType === "Ad" && snapshot.ads.has(id)) return `${ADS_ROOT}/ads/${id}`;
  if (entry.entityType === "Audience") return `${ADS_ROOT}/audiences`;
  return `${ADS_ROOT}/assets`;
}

const DATASET_LABEL: Record<string, string> = {
  campaigns: "Campaigns",
  adSets: "Ad sets",
  ads: "Ads",
  audiences: "Audiences",
  forms: "Instant forms",
  creatives: "Creatives",
  activity: "Activity log",
};

function deriveIssues(snapshot: ApiSnapshot, campaigns: Campaign[], adSets: AdSet[], ads: Ad[]): Issue[] {
  const issues: Issue[] = [];
  const at = snapshot.syncedAt;
  const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? null;

  if (snapshot.account.status && snapshot.account.status !== "ACTIVE") {
    issues.push({
      id: "account-status",
      severity: "blocking",
      title: `Ad account is ${snapshot.account.status.toLowerCase().replace(/_/g, " ")}`,
      detail: "Meta is not delivering ads for this account until its status is resolved in Business Settings.",
      entityLabel: snapshot.account.name,
      entityHref: `${ADS_ROOT}/assets#ad-account`,
      campaign: null,
      detected: at,
      resolved: false,
      actionLabel: "View account",
      actionHref: `${ADS_ROOT}/assets#ad-account`,
    });
  }

  for (const ad of ads) {
    if (ad.status !== "rejected" && ad.status !== "error") continue;
    issues.push({
      id: `ad-${ad.id}`,
      severity: ad.status === "rejected" ? "policy" : "blocking",
      title: ad.status === "rejected" ? "Ad was not approved" : "Ad has delivery issues",
      detail: ad.reviewNote ?? "Meta flagged this ad. Open it in Ads Manager for the full reason.",
      entityLabel: ad.name,
      entityHref: `${ADS_ROOT}/ads/${ad.id}`,
      campaign: campaignName(ad.campaignId),
      detected: ad.lastEdited || at,
      resolved: false,
      actionLabel: "Open ad",
      actionHref: `${ADS_ROOT}/ads/${ad.id}`,
    });
  }
  for (const campaign of campaigns) {
    if (campaign.status !== "rejected" && campaign.status !== "error") continue;
    issues.push({
      id: `campaign-${campaign.id}`,
      severity: "blocking",
      title: "Campaign has delivery issues",
      detail: "Meta reports a problem with this campaign (billing or review).",
      entityLabel: campaign.name,
      entityHref: `${ADS_ROOT}/campaigns/${campaign.id}`,
      campaign: campaign.name,
      detected: campaign.lastEdited || at,
      resolved: false,
      actionLabel: "Open campaign",
      actionHref: `${ADS_ROOT}/campaigns/${campaign.id}`,
    });
  }
  for (const set of adSets) {
    if (set.status !== "rejected" && set.status !== "error") continue;
    issues.push({
      id: `adset-${set.id}`,
      severity: "warning",
      title: "Ad set has delivery issues",
      detail: "Meta reports a problem with this ad set.",
      entityLabel: set.name,
      entityHref: `${ADS_ROOT}/adsets/${set.id}`,
      campaign: campaignName(set.campaignId),
      detected: set.lastEdited || at,
      resolved: false,
      actionLabel: "Open ad set",
      actionHref: `${ADS_ROOT}/adsets/${set.id}`,
    });
  }

  const states: Array<[string, DatasetState]> = [
    ["campaigns", snapshot.campaigns.state],
    ["adSets", snapshot.adSets.state],
    ["ads", snapshot.ads.state],
    ["audiences", snapshot.audiences.state],
    ["forms", snapshot.forms.state],
    ["creatives", snapshot.creatives.state],
    ["activity", snapshot.activity.state],
  ];
  for (const [key, state] of states) {
    if (state === "permission_required") {
      issues.push({
        id: `permission-${key}`,
        severity: "connection",
        title: `${DATASET_LABEL[key]} need more Meta permissions`,
        detail: "Meta refused this data. Reconnect Meta and approve the ads and lead permissions.",
        entityLabel: "Meta connection",
        entityHref: "/admin/integrations",
        campaign: null,
        detected: at,
        resolved: false,
        actionLabel: "Reconnect Meta",
        actionHref: "/admin/integrations",
      });
    }
  }
  return issues;
}

export function mapSnapshot(snapshot: ApiSnapshot, apiLeads: ApiLead[]): AdsData {
  const campaignsById = new Map(snapshot.campaigns.data.map((c) => [c.id, c] as const));
  const audienceKinds = new Map(snapshot.audiences.data.map((a) => [a.name, a.kind] as const));
  const adSets = snapshot.adSets.data.map((s) => toAdSet(s, campaignsById, audienceKinds));
  const campaigns = snapshot.campaigns.data.map((c) => toCampaign(c, adSets));

  // A campaign-level budget means its ad sets share it; keep that visible on each ad set.
  const pageNames = new Map(snapshot.assets.data.map((p) => [p.id, p.name] as const));
  const instagram = new Map(snapshot.assets.data.flatMap((p) => (p.instagram ? [[p.instagram.id, p.instagram.username ? `@${p.instagram.username}` : p.instagram.id] as const] : [])));
  const ads = snapshot.ads.data.map((a) => toAd(a, pageNames, instagram));

  const known = { campaigns: new Set(campaigns.map((c) => c.id)), adSets: new Set(adSets.map((s) => s.id)), ads: new Set(ads.map((a) => a.id)) };
  const at = snapshot.syncedAt;

  const assets: ConnectedAsset[] = [
    {
      id: "ad-account",
      group: "Ad Account",
      name: snapshot.account.name,
      handle: [snapshot.account.currency, snapshot.account.timezone].filter(Boolean).join(" · "),
      assetId: snapshot.account.id,
      connectedOn: "",
      permissions: [],
      missingPermissions: [],
      lastSync: at,
      status: snapshot.account.status === "ACTIVE" || snapshot.account.status === null ? "Connected" : "Sync Failed",
    },
  ];
  for (const page of snapshot.assets.data) {
    assets.push({ id: `page-${page.id}`, group: "Facebook Page", name: page.name, handle: "", assetId: page.id, connectedOn: "", permissions: [], missingPermissions: [], lastSync: at, status: "Connected" });
    if (page.instagram) {
      assets.push({
        id: `instagram-${page.instagram.id}`,
        group: "Instagram Business",
        name: page.instagram.username ? `@${page.instagram.username}` : page.instagram.id,
        handle: page.instagram.username ? `@${page.instagram.username}` : "",
        assetId: page.instagram.id,
        connectedOn: "",
        permissions: [],
        missingPermissions: [],
        lastSync: at,
        status: "Connected",
      });
    }
  }
  for (const pixel of snapshot.pixels.data) {
    assets.push({ id: `pixel-${pixel.id}`, group: "Pixel / Data Source", name: pixel.name ?? pixel.id, handle: "", assetId: pixel.id, connectedOn: "", permissions: [], missingPermissions: [], lastSync: pixel.lastFiredAt ?? at, status: "Connected" });
  }

  return {
    campaigns,
    adSets,
    ads,
    instantForms: snapshot.forms.data.map(toForm),
    leads: apiLeads.map(toLead),
    audiences: snapshot.audiences.data.map((a) => toAudience(a, adSets, at)),
    creatives: toCreatives(snapshot.creatives.data, ads),
    issues: deriveIssues(snapshot, campaigns, adSets, ads),
    activityLog: snapshot.activity.data.map<ActivityEntry>((entry) => ({
      id: entry.id,
      at: entry.at ?? "",
      user: entry.user ?? "",
      action: entry.action,
      entityType: entry.entityType,
      entityLabel: entry.entityLabel ?? "",
      entityHref: entityHref(entry, known),
      campaign: entry.entityType === "Campaign" ? (entry.entityLabel ?? null) : null,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      source: "Ads Manager",
    })),
    connectedAssets: assets,
    trendSeries: snapshot.trend.data.map((row) => ({
      date: row.date,
      label: dayLabel(row.date),
      spend: minor(row.spend),
      leads: row.leads,
      cpl: row.leads ? Math.round(minor(row.spend) / row.leads) : 0,
      impressions: row.impressions,
      clicks: row.clicks,
    })),
  };
}
