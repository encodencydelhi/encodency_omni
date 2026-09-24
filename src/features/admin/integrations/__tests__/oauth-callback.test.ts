/**
 * OAuth callback landing contract: the backend 302s to
 * `/admin/integrations?status=…&provider=…&reason=…` with an enumerated
 * reason set. Parsing must ignore ordinary query keys, map only known
 * reasons, and strip exactly the three callback params on the way out.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOAuthCallbackReason,
  oauthCallbackFeedback,
  oauthProviderLabel,
  parseOAuthCallbackParams,
  stripOAuthCallbackParams,
} from "../integrations-data/oauth-callback";

describe("parseOAuthCallbackParams", () => {
  it("returns null when status is missing so normal navigation stays inert", () => {
    assert.equal(parseOAuthCallbackParams(new URLSearchParams("client=c1&connect=1")), null);
    assert.equal(parseOAuthCallbackParams(null), null);
    assert.equal(parseOAuthCallbackParams(undefined), null);
  });

  it("returns null for a status outside success|error", () => {
    assert.equal(parseOAuthCallbackParams(new URLSearchParams("status=pending")), null);
  });

  it("parses a success landing with the backend provider enum", () => {
    const result = parseOAuthCallbackParams(new URLSearchParams("status=success&provider=GOOGLE_BUSINESS"));
    assert.deepEqual(result, { status: "success", provider: "GOOGLE_BUSINESS", reason: null });
  });

  it("keeps a known error reason and nulls an unknown one", () => {
    const known = parseOAuthCallbackParams(new URLSearchParams("status=error&provider=META&reason=access_denied"));
    assert.deepEqual(known, { status: "error", provider: "META", reason: "access_denied" });

    const unknown = parseOAuthCallbackParams(new URLSearchParams("status=error&reason=<script>"));
    assert.deepEqual(unknown, { status: "error", provider: null, reason: null });
  });
});

describe("isOAuthCallbackReason", () => {
  it("accepts every reason the backend can emit and rejects anything else", () => {
    for (const reason of [
      "invalid_state",
      "state_unavailable",
      "access_denied",
      "invalid_callback",
      "provider_unavailable",
      "not_authorized",
      "provider_timeout",
      "provider_unreachable",
      "exchange_failed",
      "invalid_token_response",
      "identity_unverified",
      "storage_failed",
    ]) {
      assert.equal(isOAuthCallbackReason(reason), true, reason);
    }
    assert.equal(isOAuthCallbackReason("nope"), false);
    assert.equal(isOAuthCallbackReason(null), false);
  });
});

describe("oauthCallbackFeedback", () => {
  it("uses friendly copy for known providers on success", () => {
    const feedback = oauthCallbackFeedback({ status: "success", provider: "GOOGLE_BUSINESS", reason: null });
    assert.equal(feedback.tone, "success");
    assert.match(feedback.title, /Google Business Profile/);
    assert.ok(feedback.description.length > 0);
  });

  it("maps each error reason to a specific message and falls back when reason is null", () => {
    const denied = oauthCallbackFeedback({ status: "error", provider: "META", reason: "access_denied" });
    assert.equal(denied.tone, "error");
    assert.match(denied.description, /declined access/i);

    const bare = oauthCallbackFeedback({ status: "error", provider: null, reason: null });
    assert.equal(bare.tone, "error");
    assert.ok(bare.description.length > 0);
  });
});

describe("oauthProviderLabel", () => {
  it("maps the backend enum and passes unknown values through", () => {
    assert.equal(oauthProviderLabel("META"), "Meta");
    assert.equal(oauthProviderLabel("LINKEDIN"), "LinkedIn");
    assert.equal(oauthProviderLabel("SOMETHING_NEW"), "SOMETHING_NEW");
    assert.equal(oauthProviderLabel(null), "The provider");
  });
});

describe("stripOAuthCallbackParams", () => {
  it("removes only status, provider and reason and keeps every other key", () => {
    const stripped = stripOAuthCallbackParams(
      new URLSearchParams("client=c1&status=success&provider=META&connect=1&reason=access_denied"),
    );
    assert.equal(stripped.get("client"), "c1");
    assert.equal(stripped.get("connect"), "1");
    assert.equal(stripped.get("status"), null);
    assert.equal(stripped.get("provider"), null);
    assert.equal(stripped.get("reason"), null);
  });
});
