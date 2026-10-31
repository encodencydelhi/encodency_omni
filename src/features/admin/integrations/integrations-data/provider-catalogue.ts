/**
 * Plain-language product copy for the providers the backend can connect, joined with what the server reports (which scopes the
 * authorization really asks for, whether the provider can be connected right now). The copy is only wording: names,
 * explanations and which modules a permission serves. Nothing here says whether anything is connected or healthy.
 */

import type { BackendOAuthProvider, HubProvider } from "../live/integrations-api";
import type { IntegrationProvider, ModuleKey, PermissionDefinition, ProviderAvailability, ProviderCategory, ProviderId, ResourceType } from "./types";

export const PROVIDER_ID_BY_BACKEND: Record<BackendOAuthProvider, ProviderId> = {
  META: "meta",
  GOOGLE_BUSINESS: "google-business",
  LINKEDIN: "linkedin",
  YOUTUBE: "youtube",
};

export const BACKEND_BY_PROVIDER_ID: Partial<Record<ProviderId, BackendOAuthProvider>> = {
  meta: "META",
  "google-business": "GOOGLE_BUSINESS",
  linkedin: "LINKEDIN",
  youtube: "YOUTUBE",
};

export const RESOURCE_TYPE_BY_BACKEND: Record<string, ResourceType> = {
  FACEBOOK_PAGE: "facebook_page",
  INSTAGRAM_ACCOUNT: "instagram_account",
  GOOGLE_BUSINESS_LOCATION: "gbp_location",
  LINKEDIN_ORGANIZATION: "linkedin_page",
  YOUTUBE_CHANNEL: "youtube_channel",
};

export const BACKEND_BY_RESOURCE_TYPE: Partial<Record<ResourceType, string>> = {
  facebook_page: "FACEBOOK_PAGE",
  instagram_account: "INSTAGRAM_ACCOUNT",
  gbp_location: "GOOGLE_BUSINESS_LOCATION",
  linkedin_page: "LINKEDIN_ORGANIZATION",
  youtube_channel: "YOUTUBE_CHANNEL",
};

interface ProviderCopy {
  category: ProviderCategory;
  resourceTypes: IntegrationProvider["resourceTypes"];
  modules: ModuleKey[];
  requirements: string[];
}

const PROVIDER_COPY: Record<BackendOAuthProvider, ProviderCopy> = {
  META: {
    category: "social",
    resourceTypes: [
      { type: "facebook_page", label: "Facebook Pages", multiple: true },
      { type: "instagram_account", label: "Instagram Business Accounts", multiple: true },
    ],
    modules: ["content_studio", "campaigns", "analytics", "lead_capture"],
    requirements: ["A Facebook login that manages the Pages you want to connect", "An Instagram Business or Creator account linked to the Page, for Instagram"],
  },
  GOOGLE_BUSINESS: {
    category: "google",
    resourceTypes: [{ type: "gbp_location", label: "Business Locations", multiple: true }],
    modules: ["reviews", "content_studio", "analytics"],
    requirements: ["Owner or manager access to the Business Profile"],
  },
  LINKEDIN: {
    category: "social",
    resourceTypes: [{ type: "linkedin_page", label: "Organization Pages", multiple: true }],
    modules: ["content_studio", "analytics"],
    requirements: ["Admin access to the LinkedIn company page"],
  },
  YOUTUBE: {
    category: "google",
    resourceTypes: [{ type: "youtube_channel", label: "Channels", multiple: true }],
    modules: ["content_studio", "analytics"],
    requirements: ["Owner or manager access to the YouTube channel"],
  },
};

interface ScopeCopy {
  label: string;
  description: string;
  modules: ModuleKey[];
}

const ID_SCOPE = (label: string): ScopeCopy => ({ label, description: "Confirms which account signed in. It does not give Media360 any access to content.", modules: [] });

