import { ApiError } from "@/types/api";

/**
 * Headers for a Company-scoped request.
 *
 * The Company ID must be one the server returned in GET /users/me (see
 * ActiveCompanyProvider), and callers pass it explicitly so it is also part of
 * every query key — a response for a previous Company can never be shown under
 * a newly selected one. The backend re-verifies `x-company-id` against a real
 * membership on every request; this value is a selector, never proof of access.
 *
 * There is deliberately no fallback: with no Company selected, the request
 * fails locally instead of sending an invented identifier.
 */
export function companyScopeHeaders(companyId: string | null | undefined, extra: Record<string, string> = {}): Record<string, string> {
  if (!companyId) {
    throw new ApiError({
      code: "NO_COMPANY_SELECTED",
      message: "Select a Company to continue.",
      status: 0,
    });
  }
  return { "x-company-id": companyId, ...extra };
}
