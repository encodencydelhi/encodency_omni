import { ApiError } from "@/types/api";
import type { SettingsRepository } from "./repository";

/**
 * Stands in when mock mode is off and no configuration service is wired up.
 * It refuses every call instead of returning plausible-looking settings, so the
 * UI shows a truthful "not connected" state rather than demo values posing as
 * the platform's real configuration.
 */
function notConnected(): Promise<never> {
  return Promise.reject(
    new ApiError({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: "The platform configuration service is not connected. No configuration is available.",
    }),
  );
}

export const unavailableSettingsProvider = new Proxy({ mode: "unavailable" } as Record<string, unknown>, {
  get: (target, property) => (property === "mode" ? target.mode : notConnected),
}) as unknown as SettingsRepository;
