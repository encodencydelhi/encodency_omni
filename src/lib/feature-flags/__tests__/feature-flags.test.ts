import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "../../../types/api";
import {
  describeBlockReason,
  isFeatureDisabledError,
  resolveFeature,
  type EffectiveFeatures,
  type FeatureDecision,
} from "../feature-flags";

const decision = (over: Partial<FeatureDecision>): FeatureDecision => ({
  flagKey: "content.ai_generator",
  label: "AI content generation",
  enabled: true,
  reason: null,
  configured: true,
  message: "",
  ...over,
});
const response = (...features: FeatureDecision[]): EffectiveFeatures => ({ environment: "development", features });

describe("resolveFeature", () => {
  it("is loading, and not usable, until the server has answered", () => {
    const view = resolveFeature("content.ai_generator", { data: undefined, isError: false });
    assert.equal(view.status, "loading");
    assert.equal(view.canUse, false);
  });

  it("is enabled and usable when the Company may use it", () => {
    const view = resolveFeature("content.ai_generator", { data: response(decision({})), isError: false });
    assert.equal(view.status, "enabled");
    assert.equal(view.canUse, true);
    assert.equal(view.explanation, "");
  });

  it("is disabled, not usable, and says why in plain words", () => {
    const view = resolveFeature("content.ai_generator", {
      data: response(decision({ enabled: false, reason: "emergency_off", message: "AI content generation is not available for your workspace right now." })),
      isError: false,
    });
    assert.equal(view.status, "disabled");
    assert.equal(view.canUse, false);
    assert.equal(view.reason, "emergency_off");
    assert.match(view.explanation, /not available for your workspace/);
    assert.match(view.explanation, /switched this off/);
  });

  it("reads only the feature it was asked about", () => {
    const data = response(decision({ flagKey: "channels.youtube_publishing", enabled: false, reason: "flag_disabled" }), decision({}));
    assert.equal(resolveFeature("content.ai_generator", { data, isError: false }).status, "enabled");
    assert.equal(resolveFeature("channels.youtube_publishing", { data, isError: false }).status, "disabled");
  });

  it("an error leaves the feature usable (the server still decides) and says the check failed", () => {
    const view = resolveFeature("content.ai_generator", { data: undefined, isError: true });
    assert.equal(view.status, "error");
    assert.equal(view.canUse, true);
    assert.match(view.explanation, /could not be checked/);
  });

  it("keeps showing the last good answer when a refresh fails", () => {
    const data = response(decision({ enabled: false, reason: "flag_disabled" }));
    assert.equal(resolveFeature("content.ai_generator", { data, isError: true }).status, "disabled");
  });

  it("a feature the server answered without listing is not locked and does not spin forever", () => {
    const view = resolveFeature("channels.linkedin_publishing", { data: response(decision({})), isError: false });
    assert.equal(view.status, "error");
    assert.equal(view.canUse, true);
  });
});

describe("block reasons and refusals", () => {
  it("has plain copy for every reason and none for null", () => {
    for (const reason of ["emergency_off", "not_ready", "flag_disabled", "plan_restricted", "subscription_inactive", "rollout_restricted", "dependency_blocked", "integration_blocked", "internal_only"] as const) {
      assert.ok((describeBlockReason(reason) ?? "").length > 10, reason);
    }
    assert.equal(describeBlockReason(null), null);
  });

  it("recognises the backend's feature_disabled refusal and nothing else", () => {
    const refusal = new ApiError({ code: "FORBIDDEN", message: "off", status: 403, reason: "feature_disabled" });
    assert.equal(isFeatureDisabledError(refusal), true);
    assert.equal(isFeatureDisabledError(new ApiError({ code: "FORBIDDEN", message: "no", status: 403 })), false);
    assert.equal(isFeatureDisabledError(new ApiError({ code: "UNKNOWN", message: "x", status: 500, reason: "feature_disabled" })), false);
    assert.equal(isFeatureDisabledError(new Error("x")), false);
  });
});
