import { ApiError } from "@/types/api";
import type { AuditRepository } from "./repository";

/**
 * Stands in when mock mode is off and no audit service is connected. It refuses every call
 * rather than returning plausible demo events: an audit trail that is not real must never
 * look like one.
 */
function notConnected(): Promise<never> {
  return Promise.reject(new ApiError({ code: "SERVICE_UNAVAILABLE", status: 503, message: "The audit service is not connected. No audit records are available." }));
}

export const unavailableAuditProvider = new Proxy({ mode: "unavailable" } as Record<string, unknown>, {
  get: (target, property) => (property === "mode" ? target.mode : notConnected),
}) as unknown as AuditRepository;
