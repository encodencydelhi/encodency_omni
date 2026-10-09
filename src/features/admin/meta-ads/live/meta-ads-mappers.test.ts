import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ApiSnapshot } from "./meta-ads-api";
import { mapSnapshot, toLead } from "./meta-ads-mappers";

const metrics = (spend: number, leads = 0) => ({ spend, impressions: 100, reach: 80, clicks: 10, leads });
const ds = <T,>(data: T, state: "live" | "empty" | "permission_required" = "live") => ({ state, data, reason: null });

function snapshot(overrides: Partial<ApiSnapshot> = {}): ApiSnapshot {
  return {
    period: "30d",
    syncedAt: "2026-10-07T10:00:00.000Z",
    account: { id: "act_1", accountId: "1", name: "Main", currency: "INR", timezone: "Asia/Kolkata", status: "ACTIVE", disableReason: null, amountSpent: null, business: null },
    totals: metrics(120.5, 4),
    campaigns: ds([
      { id: "c1", name: "Own budget", status: "active", objective: "Outcome Leads", buyingType: "Auction", budgetType: "Daily", budget: 500, bidStrategy: null, specialCategory: [], start: "2026-09-01", end: null, created: "2026-08-30T00:00:00Z", lastEdited: "2026-10-01T00:00:00Z", spendCap: null, metrics: metrics(100, 3) },
      { id: "c2", name: "Ad set budgets", status: "rejected", objective: null, buyingType: null, budgetType: null, budget: null, bidStrategy: null, specialCategory: ["HOUSING"], start: null, end: null, created: null, lastEdited: null, spendCap: 1000, metrics: metrics(20.5, 1) },
    ]),
    adSets: ds([
      { id: "s1", campaignId: "c1", name: "Set A", status: "active", conversionLocation: "Website", performanceGoal: "Leads", attribution: null, budgetType: "Daily", budget: null, start: null, end: null, locations: ["IN"], ageRange: "25-45", gender: "All", languages: [], interests: ["Yoga"], customAudiences: ["Buyers", "LAL 1%"], exclusions: [], placements: ["facebook", "instagram"], pageId: "55", lastEdited: null, metrics: metrics(100, 3) },
      { id: "s2", campaignId: "c2", name: "Set B", status: "paused", conversionLocation: null, performanceGoal: null, attribution: null, budgetType: "Daily", budget: 300, start: null, end: null, locations: [], ageRange: null, gender: "All", languages: [], interests: [], customAudiences: [], exclusions: [], placements: [], pageId: null, lastEdited: null, metrics: metrics(20.5, 1) },
      { id: "s3", campaignId: "c2", name: "Set C", status: "paused", conversionLocation: null, performanceGoal: null, attribution: null, budgetType: "Daily", budget: 200, start: null, end: null, locations: [], ageRange: null, gender: "All", languages: [], interests: [], customAudiences: [], exclusions: [], placements: [], pageId: null, lastEdited: null, metrics: metrics(0) },
    ]),
    ads: ds([
      { id: "a1", adSetId: "s1", campaignId: "c1", name: "Ad 1", status: "rejected", format: null, creativeId: "cr1", thumbnailUrl: null, destination: null, primaryText: null, headline: null, description: null, cta: null, pageId: "55", instagramActorId: null, utm: null, formId: "f1", qualityRanking: null, engagementRanking: "Average", conversionRanking: null, reviewNote: "Policy", lastEdited: "2026-10-02T00:00:00Z", metrics: metrics(100, 3) },
    ]),
    creatives: ds([
      { id: "cr1", name: null, format: "Video", thumbnailUrl: "https://x.test/t.jpg", primaryText: null, headline: "Hello", hasVideo: true },
      { id: "cr2", name: "Spare", format: "Single Image", thumbnailUrl: null, primaryText: null, headline: null, hasVideo: false },
    ]),
    audiences: ds([
      { id: "au1", name: "Buyers", kind: "custom", source: "Customer List", sizeLower: 1000, sizeUpper: 2000, similarity: null, country: null, locations: [], status: "Ready", lastSync: null },
      { id: "au2", name: "LAL 1%", kind: "lookalike", source: "Lookalike", sizeLower: null, sizeUpper: 5000, similarity: 1, country: "IN", locations: [], status: "Updating", lastSync: "2026-10-01T00:00:00Z" },
    ]),
    forms: ds([{ id: "f1", name: "Form", status: "active", language: "en_US", questions: [{ id: "email", label: "Email", type: "EMAIL" }], privacyUrl: null, submissions: 12, created: "2026-09-01T00:00:00Z", pageId: "55", pageName: "Page" }]),
    pixels: ds([{ id: "px1", name: "Pixel", lastFiredAt: null }]),
    activity: ds([{ id: "act-1", at: "2026-10-01T00:00:00Z", user: "Owner", action: "Changed campaign budget", entityType: "Campaign", entityId: "c1", entityLabel: "Own budget", oldValue: "100", newValue: "200" }]),
    trend: ds([{ date: "2026-10-01", ...metrics(50, 2) }]),
    assets: ds([{ id: "55", name: "Page", instagram: { id: "99", username: "brand" } }]),
    ...overrides,
  };
}

