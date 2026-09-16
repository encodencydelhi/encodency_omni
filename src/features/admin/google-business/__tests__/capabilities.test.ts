import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAPABILITY_DOCS, evaluateCapabilities, type CapabilityInput } from "../lib/capabilities";
import { ALL_PERMISSIONS } from "../lib/constants";
import type { CapabilityKey, GbpPermission } from "../types";

const verified = { verification: "verified", openState: "open", managed: true } as const;

function input(patch: Partial<CapabilityInput> = {}): CapabilityInput {
  return {
    connection: "connected",
    scopes: ["business.manage", "plus.business.manage"],
    permissions: ALL_PERMISSIONS,
    location: verified,
    ...patch,
  };
}

describe("evaluateCapabilities", () => {
  it("allows every capability for an owner on a verified, connected location", () => {
    const can = evaluateCapabilities(input());
    for (const [key, capability] of Object.entries(can)) {
      assert.equal(capability.allowed, true, `${key} should be allowed: ${capability.reason ?? ""}`);
    }
  });

  it("blocks by role before anything else, and says how to get access", () => {
    const can = evaluateCapabilities(input({ permissions: ["view_google_business"] as GbpPermission[] }));
    assert.equal(can.canReplyReviews.allowed, false);
    assert.equal(can.canReplyReviews.fix, "request_access");
    assert.match(can.canReplyReviews.reason ?? "", /role/i);
    // A read the role still has stays available.
    assert.equal(can.canReadReviews.allowed, true);
  });

  it("keeps reads working while the token is expired but blocks writes", () => {
    const can = evaluateCapabilities(input({ connection: "token_expired" }));
    assert.equal(can.canReadLocations.allowed, true);
    assert.equal(can.canViewPerformance.allowed, true);
    assert.equal(can.canCreatePosts.allowed, false);
    assert.equal(can.canCreatePosts.fix, "reconnect");
    assert.equal(can.canSyncLocations.allowed, false);
  });

  it("blocks writes on quota exhaustion with a wait fix, not a reconnect", () => {
    const can = evaluateCapabilities(input({ connection: "quota_exceeded" }));
    assert.equal(can.canReplyReviews.allowed, false);
    assert.equal(can.canReplyReviews.fix, "wait");
    assert.equal(can.canReadReviews.allowed, true);
  });

  it("blocks everything when disconnected", () => {
    const can = evaluateCapabilities(input({ connection: "disconnected" }));
    const allowed = Object.entries(can).filter(([, capability]) => capability.allowed);
    assert.deepEqual(allowed, []);
    assert.equal(can.canReadLocations.fix, "connect");
  });

  it("requires the business.manage scope for Google-backed actions only", () => {
    const can = evaluateCapabilities(input({ scopes: [] }));
    assert.equal(can.canReadLocations.allowed, false);
    assert.equal(can.canReadLocations.fix, "reconnect");
    // Internal-only capabilities do not depend on a Google scope.
    assert.equal(can.canApproveContent.allowed, true);
    assert.equal(can.canManageConnection.allowed, true);
    assert.equal(can.canManageSettings.allowed, true);
  });

  it("refuses writes on unverified locations but still allows reads", () => {
    const can = evaluateCapabilities(input({ location: { verification: "pending", openState: "open", managed: true } }));
    assert.equal(can.canEditProfile.allowed, false);
    assert.equal(can.canEditProfile.fix, "verify_location");
    assert.equal(can.canCreatePosts.allowed, false);
    assert.equal(can.canReadReviews.allowed, true);
  });

  it("refuses writes on a permanently closed location", () => {
    const can = evaluateCapabilities(input({ location: { verification: "verified", openState: "closed_permanently", managed: true } }));
    assert.equal(can.canEditProfile.allowed, false);
    assert.match(can.canEditProfile.reason ?? "", /permanently closed/i);
  });

  it("refuses writes when the location is unmanaged in settings", () => {
    const can = evaluateCapabilities(input({ location: { verification: "verified", openState: "open", managed: false } }));
    assert.equal(can.canManageMedia.allowed, false);
    assert.match(can.canManageMedia.reason ?? "", /Settings/);
  });

  it("gives every blocked capability an actionable reason", () => {
    const can = evaluateCapabilities(input({ connection: "token_expired", permissions: ["view_google_business"] as GbpPermission[] }));
    for (const [key, capability] of Object.entries(can)) {
      if (capability.allowed) continue;
      assert.ok(capability.reason && capability.reason.length > 10, `${key} needs a reason`);
      assert.ok(capability.fix, `${key} needs a fix hint`);
    }
  });

  it("documents every capability it evaluates", () => {
    const evaluated = Object.keys(evaluateCapabilities(input())) as CapabilityKey[];
    const documented = CAPABILITY_DOCS.map((row) => row.key);
    for (const key of evaluated) assert.ok(documented.includes(key), `${key} is missing from CAPABILITY_DOCS`);
    assert.equal(documented.length, evaluated.length);
  });

  it("marks the approval workflow as an OmniPlatform feature, not a Google one", () => {
    const approval = CAPABILITY_DOCS.find((row) => row.key === "canApproveContent");
    assert.equal(approval?.googleSupported, false);
  });
});
