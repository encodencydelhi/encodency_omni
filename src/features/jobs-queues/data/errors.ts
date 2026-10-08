import { ApiError } from "@/types/api";

/** The backend explains refusals in plain words (for example "Only a failed job can be retried"); show that. */
export function jobsErrorMessage(error: unknown, fallback: string): string {
  return ApiError.isApiError(error) && error.message ? error.message : fallback;
}