/** What each scope the backend can request means, in plain words. An unlisted scope shows its own name. */
const SCOPE_COPY: Record<string, ScopeCopy> = {
  openid: ID_SCOPE("Sign-in identity"),
  profile: ID_SCOPE("Basic profile"),
  email: ID_SCOPE("Email address"),
  pages_show_list: { label: "See your Pages", description: "List the Facebook Pages (and linked Instagram accounts) the login manages.", modules: ["content_studio", "analytics"] },
  pages_manage_posts: { label: "Publish to Pages", description: "Create and schedule Facebook Page posts.", modules: ["content_studio"] },
  pages_read_engagement: { label: "Read Page activity", description: "Read Page posts, comments and engagement.", modules: ["analytics"] },
  instagram_basic: { label: "Read Instagram account", description: "Read the linked Instagram profile and its media.", modules: ["analytics"] },
  instagram_content_publish: { label: "Publish to Instagram", description: "Publish images and Reels to the linked Instagram account.", modules: ["content_studio"] },
  ads_read: { label: "Read ad performance", description: "Read ad accounts, campaigns and results.", modules: ["campaigns", "reports"] },
  ads_management: { label: "Manage ads", description: "Create and change campaigns, ad sets and ads.", modules: ["campaigns"] },
  leads_retrieval: { label: "Read lead forms", description: "Receive lead-ad form submissions.", modules: ["lead_capture"] },
  pages_manage_ads: { label: "Manage Page ads", description: "Work with ads that run from a Page.", modules: ["campaigns"] },
  "https://www.googleapis.com/auth/business.manage": { label: "Manage Business Profiles", description: "Read and manage locations, reviews, posts and photos.", modules: ["reviews", "content_studio", "analytics"] },
  "https://www.googleapis.com/auth/youtube.readonly": { label: "Read YouTube channel", description: "Read channel details, videos and playlists.", modules: ["content_studio", "analytics"] },
  "https://www.googleapis.com/auth/youtube.upload": { label: "Upload videos", description: "Upload and schedule videos.", modules: ["content_studio"] },
  "https://www.googleapis.com/auth/youtube.force-ssl": { label: "Manage YouTube content", description: "Edit videos, manage playlists and comments, and run live streams.", modules: ["content_studio", "inbox"] },
  "https://www.googleapis.com/auth/yt-analytics.readonly": { label: "Read YouTube analytics", description: "Views, watch time and audience reports.", modules: ["analytics", "reports"] },
  w_member_social: { label: "Post as the member", description: "Share posts from the signed-in member.", modules: ["content_studio"] },
  r_organization_admin: { label: "See company pages", description: "List the company pages the member administers.", modules: ["content_studio", "analytics"] },
  rw_organization_admin: { label: "Manage company pages", description: "Read and manage company page settings.", modules: ["analytics"] },
  r_organization_social: { label: "Read page posts", description: "Read company page posts, comments and reactions.", modules: ["analytics"] },
  w_organization_social: { label: "Publish to company pages", description: "Create posts on a company page.", modules: ["content_studio"] },
  r_organization_social_feed: { label: "Read page feed", description: "Read the page's feed and its comments.", modules: ["inbox", "analytics"] },
  w_organization_social_feed: { label: "Reply on company pages", description: "Comment and react on behalf of a company page.", modules: ["inbox"] },
};

const lastSegment = (scope: string) => scope.split("/").pop() ?? scope;

export function scopeDefinition(scope: string, optional: boolean): PermissionDefinition {
  const copy = SCOPE_COPY[scope];
  return {
    key: scope,
    label: copy?.label ?? lastSegment(scope),
    description: copy?.description ?? "A permission the provider grants to Media360.",
    optional,
    requiredFor: copy?.modules ?? [],
    technicalScope: scope,
  };
}

/** Every scope the authorization asks for (and the ones features ask for later), required ones first. */
export function permissionsFor(provider: HubProvider): PermissionDefinition[] {
  const later = provider.capabilities.flatMap((capability) => capability.requiredScopes).filter((scope) => !provider.requestedScopes.includes(scope));
  const all = [...new Set([...provider.requestedScopes, ...later])];
  const definitions = all.map((scope) => scopeDefinition(scope, !provider.requiredScopes.includes(scope)));
  return definitions.sort((a, b) => Number(a.optional) - Number(b.optional));
}

const AVAILABILITY: Record<HubProvider["state"], ProviderAvailability> = {
  available: "available",
  unsupported: "coming_soon",
  not_configured: "platform_disabled",
  platform_disabled: "platform_disabled",
  maintenance: "platform_disabled",
  new_connections_paused: "platform_disabled",
};

export function buildProviders(hub: HubProvider[]): IntegrationProvider[] {
  return hub.map((provider) => {
    const copy = PROVIDER_COPY[provider.provider];
    return {
      id: PROVIDER_ID_BY_BACKEND[provider.provider],
      name: provider.name,
      category: copy.category,
      description: provider.description,
      scope: "client" as const,
      resourceTypes: copy.resourceTypes,
      permissions: permissionsFor(provider),
      modules: copy.modules,
      requirements: copy.requirements,
      availability: AVAILABILITY[provider.state],
      ...(provider.note ? { availabilityNote: provider.note } : {}),
      learnMoreUrl: provider.docsUrl,
    };
  });
}
