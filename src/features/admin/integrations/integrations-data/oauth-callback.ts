/**
 * Frontend half of the OAuth callback contract.
 *
 * The backend handles `GET /api/v1/integrations/oauth/callback` itself and
 * 302s the browser to `/admin/integrations` with only `status`, `provider`
 * and `reason` appended. Nothing here talks to the network — it parses that
 * landing URL, turns it into UI copy, and strips the params again so a
 * refresh or a shared link never replays the toast.
 */

export type OAuthCallbackStatus = "success" | "error";

/** Mirrors `OAuthCallbackReason` in encodency_omni_backend integrations.service.ts. */
export type OAuthCallbackReason =
  | "invalid_state"
  | "state_unavailable"
  | "access_denied"
  | "invalid_callback"
  | "provider_unavailable"
  | "not_authorized"
  | "provider_timeout"
  | "provider_unreachable"
  | "exchange_failed"
  | "invalid_token_response"
  | "identity_unverified"
  | "storage_failed";

const REASON_VALUES: ReadonlySet<string> = new Set<OAuthCallbackReason>([
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
]);

export function isOAuthCallbackReason(value: string | null | undefined): value is OAuthCallbackReason {
  return value !== null && value !== undefined && REASON_VALUES.has(value);
}

export interface OAuthCallbackResult {
  status: OAuthCallbackStatus;
  /** Backend provider enum (`META`, `GOOGLE_BUSINESS`, `LINKEDIN`) when present. */
  provider: string | null;
  reason: OAuthCallbackReason | null;
}

/** Minimal shape shared by `URLSearchParams` and Next's `ReadonlyURLSearchParams`. */
type QueryLike = { get(name: string): string | null };

/**
 * Returns a result only when `status` is present and valid — so ordinary
 * navigation (`?client=…`, `?connect=1`, …) never triggers callback UI.
 */
export function parseOAuthCallbackParams(params: QueryLike | null | undefined): OAuthCallbackResult | null {
  if (!params) return null;
  const status = params.get("status");
  if (status !== "success" && status !== "error") return null;
  const reasonRaw = params.get("reason");
  return {
    status,
    provider: params.get("provider"),
    reason: isOAuthCallbackReason(reasonRaw) ? reasonRaw : null,
  };
}

/** Backend enum → display name; unknown values pass through unchanged. */
export function oauthProviderLabel(provider: string | null): string {
  switch (provider) {
    case "META":
      return "Meta";
    case "GOOGLE_BUSINESS":
      return "Google Business Profile";
    case "LINKEDIN":
      return "LinkedIn";
    default:
      return provider || "The provider";
  }
}

const REASON_MESSAGE: Record<OAuthCallbackReason, string> = {
  invalid_state: "The sign-in session could not be verified. Start the connection again.",
  state_unavailable: "The sign-in session expired before it finished. Start the connection again.",
  access_denied: "You declined access on the provider's consent screen.",
  invalid_callback: "The provider sent an incomplete response. Start the connection again.",
  provider_unavailable: "This provider is not available right now. Try again later.",
  not_authorized: "Your account is not allowed to connect this provider.",
  provider_timeout: "The provider took too long to respond. Try again in a moment.",
  provider_unreachable: "The provider could not be reached. Try again later.",
  exchange_failed: "The authorization could not be completed. Start the connection again.",
  invalid_token_response: "The provider returned an unexpected response. Start the connection again.",
  identity_unverified: "The provider account identity could not be verified.",
  storage_failed: "The connection could not be saved. Start the connection again.",
};

export interface OAuthCallbackFeedback {
  tone: "success" | "error";
  title: string;
  description: string;
}

export function oauthCallbackFeedback(result: OAuthCallbackResult): OAuthCallbackFeedback {
  const label = oauthProviderLabel(result.provider);
  if (result.status === "success") {
    return {
      tone: "success",
      title: `${label} authorization complete`,
      description: "Access was granted. Finish setting up the connection from Available.",
    };
  }
  return {
    tone: "error",
    title: `${label} authorization failed`,
    description: result.reason
      ? REASON_MESSAGE[result.reason]
      : "Authorization did not complete. You can try connecting again.",
  };
}

/** Drops the three callback params and leaves every other query key untouched. */
export function stripOAuthCallbackParams(params: QueryLike & { toString(): string }): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  next.delete("status");
  next.delete("provider");
  next.delete("reason");
  return next;
}
