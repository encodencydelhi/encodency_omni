/**
 * The existing admin/sidebar tenancy is the only source of WhatsApp scope. A chosen number (one of the Client's several
 * WhatsApp numbers) is part of the scope, so every cache, draft and screen is per number; none means the primary number.
 * Shape: ["whatsapp", companyId, clientId, actorId?, numberId?] (actorId is "" when only a number is set).
 */
export function whatsappWorkspaceScope(companyId: string, clientId: string, actorId?: string, numberId?: string): string {
  return JSON.stringify(["whatsapp", companyId, clientId, ...(actorId || numberId ? [actorId ?? ""] : []), ...(numberId ? [numberId] : [])]);
}

/** The chosen number of a scope, or "" for the primary number. */
export function scopeNumber(scope: string): string {
  try {
    const parsed: unknown = JSON.parse(scope);
    return Array.isArray(parsed) && typeof parsed[4] === "string" ? parsed[4] : "";
  } catch { return ""; }
}
