/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Preliminary frontend validation.
 *
 * IMPORTANT: this is a usability check, not a security control. Passing it does NOT make a
 * destination safe to call. A backend must enforce SSRF protection, DNS resolution checks,
 * redirect policy, private-address blocking and network egress controls.
 */

import type { CreateEndpointInput, WebhookEnvironment } from "./types";

export interface UrlCheckResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** scheme + host + path only. Credentials, query and fragment are stripped. */
  sanitizedUrl: string | null;
  host: string | null;
  hadQueryString: boolean;
  scheme: "https" | "http" | "unknown";
}

const PRIVATE_V4: Array<(octets: number[]) => boolean> = [
  ([a]) => a === 10,
  ([a]) => a === 127,
  ([a]) => a === 0,
  ([a, b]) => a === 172 && b !== undefined && b >= 16 && b <= 31,
  ([a, b]) => a === 192 && b === 168,
  ([a, b]) => a === 169 && b === 254,
  ([a, b]) => a === 100 && b !== undefined && b >= 64 && b <= 127,
];

function isPrivateIPv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  return PRIVATE_V4.some((test) => test(octets));
}

function isPrivateIPv6(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!bare.includes(":")) return false;
  return bare === "::1" || bare === "::" || bare.startsWith("fc") || bare.startsWith("fd") || bare.startsWith("fe80");
}

const LOCAL_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".intranet", ".corp", ".home"];

export function checkDestinationUrl(raw: string, environment: WebhookEnvironment): UrlCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const value = raw.trim();

  const empty: UrlCheckResult = {
    ok: false,
    errors,
    warnings,
    sanitizedUrl: null,
    host: null,
    hadQueryString: false,
    scheme: "unknown",
  };

  if (!value) {
    errors.push("Enter a destination URL.");
    return empty;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    errors.push("Enter a valid absolute URL, for example https://hooks.example.com/omniplatform.");
    return empty;
  }

  const protocol = url.protocol.replace(":", "");
  if (protocol !== "https" && protocol !== "http") {
    errors.push("Only https:// destinations are supported. Other URL schemes are not allowed.");
    return { ...empty, scheme: "unknown" };
  }
  const scheme = protocol as "https" | "http";

  if (scheme === "http") {
    if (environment === "production") errors.push("HTTPS is required for production endpoints.");
    else warnings.push("HTTP is not encrypted. Use HTTPS outside throwaway development targets.");
  }

  if (url.username || url.password) errors.push("Embedded usernames or passwords are not allowed in the URL.");
  if (url.hash) errors.push("URL fragments (#...) are not allowed.");

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix)) || !host.includes(".") && !host.includes(":")) {
    errors.push("Local or single-label hostnames cannot be used as webhook destinations.");
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    errors.push("Private, loopback and link-local network addresses are not allowed.");
  } else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    warnings.push("A raw IP address was used. Prefer a named host that the backend can resolve and pin.");
  }

  const hadQueryString = url.search.length > 0;
  if (hadQueryString) {
    warnings.push("Query strings can carry secrets. The query string is not shown or stored in this demo.");
  }

  const sanitizedUrl = `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    sanitizedUrl,
    host: url.host,
    hadQueryString,
    scheme,
  };
}

export const ENDPOINT_NAME_MAX = 80;
export const DESCRIPTION_MAX = 280;

export interface EndpointFormErrors {
  name?: string;
  description?: string;
  companyId?: string;
  destinationUrl?: string;
  eventKeys?: string;
  timeoutMs?: string;
}

export type EndpointStepId = "identity" | "destination" | "subscriptions" | "delivery" | "review";

export function validateEndpointDraft(
  draft: Partial<CreateEndpointInput>,
  step: EndpointStepId,
  context: { existingNames: string[] },
): EndpointFormErrors {
  const errors: EndpointFormErrors = {};

  if (step === "identity" || step === "review") {
    const name = (draft.name ?? "").trim();
    if (!name) errors.name = "Endpoint name is required.";
    else if (name.length > ENDPOINT_NAME_MAX) errors.name = `Keep the name under ${ENDPOINT_NAME_MAX} characters.`;
    else if (context.existingNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      errors.name = "An endpoint with this name already exists.";
    }
    if ((draft.description ?? "").length > DESCRIPTION_MAX) errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
    if (draft.ownerScope === "company" && !draft.companyId) errors.companyId = "Select the company that owns this endpoint.";
  }

  if (step === "destination" || step === "review") {
    const check = checkDestinationUrl(draft.destinationUrl ?? "", draft.environment ?? "production");
    if (!check.ok) errors.destinationUrl = check.errors[0];
  }

  if (step === "subscriptions" || step === "review") {
    if (!draft.eventKeys || draft.eventKeys.length === 0) errors.eventKeys = "Subscribe to at least one event type.";
  }

  if (step === "delivery" || step === "review") {
    const timeout = draft.timeoutMs ?? 0;
    if (!Number.isFinite(timeout) || timeout < 1_000 || timeout > 30_000) {
      errors.timeoutMs = "Timeout must be between 1,000 and 30,000 ms.";
    }
  }

  return errors;
}

export function hasErrors(errors: EndpointFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
