import type { InternalRole, Permission } from "./team";

/* ------------------------------------------------------------------ */
/* Backend contracts (backend/src/auth, backend/src/users)            */
/* ------------------------------------------------------------------ */

export type CompanySystemRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";
export type MembershipCompanyStatus = "ACTIVE" | "ARCHIVED";

/** One of the signed-in user's own memberships, as returned by GET /users/me. */
export interface CompanyMembershipSummary {
  membershipId: string;
  companyId: string;
  companyName: string;
  companyStatus: MembershipCompanyStatus;
  systemRole: CompanySystemRole;
  jobTitle?: string | null;
  department?: string | null;
}

export interface SafeAssetSummary {
  id: string;
  purpose: string;
  url: string;
  mimeType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
}

/** GET /api/v1/users/me */
export interface CurrentUserResponse {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  totpEnabled: boolean;
  platformRole: "SUPER_ADMIN" | null;
  avatar?: SafeAssetSummary | null;
  avatarUrl?: string | null;
  memberships: CompanyMembershipSummary[];
}

/** POST /api/v1/auth/login — never a session: mandatory MFA always follows. */
export interface LoginChallengeResponse {
  status: "challenge";
  challengeType: "enrollment" | "totp";
  challengeToken: string;
  expiresAt: string;
}

/** POST /api/v1/auth/totp/setup */
export interface TotpSetupResponse {
  otpauthUri: string;
  qrDataUrl: string;
  expiresAt: string;
}

/** POST /api/v1/auth/totp/verify-setup — the only response that ever carries recovery codes. */
export interface EnrollmentVerifiedResponse {
  status: "authenticated";
  user: { id: string; email: string };
  recoveryCodes: string[];
}

/** POST /api/v1/auth/totp/replace — authorise rotation with the CURRENT factor. */
export type TotpReplacementAuthorization =
  | { code: string; recoveryCode?: undefined }
  | { code?: undefined; recoveryCode: string };

/** Pending response: new secret is not active until verify-replacement succeeds. */
export interface TotpReplacementPendingResponse {
  status: "replacement_pending";
  challengeToken: string;
  otpauthUri: string;
  qrDataUrl: string;
  expiresAt: string;
}

/** POST /api/v1/auth/totp/verify-replacement — activates the new factor and issues fresh recovery codes. */
export interface TotpReplacementCompletedResponse {
  status: "replacement_completed";
  recoveryCodes: string[];
}

/* ------------------------------------------------------------------ */
/* Frontend model                                                      */
/* ------------------------------------------------------------------ */

/** Shape of a staff account in the demo data set (mock mode only). */
export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: InternalRole;
  permissions: readonly Permission[];
  status: "active" | "suspended";
  department: string;
  lastLoginAt: string | null;
}
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: InternalRole | null;
  platformRole: "SUPER_ADMIN" | null;
  permissions: readonly Permission[];
  status: "active" | "suspended";
  department: string;
  lastLoginAt: string | null;
  memberships: CompanyMembershipSummary[];
}

export interface AuthSession {
  user: AuthenticatedUser;
}

/**
 * The finite states the shell can be in. Keeping this explicit avoids the
 * classic "flash of login page" bug while the session is being restored.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Second factor.
 *
 * Correct credentials never produce a session on their own — they produce a
 * short-lived challenge that must be exchanged for one.
 */
export interface TotpChallenge {
  type: "totp" | "enrollment";
  challengeToken: string;
  /** Shown on the verification step. */
  maskedEmail: string;
  /** ISO timestamp from the server. */
  expiresAt: string;
}

export type LoginResult = { status: "challenge"; challenge: TotpChallenge };

export interface ChallengeVerification {
  challengeToken: string;
  code: string;
}

/** Result of first-time enrollment: the session exists, but the codes must be acknowledged before entering. */
export interface EnrollmentResult {
  user: AuthenticatedUser;
  recoveryCodes: string[];
}
