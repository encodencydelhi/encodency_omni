import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ClientChannelOverview, OverviewProvider, ProviderOverview } from "@/features/admin/integrations/live/integrations-api";
import { getPublishablePlatforms, overviewProviderForPlatform } from "../publishable-platforms";

function provider(provider: OverviewProvider, state: ProviderOverview["state"], publishingSupported = true): ProviderOverview {
  return {
    provider,
    status: state === "connected" ? "MAPPED" : "NOT_CONNECTED",
    health: state === "connected" ? "healthy" : "not_connected",
    reconnectRequired: false,
    integrationId: state === "connected" ? "integration-1" : null,
    companyConnectionAvailable: state === "connected",
    mappedResourceCount: state === "connected" ? 1 : 0,
    resources: [],
    lastUpdatedAt: null,
    publishingSupported,
    state,
    availableActions: [],
    reason: null,
  };
}

function overview(providers: ProviderOverview[]): ClientChannelOverview {
  return {
    clientId: "client-1",
    providers,
  };
}

describe("publishable platforms from the Client integration overview", () => {
  it("offers Instagram only when the backend reports a mapped, publishable account", () => {
    assert.deepEqual(
      getPublishablePlatforms(overview([
        provider("INSTAGRAM", "connected"),
        provider("META", "disconnected"),
      ])),
      ["instagram"],
    );
  });

  it("excludes unmapped, reconnect-required, and backend-unsupported channels", () => {
    assert.deepEqual(
      getPublishablePlatforms(overview([
        provider("INSTAGRAM", "disconnected"),
        provider("META", "degraded"),
        provider("LINKEDIN", "connected", false),
      ])),
      [],
    );
  });

  it("maps the Instagram composer to the dedicated Instagram overview row", () => {
    assert.equal(overviewProviderForPlatform("instagram"), "INSTAGRAM");
    assert.equal(overviewProviderForPlatform("whatsapp"), null);
  });
});