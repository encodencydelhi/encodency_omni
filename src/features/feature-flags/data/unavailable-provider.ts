import { ApiError } from "@/types/api";
import type { FlagsRepository } from "./repository";

/**
 * Stands in when mock mode is off and no feature-management service is connected.
 * It refuses every call rather than returning plausible demo flags, so the UI shows
 * a truthful "not connected" state instead of demo configuration posing as real.
 */
function notConnected(): Promise<never> {
  return Promise.reject(new ApiError({ code: "SERVICE_UNAVAILABLE", status: 503, message: "The feature management service is not connected. No flag configuration is available." }));
}

export const unavailableFlagsProvider = new Proxy({ mode: "unavailable" } as Record<string, unknown>, {
  get: (target, property) => (property === "mode" ? target.mode : notConnected),
}) as unknown as FlagsRepository;
