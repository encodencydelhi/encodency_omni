import { ROLE_PERMISSIONS } from "@/types/domain/team";
import type { AuthenticatedUser, CurrentUserResponse, LoginChallengeResponse, TotpChallenge } from "@/types/domain/auth";

/** "officialmanishsirohi.01@gmail.com" -> "o•••••••••••••••••••••1@gmail.com" */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (local.length <= 2) return email;
  return `${local[0]}${"•".repeat(Math.max(local.length - 2, 3))}${local.at(-1)}@${domain}`;
}

export function toChallenge(response: LoginChallengeResponse, email: string): TotpChallenge {
  return {
    type: response.challengeType === "enrollment" ? "enrollment" : "totp",
    challengeToken: response.challengeToken,
    maskedEmail: maskEmail(email),
    expiresAt: response.expiresAt,
  };
}

/**
 * Builds the frontend principal from the server's own answer.
 *
 * Only a server-reported Platform SUPER_ADMIN gets the Super Admin role (and
 * its navigation permissions). Everyone else has no staff role: what they can
 * reach is decided by their verified Company memberships and, finally, by the
 * API's own authorisation on every request.
 */
export function toAuthenticatedUser(profile: CurrentUserResponse): AuthenticatedUser {
  const isSuperAdmin = profile.platformRole === "SUPER_ADMIN";
  return {
    id: profile.id,
    email: profile.email,
    name: profile.email,
    avatarUrl: null,
    role: isSuperAdmin ? "super_admin" : null,
    platformRole: isSuperAdmin ? "SUPER_ADMIN" : null,
    permissions: isSuperAdmin ? ROLE_PERMISSIONS.super_admin : [],
    status: "active",
    department: "",
    lastLoginAt: null,
    memberships: profile.memberships.map((membership) => ({ ...membership })),
  };
}
