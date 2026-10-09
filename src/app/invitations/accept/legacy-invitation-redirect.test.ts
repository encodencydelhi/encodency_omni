/**
 * Legacy `/invitations/accept` owner-invite links (the API path, emitted by the
 * backend before its link builder was fixed) must forward to the real accept
 * screen instead of landing on a 404 with a live one-time token.
 *
 * The page itself is a one-liner over this helper; the redirect chain is
 * verified against the running dev server (307 -> 200 on /accept-invitation).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { acceptInvitationTarget } = await import("./legacy-invitation-redirect");

describe("acceptInvitationTarget (legacy /invitations/accept links)", () => {
  it("forwards the one-time token to /accept-invitation", () => {
    assert.equal(
      acceptInvitationTarget({ token: "593b68d29fbc77357599e974ed4d4abeb061d8356afb32054af55820b0164b21" }),
      "/accept-invitation?token=593b68d29fbc77357599e974ed4d4abeb061d8356afb32054af55820b0164b21",
    );
  });

  it("keeps every scalar query parameter", () => {
    assert.equal(acceptInvitationTarget({ token: "abc123", utm_source: "email" }), "/accept-invitation?token=abc123&utm_source=email");
  });

  it("redirects a bare hit to the accept screen", () => {
    assert.equal(acceptInvitationTarget({}), "/accept-invitation");
  });

  it("drops non-string values instead of serialising arrays into the URL", () => {
    assert.equal(acceptInvitationTarget({ token: ["a", "b"] }), "/accept-invitation");
  });
});
