import { ApiError } from "@/types/api";
import type { PlansRepository } from "./repository";

/**
 * Stands in when mock mode is off and no backend commercial service is wired up.
 * It refuses every call instead of returning plausible-looking plans and prices,
 * so the UI shows a truthful "not connected" state rather than demo data posing
 * as production data.
 */
function notConnected(): Promise<never> {
  return Promise.reject(
    new ApiError({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: "The plans and subscriptions service is not connected. No commercial data is available.",
    }),
  );
}

export const unavailablePlansProvider = new Proxy({ mode: "unavailable" } as Record<string, unknown>, {
  get: (target, property) => (property === "mode" ? target.mode : notConnected),
}) as unknown as PlansRepository;
