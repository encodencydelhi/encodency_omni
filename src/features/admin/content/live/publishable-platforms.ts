import type { Platform } from "../types/content.types";
import type { ClientChannelOverview, OverviewProvider } from "@/features/admin/integrations/live/integrations-api";

const PLATFORM_PROVIDER: Partial<Record<Platform, OverviewProvider>> = {
  facebook: "META",
  instagram: "INSTAGRAM",
  linkedin: "LINKEDIN",
  "google-business": "GOOGLE_BUSINESS",
};

export function overviewProviderForPlatform(platform: Platform): OverviewProvider | null {
  return PLATFORM_PROVIDER[platform] ?? null;
}

export function getPublishablePlatforms(overview: ClientChannelOverview | undefined): Platform[] {
  if (!overview) return [];
  return (Object.entries(PLATFORM_PROVIDER) as Array<[Platform, OverviewProvider]>)
    .filter(([platform, provider]) => {
      const row = overview.providers.find((item) => item.provider === provider);
      return row?.state === "connected" && row.publishingSupported;
    })
    .map(([platform]) => platform);
}