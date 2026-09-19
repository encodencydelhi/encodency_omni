import { ApiError } from "@/types/api";
import type { ClientsRepository } from "./repository";

/**
 * Stands in when mock mode is off and no backend client service is wired up. It
 * refuses every call instead of returning plausible-looking records, so the UI
 * shows a truthful "not connected" state rather than demo data posing as real.
 */
function notConnected(): Promise<never> {
  return Promise.reject(
    new ApiError({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: "The client management service is not connected. No client data is available.",
    }),
  );
}

export const unavailableClientsProvider = new Proxy({ mode: "unavailable" } as Record<string, unknown>, {
  get: (target, property) => (property === "mode" ? target.mode : notConnected),
}) as unknown as ClientsRepository;
