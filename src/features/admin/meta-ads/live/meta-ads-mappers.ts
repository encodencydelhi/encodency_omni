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
import type { ApiActivity, ApiAd, ApiDeliveryIssue, ApiAdSet, ApiAudience, ApiCampaign, ApiCreative, ApiForm, ApiLead, ApiMetrics, ApiSnapshot, DatasetState } from "./meta-ads-api";

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

/** Meta's `disable_reason` codes, in plain words. */
export const DISABLE_REASON: Record<number, string> = {
  1: "Ads integrity policy",
  2: "Ads IP review",
  3: "Payment risk review",
  4: "Gray account shut down",
  5: "Ads AFC review",
  6: "Business integrity review",
  7: "Permanently closed",
  8: "Unused reseller account",
  9: "Unused account",
  10: "Umbrella ad account",
  11: "Business Manager integrity policy",
  12: "Misrepresented ad account",
  13: "Legal entity de-shared",
  14: "Under review",
  15: "Compromised ad account",
};

/** What Meta's delivery status means and what to do about it. */
const DELIVERY_STATUS: Record<string, { label: string; advice: string }> = {
  WITH_ISSUES: { label: "With issues", advice: "Open it in Meta Ads Manager, read the problem Meta lists and fix it. Delivery resumes after Meta re-checks it." },
  DISAPPROVED: { label: "Not approved", advice: "Edit the ad so it meets Meta's advertising policies, or ask for a review in Ads Manager." },
  PENDING_BILLING_INFO: { label: "Billing information needed", advice: "Add or fix a payment method in Meta Business Settings → Payments. Nothing delivers until billing is valid." },
};
const FALLBACK_ADVICE = "Open it in Meta Ads Manager for the full reason.";
const STALE_PIXEL_DAYS = 7;

const titleOf = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function adsManagerUrl(snapshot: ApiSnapshot, section: "campaigns" | "adsets" | "ads", id: string): string {
  const account = (snapshot.account.accountId ?? snapshot.account.id).replace(/^act_/, "");
  const param = { campaigns: "selected_campaign_ids", adsets: "selected_adset_ids", ads: "selected_ad_ids" }[section];
  return `https://adsmanager.facebook.com/adsmanager/manage/${section}?act=${account}&${param}=${id}`;
}

function firstReason(issues: ApiDeliveryIssue[] | undefined): string | null {
  const first = issues?.[0];
  return first ? `${first.summary}${first.message ? ` — ${first.message}` : ""}` : null;
}

