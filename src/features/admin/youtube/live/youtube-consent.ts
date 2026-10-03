import { YOUTUBE_CONSENT_CAPABILITIES, type YouTubeConsentCapability } from "./youtube-dto";

/**
 * Incremental consent. The browser only ever names a CAPABILITY (`YOUTUBE_MANAGE_CONTENT`, ...); the server owns the
 * mapping to Google scopes and builds the authorization URL. Raw scope strings are never sent from here.
 */

export function isConsentCapability(value: unknown): value is YouTubeConsentCapability {
  return typeof value === "string" && (YOUTUBE_CONSENT_CAPABILITIES as readonly string[]).includes(value);
}

const ALLOWED_HOSTS = ["accounts.google.com"];

/**
 * The URL the browser is about to be sent to must be a Google sign-in page over https. A tampered response must never
 * turn "Grant permission" into an open redirect.
 */
export function safeAuthUrl(authUrl: unknown): string | null {
  if (typeof authUrl !== "string" || !authUrl) return null;
  try {
    const url = new URL(authUrl);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Query string / body check used by tests: no field of a consent request may carry a Google scope URL. */
export function containsRawScope(value: unknown): boolean {
  return JSON.stringify(value ?? "").includes("googleapis.com/auth") || JSON.stringify(value ?? "").includes("yt-analytics");
}
