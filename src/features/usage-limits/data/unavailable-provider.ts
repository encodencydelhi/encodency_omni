import { ApiError } from "@/types/api";
import type { UsageRepository } from "./repository";

/**
 * Stands in when mock mode is off and no usage & metering service is connected.
 * It refuses every call rather than returning plausible demo consumption, so the
 * UI shows a truthful "not connected" state instead of demo numbers posing as real.
 */
function notConnected(): Promise<never> {
  return Promise.reject(new ApiError({ code: "SERVICE_UNAVAILABLE", status: 503, message: "The usage and metering service is not connected. No usage data is available." }));
}

export const unavailableUsageProvider = new Proxy({ mode: "unavailable" } as Record<string, unknown>, {
  get: (target, property) => (property === "mode" ? target.mode : notConnected),
}) as unknown as UsageRepository;
