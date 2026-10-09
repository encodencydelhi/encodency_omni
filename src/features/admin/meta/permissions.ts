/**
 * What each Meta login permission unlocks in OmniPlatform. The scope list itself lives in the backend
 * (`META_SCOPES` + optional `META_EXTRA_SCOPES`); this catalogue only explains it to the user and decides
 * which product a missing scope blocks.
 */
export type MetaProduct = "ads" | "facebook" | "instagram";

export interface ScopeInfo {
  scope: string;
  label: string;
  products: MetaProduct[];
  /** Plain-language benefit shown next to the permission. */
  unlocks: string;
  /** Needed for the product to work at all (vs. a feature on top). */
  essential: boolean;
}

export const SCOPE_CATALOGUE: ScopeInfo[] = [
  { scope: "ads_read", label: "Read ads", products: ["ads"], unlocks: "Ad accounts, campaigns, ad sets, ads and their performance.", essential: true },
  { scope: "leads_retrieval", label: "Read leads", products: ["ads"], unlocks: "Leads submitted through instant forms.", essential: false },
  { scope: "pages_manage_ads", label: "Page ads access", products: ["ads"], unlocks: "Lets Meta list the lead forms that belong to a Page.", essential: false },
  { scope: "pages_show_list", label: "List Pages", products: ["facebook", "instagram"], unlocks: "Finds the Facebook Pages (and linked Instagram accounts) this login manages.", essential: true },
  { scope: "pages_read_engagement", label: "Read Page content", products: ["facebook", "instagram"], unlocks: "Page posts with reactions, comments and shares; the Page behind an Instagram account.", essential: true },
  { scope: "pages_manage_posts", label: "Publish to Pages", products: ["facebook"], unlocks: "Scheduling and publishing posts to a Facebook Page.", essential: false },
  { scope: "instagram_basic", label: "Instagram profile", products: ["instagram"], unlocks: "Instagram profile details and media.", essential: true },
  { scope: "instagram_content_publish", label: "Publish to Instagram", products: ["instagram"], unlocks: "Scheduling and publishing photos and reels to Instagram.", essential: false },
  { scope: "business_management", label: "Business portfolio access", products: ["ads", "facebook", "instagram"], unlocks: "Pages and ad accounts owned by a Business portfolio instead of by this person. Optional; enable with META_EXTRA_SCOPES.", essential: false },
];

export const PRODUCT_LABEL: Record<MetaProduct, string> = {
  ads: "Meta Ads",
  facebook: "Facebook",
  instagram: "Instagram",
};

export function parseScopes(value: unknown): string[] {
  return typeof value === "string" ? value.split(/[\s,]+/).filter(Boolean) : [];
}

export interface ScopeStatus extends ScopeInfo {
  state: "granted" | "declined" | "missing";
}

/** Every catalogue scope with what the connected login actually gave us. */
export function scopeStatuses(granted: string[], declined: string[]): ScopeStatus[] {
  return SCOPE_CATALOGUE.map((info) => ({
    ...info,
    state: granted.includes(info.scope) ? "granted" : declined.includes(info.scope) ? "declined" : "missing",
  }));
}

/** Essential scopes of one product that are not granted. */
export function missingEssential(statuses: ScopeStatus[], product: MetaProduct): ScopeStatus[] {
  return statuses.filter((status) => status.essential && status.products.includes(product) && status.state !== "granted");
}