function deriveIssues(snapshot: ApiSnapshot, campaigns: Campaign[], adSets: AdSet[], ads: Ad[]): Issue[] {
  void adSets;
  void ads;
  const issues: Issue[] = [];
  const at = snapshot.syncedAt;
  const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? null;
  const flagged = (status: string) => status === "rejected" || status === "error";

  if (snapshot.account.status && snapshot.account.status !== "ACTIVE") {
    const reason = snapshot.account.disableReason ? (DISABLE_REASON[snapshot.account.disableReason] ?? `Code ${snapshot.account.disableReason}`) : null;
    issues.push({
      id: "account-status",
      severity: "blocking",
      kind: "Ad account",
      title: `Ad account is ${titleOf(snapshot.account.status).toLowerCase()}`,
      detail: reason ? `Meta reports: ${reason}. No ads deliver until it is resolved.` : "Meta is not delivering ads for this account until its status is resolved in Business Settings.",
      reasons: reason ? [{ summary: reason, message: null }] : [],
      statusLabel: titleOf(snapshot.account.status),
      advice: "Open Meta Business Settings → Ad accounts → Account quality, resolve what is listed, then refresh here.",
      externalHref: "https://business.facebook.com/settings/ad-accounts",
      entityLabel: snapshot.account.name,
      entityHref: `${ADS_ROOT}/assets#ad-account`,
      campaign: null,
      detected: at,
      resolved: false,
      actionLabel: "View account",
      actionHref: `${ADS_ROOT}/assets#ad-account`,
    });
  }

  for (const row of snapshot.ads.data) {
    const delivery = row.effectiveStatus ? DELIVERY_STATUS[row.effectiveStatus] : undefined;
    if (flagged(row.status)) {
      const rejected = row.status === "rejected";
      issues.push({
        id: `ad-${row.id}`,
        severity: rejected ? "policy" : "blocking",
        kind: "Ad",
        title: rejected ? "Ad was not approved" : delivery ? `Ad: ${delivery.label.toLowerCase()}` : "Ad has delivery issues",
        detail: row.reviewNote ?? delivery?.advice ?? "Meta flagged this ad. Open it in Ads Manager for the full reason.",
        reasons: (row.issues ?? []).map(({ summary, message }) => ({ summary, message })),
        statusLabel: delivery?.label ?? (row.effectiveStatus ? titleOf(row.effectiveStatus) : null),
        advice: delivery?.advice ?? FALLBACK_ADVICE,
        externalHref: adsManagerUrl(snapshot, "ads", row.id),
        entityLabel: row.name,
        entityHref: `${ADS_ROOT}/ads/${row.id}`,
        campaign: campaignName(row.campaignId),
        detected: row.lastEdited || at,
        resolved: false,
        actionLabel: "Open ad",
        actionHref: `${ADS_ROOT}/ads/${row.id}`,
      });
    } else if (row.qualityRanking === "Below average" && row.metrics.impressions > 0 && row.status === "active") {
      issues.push({
        id: `ad-quality-${row.id}`,
        severity: "warning",
        kind: "Ad",
        title: "Ad quality ranking is below average",
        detail: "Meta ranks this ad below ads competing for the same audience. It can raise your cost per result.",
        reasons: [{ summary: "Quality ranking: below average", message: row.engagementRanking ? `Engagement ranking: ${row.engagementRanking.toLowerCase()}` : null }],
        statusLabel: "Active",
        advice: "Try a clearer image or video, shorter text, or a tighter audience, then compare results.",
        externalHref: adsManagerUrl(snapshot, "ads", row.id),
        entityLabel: row.name,
        entityHref: `${ADS_ROOT}/ads/${row.id}`,
        campaign: campaignName(row.campaignId),
        detected: at,
        resolved: false,
        actionLabel: "Open ad",
        actionHref: `${ADS_ROOT}/ads/${row.id}`,
      });
    }
  }

  for (const row of snapshot.campaigns.data) {
    if (!flagged(row.status)) continue;
    const delivery = row.effectiveStatus ? DELIVERY_STATUS[row.effectiveStatus] : undefined;
    issues.push({
      id: `campaign-${row.id}`,
      severity: "blocking",
      kind: "Campaign",
      title: delivery ? `Campaign: ${delivery.label.toLowerCase()}` : "Campaign has delivery issues",
      detail: firstReason(row.issues) ?? delivery?.advice ?? "Meta reports a problem with this campaign (billing or review).",
      reasons: (row.issues ?? []).map(({ summary, message }) => ({ summary, message })),
      statusLabel: delivery?.label ?? (row.effectiveStatus ? titleOf(row.effectiveStatus) : null),
      advice: delivery?.advice ?? FALLBACK_ADVICE,
      externalHref: adsManagerUrl(snapshot, "campaigns", row.id),
      entityLabel: row.name,
      entityHref: `${ADS_ROOT}/campaigns/${row.id}`,
      campaign: row.name,
      detected: row.lastEdited || at,
      resolved: false,
      actionLabel: "Open campaign",
      actionHref: `${ADS_ROOT}/campaigns/${row.id}`,
    });
  }

  for (const row of snapshot.adSets.data) {
    if (!flagged(row.status)) continue;
    const delivery = row.effectiveStatus ? DELIVERY_STATUS[row.effectiveStatus] : undefined;
    issues.push({
      id: `adset-${row.id}`,
      severity: "warning",
      kind: "Ad set",
      title: delivery ? `Ad set: ${delivery.label.toLowerCase()}` : "Ad set has delivery issues",
      detail: firstReason(row.issues) ?? delivery?.advice ?? "Meta reports a problem with this ad set.",
      reasons: (row.issues ?? []).map(({ summary, message }) => ({ summary, message })),
      statusLabel: delivery?.label ?? (row.effectiveStatus ? titleOf(row.effectiveStatus) : null),
      advice: delivery?.advice ?? FALLBACK_ADVICE,
      externalHref: adsManagerUrl(snapshot, "adsets", row.id),
      entityLabel: row.name,
      entityHref: `${ADS_ROOT}/adsets/${row.id}`,
      campaign: campaignName(row.campaignId),
      detected: row.lastEdited || at,
      resolved: false,
      actionLabel: "Open ad set",
      actionHref: `${ADS_ROOT}/adsets/${row.id}`,
    });
  }

  for (const audience of snapshot.audiences.data) {
    if (audience.status !== "Sync failed" && audience.status !== "Too small") continue;
    const failed = audience.status === "Sync failed";
    issues.push({
      id: `audience-${audience.id}`,
      severity: "warning",
      kind: "Audience",
      title: failed ? "Audience failed to update" : "Audience is too small to deliver",
      detail: failed ? "Meta could not refresh this audience, so ads using it may not reach the right people." : "Meta needs a larger audience before it will deliver ads to it.",
      reasons: [{ summary: audience.status, message: null }],
      statusLabel: audience.status,
      advice: failed ? "Re-upload or re-create the audience source in Meta Audiences." : "Widen the audience (more sources, a higher lookalike percentage) in Meta Audiences.",
      externalHref: "https://adsmanager.facebook.com/adsmanager/audiences",
      entityLabel: audience.name,
      entityHref: `${ADS_ROOT}/audiences`,
      campaign: null,
      detected: audience.lastSync ?? at,
      resolved: false,
      actionLabel: "View audiences",
      actionHref: `${ADS_ROOT}/audiences`,
    });
  }

  // A pixel that stopped firing only matters when something is running that should be tracked by it.
  const running = snapshot.campaigns.data.some((c) => c.status === "active" || c.status === "learning");
  if (running) {
    for (const pixel of snapshot.pixels.data) {
      const last = pixel.lastFiredAt ? Date.parse(pixel.lastFiredAt) : NaN;
      const days = Number.isFinite(last) ? Math.floor((Date.parse(at) - last) / 86_400_000) : null;
      if (days !== null && days < STALE_PIXEL_DAYS) continue;
      issues.push({
        id: `pixel-${pixel.id}`,
        severity: "warning",
        kind: "Pixel",
        title: days === null ? "Pixel has never fired" : `Pixel has not fired for ${days} days`,
        detail: "Conversions on your website are not being tracked, so website-conversion campaigns cannot optimise.",
        reasons: [{ summary: days === null ? "No events received" : `Last event ${days} days ago`, message: null }],
        statusLabel: days === null ? "Never fired" : "Inactive",
        advice: "Check that the Meta Pixel code is still installed on the site (Events Manager → Test events).",
        externalHref: "https://business.facebook.com/events_manager2",
        entityLabel: pixel.name ?? pixel.id,
        entityHref: `${ADS_ROOT}/assets`,
        campaign: null,
        detected: pixel.lastFiredAt ?? at,
        resolved: false,
        actionLabel: "View assets",
        actionHref: `${ADS_ROOT}/assets`,
      });
    }
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
    if (state === "live" || state === "empty") continue;
    const label = DATASET_LABEL[key] ?? key;
    const permission = state === "permission_required";
    issues.push({
      id: `${permission ? "permission" : state}-${key}`,
      severity: permission ? "connection" : "warning",
      kind: "Connection",
      title: permission ? `${label} need more Meta permissions` : state === "rate_limited" ? `Meta is limiting requests — ${label.toLowerCase()} may be incomplete` : `${label} could not be loaded`,
      detail: permission ? "Meta refused this data. Reconnect Meta and approve the ads and lead permissions." : state === "rate_limited" ? "Meta temporarily blocked further reads for this ad account. The data returns on its own in a few minutes." : "Meta did not return this data. It is retried on the next refresh.",
      reasons: [{ summary: permission ? "Permission missing" : state === "rate_limited" ? "Rate limited by Meta" : "Temporarily unavailable", message: null }],
      statusLabel: titleOf(state),
      advice: permission ? "Open Meta settings and reconnect, keeping every permission ticked." : "Wait a few minutes and use Refresh. Repeated refreshes make Meta's limit last longer.",
      externalHref: null,
      entityLabel: "Meta connection",
      entityHref: "/admin/meta/settings",
      campaign: null,
      detected: at,
      resolved: false,
      actionLabel: permission ? "Reconnect Meta" : "Open settings",
      actionHref: "/admin/meta/settings",
    });
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
