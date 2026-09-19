import { ApiError } from "@/types/api";
import type { CompaniesRepository } from "./repository";

/**
 * Stands in when mock mode is off and no backend tenant service is wired up.
 *
 * It refuses every call rather than returning plausible-looking records, so the
 * UI shows a truthful "not connected" state instead of demo data posing as
 * production data. Replace this with the real HTTP provider when it exists.
 */
function notConnected(): Promise<never> {
  return Promise.reject(
    new ApiError({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: "The tenant management service is not connected. No company data is available.",
    }),
  );
}

export const unavailableCompaniesProvider = new Proxy(
  { mode: "unavailable" } as Record<string, unknown>,
  {
    get: (target, property) => (property === "mode" ? target.mode : notConnected),
  },
) as unknown as CompaniesRepository;
