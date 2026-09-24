/**
 * The signed-in principal is built only from the server's own answers.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskEmail, toAuthenticatedUser, toChallenge } from "../services/auth-mapping";
import { ROLE_PERMISSIONS } from "@/types/domain/team";
import type { CurrentUserResponse } from "@/types/domain/auth";

const companyUser: CurrentUserResponse = {
  id: "u-1",
  email: "owner@example.com",
  totpEnabled: true,
  platformRole: null,
  memberships: [
    { membershipId: "m-1", companyId: "c-1", companyName: "EnCodency Dev Test", companyStatus: "ACTIVE", systemRole: "OWNER" },
  ],
};

describe("toAuthenticatedUser", () => {
  it("gives a Company user no staff role and no Super Admin permissions — access comes from memberships", () => {
    const user = toAuthenticatedUser(companyUser);
    assert.equal(user.role, null);
    assert.equal(user.platformRole, null);
    assert.deepEqual([...user.permissions], []);
    assert.deepEqual(user.memberships, companyUser.memberships);
    assert.equal(user.email, "owner@example.com");
  });

  it("gives the Super Admin role only when the server reports platformRole SUPER_ADMIN", () => {
    const user = toAuthenticatedUser({ ...companyUser, platformRole: "SUPER_ADMIN", memberships: [] });
    assert.equal(user.role, "super_admin");
    assert.deepEqual(user.permissions, ROLE_PERMISSIONS.super_admin);
    assert.deepEqual(user.memberships, [], "no implicit Company membership for a Super Admin");
  });

  it("does not share the memberships array with the response object", () => {
    const user = toAuthenticatedUser(companyUser);
    assert.notEqual(user.memberships, companyUser.memberships);
    assert.notEqual(user.memberships[0], companyUser.memberships[0]);
  });

  it("never invents fields the server did not send", () => {
    const user = toAuthenticatedUser(companyUser);
    assert.equal(user.avatarUrl, null);
    assert.equal(user.lastLoginAt, null);
    assert.ok(!("accessToken" in user));
  });
});

describe("toChallenge", () => {
  it("maps the real login response and masks the email", () => {
    const challenge = toChallenge(
      { status: "challenge", challengeType: "enrollment", challengeToken: "tok", expiresAt: "2026-09-23T12:00:00.000Z" },
      "officialmanishsirohi.01@gmail.com",
    );
    assert.equal(challenge.type, "enrollment");
    assert.equal(challenge.challengeToken, "tok");
    assert.equal(challenge.expiresAt, "2026-09-23T12:00:00.000Z");
    assert.ok(!challenge.maskedEmail.includes("officialmanishsirohi"));
    assert.ok(challenge.maskedEmail.endsWith("@gmail.com"));
  });

  it("treats anything other than enrollment as a TOTP challenge", () => {
    assert.equal(toChallenge({ status: "challenge", challengeType: "totp", challengeToken: "t", expiresAt: "" }, "a@b.co").type, "totp");
  });

  it("leaves very short local parts unmasked rather than producing nonsense", () => {
    assert.equal(maskEmail("ab@example.com"), "ab@example.com");
  });
});
