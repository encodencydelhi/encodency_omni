import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/types/api";

const MAX_RETRIES = 2;

/**
 * Shared cache configuration.
 *
 * Retries deliberately skip client errors: retrying a 403 or a 404 only delays
 * the error state the user needs to see.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (ApiError.isApiError(error) && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < MAX_RETRIES;
        },
      },
      mutations: { retry: false },
    },
  });
}