describe("meta ads snapshot mapper", () => {
  const data = mapSnapshot(snapshot(), []);

  it("converts spend and budgets to paise", () => {
    assert.equal(data.campaigns[0]!.metrics.spend, 10000);
    assert.equal(data.campaigns[0]!.budget, 50000);
    assert.equal(data.trendSeries[0]!.spend, 5000);
    assert.equal(data.trendSeries[0]!.cpl, 2500);
  });

  it("sums ad set budgets when the campaign has none and keeps ad set budgets visible", () => {
    const c2 = data.campaigns.find((c) => c.id === "c2")!;
    assert.equal(c2.budget, 50000);
    assert.equal(c2.specialCategory, "HOUSING");
    const s1 = data.adSets.find((s) => s.id === "s1")!;
    assert.equal(s1.budgetSource, "Campaign budget");
    assert.equal(data.adSets.find((s) => s.id === "s2")!.budgetSource, "Ad set budget");
  });

  it("never invents unavailable fields", () => {
    const c = data.campaigns[0]!;
    assert.equal(c.owner, "");
    assert.equal(c.lastEditedBy, "");
    const ad = data.ads[0]!;
    assert.equal(ad.qualityRanking, null);
    assert.equal(ad.engagementRanking, "Average");
    assert.equal(data.instantForms[0]!.type, "");
  });

  it("splits lookalikes from custom audiences on ad sets and links audiences back", () => {
    const s1 = data.adSets.find((s) => s.id === "s1")!;
    assert.deepEqual(s1.customAudiences, ["Buyers"]);
    assert.deepEqual(s1.lookalikes, ["LAL 1%"]);
    assert.deepEqual(data.audiences.find((a) => a.id === "au1")!.usedIn, ["s1"]);
    assert.equal(data.audiences.find((a) => a.id === "au2")!.size, 5000);
  });

  it("derives creative usage and performance only from real ads", () => {
    const used = data.creatives.find((c) => c.id === "cr1")!;
    assert.deepEqual(used.usedInAds, ["a1"]);
    assert.equal(used.type, "Video");
    assert.equal(used.metrics.spend, 10000);
    assert.equal(data.creatives.find((c) => c.id === "cr2")!.performance, "Not used");
  });

  it("derives issues from rejected entities and refused datasets", () => {
    const refused = mapSnapshot(snapshot({ forms: ds([], "permission_required") }), []);
    const ids = refused.issues.map((i) => i.id);
    assert.ok(ids.includes("ad-a1"));
    assert.ok(ids.includes("campaign-c2"));
    assert.ok(ids.includes("permission-forms"));
    assert.equal(refused.issues.find((i) => i.id === "ad-a1")!.detail, "Policy");
  });

  it("explains why Meta flagged an entity and where to fix it, with Meta's own words", () => {
    const flagged = snapshot({
      ads: ds([
        { id: "a9", adSetId: "s1", campaignId: "c1", name: "Billing ad", status: "error", format: null, creativeId: null, thumbnailUrl: null, destination: null, primaryText: null, headline: null, description: null, cta: null, pageId: null, instagramActorId: null, utm: null, formId: null, qualityRanking: null, engagementRanking: null, conversionRanking: null, reviewNote: null, effectiveStatus: "PENDING_BILLING_INFO", issues: [{ level: "ad", summary: "Payment method missing", message: "Add a payment method" }], lastEdited: "2026-10-02T00:00:00Z", metrics: metrics(0) },
      ]),
    });
    const issue = mapSnapshot(flagged, []).issues.find((i) => i.id === "ad-a9")!;
    assert.equal(issue.kind, "Ad");
    assert.equal(issue.severity, "blocking");
    assert.equal(issue.statusLabel, "Billing information needed");
    assert.deepEqual(issue.reasons, [{ summary: "Payment method missing", message: "Add a payment method" }]);
    assert.match(issue.advice ?? "", /payment method/i);
    assert.equal(issue.externalHref, "https://adsmanager.facebook.com/adsmanager/manage/ads?act=1&selected_ad_ids=a9");
  });

  it("reports a closed ad account with Meta's reason, a stale pixel only while something runs, and a throttled dataset", () => {
    const closed = mapSnapshot(
      snapshot({
        account: { id: "act_1", accountId: "1", name: "Main", currency: "INR", timezone: null, status: "CLOSED", disableReason: 7, amountSpent: null, business: null },
        pixels: ds([{ id: "px1", name: "Pixel", lastFiredAt: "2026-09-01T00:00:00Z" }]),
        audiences: ds([{ id: "au3", name: "Tiny", kind: "custom", source: "Customer List", sizeLower: 1, sizeUpper: 2, similarity: null, country: null, locations: [], status: "Too small", lastSync: null }]),
        adSets: { state: "rate_limited", data: [], reason: "rate_limited" },
      }),
      [],
    );
    const byId = new Map(closed.issues.map((i) => [i.id, i]));
    assert.match(byId.get("account-status")!.detail, /Permanently closed/);
    assert.equal(byId.get("pixel-px1")!.kind, "Pixel");
    assert.equal(byId.get("audience-au3")!.kind, "Audience");
    assert.equal(byId.get("rate_limited-adSets")!.severity, "warning");

    const idle = mapSnapshot(snapshot({ campaigns: ds([]), pixels: ds([{ id: "px1", name: "Pixel", lastFiredAt: null }]) }), []);
    assert.equal(idle.issues.some((i) => i.id === "pixel-px1"), false);
  });

  it("raises a quality warning only for an active ad that ranks below average and has delivered", () => {
    const base = { adSetId: "s1", campaignId: "c1", format: null, creativeId: null, thumbnailUrl: null, destination: null, primaryText: null, headline: null, description: null, cta: null, pageId: null, instagramActorId: null, utm: null, formId: null, engagementRanking: "Average" as const, conversionRanking: null, reviewNote: null, lastEdited: null };
    const data2 = mapSnapshot(
      snapshot({
        ads: ds([
          { ...base, id: "q1", name: "Weak", status: "active", qualityRanking: "Below average", metrics: metrics(10) },
          { ...base, id: "q2", name: "Paused weak", status: "paused", qualityRanking: "Below average", metrics: metrics(10) },
          { ...base, id: "q3", name: "Fine", status: "active", qualityRanking: "Average", metrics: metrics(10) },
        ]),
      }),
      [],
    );
    assert.deepEqual(data2.issues.filter((i) => i.id.startsWith("ad-quality")).map((i) => i.id), ["ad-quality-q1"]);
  });

  it("lists the ad account, pages, Instagram and pixels as assets", () => {
    assert.deepEqual(data.connectedAssets.map((a) => a.group), ["Ad Account", "Facebook Page", "Instagram Business", "Pixel / Data Source"]);
    assert.equal(data.connectedAssets[2]!.name, "@brand");
  });

  it("maps a lead without a pipeline and without inventing an owner or score", () => {
    const lead = toLead({ id: "l1", name: null, email: "a@x.test", phone: null, city: null, company: null, campaignId: "c1", adSetId: null, adId: null, formId: "f1", platform: "fb", isOrganic: false, submittedAt: "2026-10-03T00:00:00Z", answers: [] });
    assert.equal(lead.name, "a@x.test");
    assert.equal(lead.stage, "New");
    assert.equal(lead.owner, "");
    assert.equal(lead.timeline.length, 1);
    assert.deepEqual(lead.notes, []);
  });
});
